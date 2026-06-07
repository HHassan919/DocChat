# rag_pipeline.py — Core RAG orchestration for DocChat
#
# Handles the full retrieval-augmented generation pipeline:
#   1. PDF text extraction (pdfplumber, page-aware)
#   2. Text chunking (LangChain RecursiveCharacterTextSplitter)
#   3. Embedding (HuggingFace sentence-transformers/all-MiniLM-L6-v2)
#   4. Storage in an in-memory Chroma vector store, keyed by session
#   5. Similarity retrieval of top-k chunks
#   6. Prompt construction with source metadata
#   7. Provider-flexible LLM generation via LangChain

from __future__ import annotations

import io
import logging
import os
import uuid
from typing import Any

import pdfplumber
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
TOP_K_CHUNKS = 5
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Ordered list of free HuggingFace models tried at runtime.
# If the first model is rate-limited or loading, the next one is attempted automatically.
FREE_HF_FALLBACK_MODELS = [
    "HuggingFaceH4/zephyr-7b-beta",          # Best quality; first choice
    "mistralai/Mistral-7B-Instruct-v0.2",     # Strong alternative
    "tiiuae/falcon-7b-instruct",               # Broader free-tier availability
    "google/flan-t5-xxl",                      # Reliable, smaller footprint
    "google/flan-t5-large",                    # Very small; almost always available
]

# Fallback models used when a paid provider is selected but no model_id is supplied.
DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"
DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

SUPPORTED_PROVIDERS = {"huggingface", "huggingface_custom", "anthropic", "openai", "gemini"}

# Prompt template with explicit citation instructions and a clear no-hallucination boundary.
# The numbered [N] markers align with the source list returned to the frontend.
RAG_PROMPT_TEMPLATE = """You are DocChat, a precise document assistant. Your job is to answer questions using ONLY the information contained in the document excerpts provided below. Do not use any prior knowledge.

If the answer cannot be found in the excerpts, respond with exactly:
"I could not find an answer to that question in the provided documents."

When answering:
- Be concise and direct
- Reference the source number (e.g., "According to [1]...") when citing a fact
- If multiple sources support the answer, cite all relevant ones

--- DOCUMENT EXCERPTS ---
{context}
--- END OF EXCERPTS ---

Question: {question}

Answer:"""

# Minimum similarity score below which a chunk is considered irrelevant.
# Chroma returns cosine similarity; 0.0 means completely dissimilar.
MIN_RELEVANCE_SCORE = 0.0


# ---------------------------------------------------------------------------
# RAGPipeline
# ---------------------------------------------------------------------------


class RAGPipeline:
    """
    Encapsulates a single chat session's document store and retrieval logic.

    Each instance is bound to one session (one set of uploaded documents).
    The Chroma collection is held in memory and garbage-collected when the
    instance is removed from the session store.
    """

    def __init__(self) -> None:
        """Initialize the pipeline with a unique session ID and shared embeddings."""
        self.session_id: str = str(uuid.uuid4())
        self._vectorstore: Chroma | None = None
        self._embeddings = self._build_embeddings()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def ingest_documents(
        self, file_contents: list[tuple[str, bytes]]
    ) -> tuple[str, list[str], int]:
        """
        Extract, chunk, embed, and store documents from raw PDF bytes.

        Args:
            file_contents: List of (filename, raw_bytes) tuples.

        Returns:
            Tuple of (session_id, list_of_doc_names, total_chunk_count).
        """
        all_chunks: list[Document] = []
        doc_names: list[str] = []

        for filename, raw_bytes in file_contents:
            pages = self._extract_pages(filename, raw_bytes)
            chunks = self._chunk_pages(filename, pages)
            all_chunks.extend(chunks)
            doc_names.append(filename)
            logger.info(
                "Processed '%s': %d pages → %d chunks", filename, len(pages), len(chunks)
            )

        self._vectorstore = Chroma.from_documents(
            documents=all_chunks,
            embedding=self._embeddings,
            collection_name=f"session_{self.session_id}",
        )

        logger.info("Vector store built: %d total chunks", len(all_chunks))
        return self.session_id, doc_names, len(all_chunks)

    def answer_question(
        self,
        question: str,
        provider: str = "huggingface",
        api_key: str | None = None,
        model_id: str | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        Retrieve relevant chunks and generate a cited answer via the chosen LLM.

        Args:
            question:  The user's natural-language question.
            provider:  One of "huggingface", "huggingface_custom", "anthropic",
                       "gemini", or "openai".
            api_key:   Visitor-supplied key (used for this call only, never stored).
            model_id:  Optional model override. Falls back to the provider default
                       when omitted. Required for "huggingface_custom".

        Returns:
            Tuple of (answer_string, list_of_source_dicts).
        """
        if self._vectorstore is None:
            raise ValueError("No documents have been ingested into this session.")

        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unknown provider '{provider}'. Choose from: {', '.join(SUPPORTED_PROVIDERS)}."
            )

        chunks = self._retrieve_chunks(question)
        context, sources = self._build_context(chunks)
        prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question)

        if provider == "huggingface":
            answer = self._invoke_with_hf_fallback(prompt)
        else:
            llm = self._build_llm(provider, api_key, model_id)
            answer = self._invoke_llm(llm, prompt)

        return answer, sources

    # ------------------------------------------------------------------
    # Extraction and chunking
    # ------------------------------------------------------------------

    def _extract_pages(self, filename: str, raw_bytes: bytes) -> list[dict[str, Any]]:
        """
        Extract text from each page of a PDF using pdfplumber.

        Returns a list of dicts with keys 'page_number' and 'text'.
        Pages with no extractable text are skipped with a warning.
        """
        pages: list[dict[str, Any]] = []
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                text = text.strip()
                if not text:
                    logger.warning("Page %d of '%s' yielded no text — skipping.", i, filename)
                    continue
                pages.append({"page_number": i, "text": text})
        return pages

    def _chunk_pages(
        self, filename: str, pages: list[dict[str, Any]]
    ) -> list[Document]:
        """
        Split each page's text into overlapping chunks and attach source metadata.

        Metadata keys: 'source' (filename), 'page' (1-indexed), 'chunk_index'.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
        )
        chunks: list[Document] = []
        for page_data in pages:
            page_text = page_data["text"]
            page_number = page_data["page_number"]
            page_chunks = splitter.split_text(page_text)
            for idx, chunk_text in enumerate(page_chunks):
                chunks.append(
                    Document(
                        page_content=chunk_text,
                        metadata={
                            "source": filename,
                            "page": page_number,
                            "chunk_index": idx,
                        },
                    )
                )
        return chunks

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def _retrieve_chunks(self, question: str) -> list[Document]:
        """
        Return the top-K most semantically similar chunks to the question.

        Uses similarity_search_with_score so we can log retrieval quality.
        Low-scoring chunks are still included (the LLM decides relevance),
        but the scores help with debugging in production logs.
        """
        assert self._vectorstore is not None
        results = self._vectorstore.similarity_search_with_score(question, k=TOP_K_CHUNKS)
        for doc, score in results:
            logger.debug(
                "Retrieved chunk — score: %.4f | source: %s | page: %s",
                score,
                doc.metadata.get("source"),
                doc.metadata.get("page"),
            )
        return [doc for doc, _score in results]

    def _build_context(
        self, chunks: list[Document]
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        Format retrieved chunks into a context string and extract citation metadata.

        Returns:
            context: Formatted string to insert into the prompt.
            sources: List of dicts with 'document', 'page', and 'excerpt' keys.
        """
        context_parts: list[str] = []
        sources: list[dict[str, Any]] = []

        for i, chunk in enumerate(chunks, start=1):
            doc_name = chunk.metadata.get("source", "Unknown Document")
            page_num = chunk.metadata.get("page", 0)
            excerpt = chunk.page_content[:300].replace("\n", " ").strip()

            context_parts.append(
                f"[{i}] Source: {doc_name}, Page {page_num}\n{chunk.page_content}"
            )
            sources.append(
                {"document": doc_name, "page": page_num, "excerpt": excerpt}
            )

        return "\n\n".join(context_parts), sources

    # ------------------------------------------------------------------
    # LLM factory
    # ------------------------------------------------------------------

    def _build_llm(
        self, provider: str, api_key: str | None, model_id: str | None = None
    ) -> Any:
        """
        Instantiate the correct LangChain LLM wrapper for the chosen provider.

        Provider routing:
          huggingface        → Zephyr-7B-Beta, no key required (anonymous or env token)
          huggingface_custom → caller-specified model_id + api_key (HF token required)
          anthropic          → Claude via Anthropic API, key required
          gemini             → Gemini via Google API, key required
          openai             → GPT via OpenAI API, key required

        model_id is optional for anthropic/gemini/openai — falls back to the
        provider default. model_id is required for huggingface_custom.
        """
        if provider == "huggingface":
            hf_token = os.getenv("HF_API_TOKEN") or None
            return HuggingFaceEndpoint(
                repo_id=FREE_HF_FALLBACK_MODELS[0],
                huggingfacehub_api_token=hf_token,
                max_new_tokens=512,
                temperature=0.1,
            )

        if provider == "huggingface_custom":
            if not api_key:
                raise ValueError(
                    "A HuggingFace API token is required for the custom HuggingFace provider."
                )
            if not model_id or not model_id.strip():
                raise ValueError(
                    "A model ID is required for the custom HuggingFace provider "
                    "(e.g. mistralai/Mistral-7B-Instruct-v0.2)."
                )
            return HuggingFaceEndpoint(
                repo_id=model_id.strip(),
                huggingfacehub_api_token=api_key,
                max_new_tokens=512,
                temperature=0.1,
            )

        if provider == "anthropic":
            if not api_key:
                raise ValueError("An Anthropic API key is required for the Anthropic provider.")
            from langchain_anthropic import ChatAnthropic  # noqa: PLC0415

            return ChatAnthropic(
                model=model_id.strip() if model_id and model_id.strip() else DEFAULT_ANTHROPIC_MODEL,
                api_key=api_key,
                temperature=0.1,
                max_tokens=1024,
            )

        if provider == "gemini":
            if not api_key:
                raise ValueError("A Google API key is required for the Gemini provider.")
            from langchain_google_genai import ChatGoogleGenerativeAI  # noqa: PLC0415

            return ChatGoogleGenerativeAI(
                model=model_id.strip() if model_id and model_id.strip() else DEFAULT_GEMINI_MODEL,
                google_api_key=api_key,
                temperature=0.1,
            )

        if provider == "openai":
            if not api_key:
                raise ValueError("An OpenAI API key is required for the OpenAI provider.")
            from langchain_openai import ChatOpenAI  # noqa: PLC0415

            return ChatOpenAI(
                model=model_id.strip() if model_id and model_id.strip() else DEFAULT_OPENAI_MODEL,
                api_key=api_key,
                temperature=0.1,
            )

        raise ValueError(
            f"Unsupported provider '{provider}'. "
            f"Choose from: {', '.join(sorted(SUPPORTED_PROVIDERS))}."
        )

    def _invoke_with_hf_fallback(self, prompt: str) -> str:
        """
        Try each model in FREE_HF_FALLBACK_MODELS in order until one responds.

        Catches any exception per model and moves on — covers rate limits,
        cold-start 503s, auth errors on anonymous tier, and model loading timeouts.
        Uses HF_API_TOKEN env var if set; otherwise tries anonymously.
        """
        hf_token = os.getenv("HF_API_TOKEN") or None
        last_exc: Exception | None = None

        for model_id in FREE_HF_FALLBACK_MODELS:
            try:
                llm = HuggingFaceEndpoint(
                    repo_id=model_id,
                    huggingfacehub_api_token=hf_token,
                    max_new_tokens=512,
                    temperature=0.1,
                )
                answer = self._invoke_llm(llm, prompt)
                logger.info("HuggingFace free: answered via %s", model_id)
                return answer
            except Exception as exc:
                logger.warning(
                    "HuggingFace model %s unavailable (%s): %s",
                    model_id,
                    type(exc).__name__,
                    str(exc)[:200],
                )
                last_exc = exc

        raise RuntimeError(
            "All HuggingFace free models are currently unavailable. "
            "Switch to Google Gemini (free key at aistudio.google.com) for instant, "
            "high-quality responses."
        ) from last_exc

    def _invoke_llm(self, llm: Any, prompt: str) -> str:
        """
        Call the LLM and return the text response.

        Handles both chat-style (ChatOpenAI / Gemini) and completion-style (HuggingFace) models.
        """
        result = llm.invoke(prompt)
        # Chat models return an AIMessage; completion models return a string
        if hasattr(result, "content"):
            return str(result.content).strip()
        return str(result).strip()

    # ------------------------------------------------------------------
    # Embeddings factory
    # ------------------------------------------------------------------

    @staticmethod
    def _build_embeddings() -> HuggingFaceEmbeddings:
        """
        Build the sentence-transformers embedding model.

        Uses HuggingFace Inference API (no key required for this model).
        The model is cached locally after the first download.
        """
        return HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
