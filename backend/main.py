# main.py — FastAPI application entry point for DocChat
# Defines all API routes: /upload, /ask, /load-samples, /health
# Delegates all RAG logic to rag_pipeline.py

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_pipeline import RAGPipeline

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB per file
MAX_FILES_PER_UPLOAD = 5
ALLOWED_CONTENT_TYPES = {"application/pdf"}
SAMPLE_DOCS_DIR = Path(__file__).parent / "sample_docs"

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DocChat API",
    description="RAG-powered document chat — upload PDFs, ask questions, get cited answers.",
    version="1.0.0",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: session_id → RAGPipeline instance.
# Each session has its own isolated Chroma collection.
# Sessions are not expired automatically — in a production system with
# persistent traffic, add a TTL eviction policy using a background task.
_sessions: dict[str, RAGPipeline] = {}

# Hard limit on concurrent sessions to bound memory usage on free-tier hosts.
MAX_CONCURRENT_SESSIONS = 100

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class AskRequest(BaseModel):
    """Payload for the /ask endpoint."""

    session_id: str
    question: str
    provider: str = "huggingface"
    api_key: str | None = None
    model_id: str | None = None  # Optional model override; required for huggingface_custom


class SourceCitation(BaseModel):
    """A single source citation returned with an answer."""

    document: str
    page: int
    excerpt: str


class AskResponse(BaseModel):
    """Full response from the /ask endpoint."""

    answer: str
    sources: list[SourceCitation]


class UploadResponse(BaseModel):
    """Response from /upload and /load-samples."""

    session_id: str
    documents: list[str]
    total_chunks: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _validate_pdf(file: UploadFile, content: bytes) -> None:
    """Raise HTTPException if the file is not a valid PDF within size limits."""
    filename = file.filename or ""
    is_pdf_type = file.content_type in ALLOWED_CONTENT_TYPES
    is_pdf_ext = filename.lower().endswith(".pdf")
    if not is_pdf_type and not is_pdf_ext:
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is not a PDF. Only PDF files are accepted.",
        )
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File '{file.filename}' exceeds the 20 MB limit.",
        )


def _get_session(session_id: str) -> RAGPipeline:
    """Return an existing session or raise 404."""
    pipeline = _sessions.get(session_id)
    if pipeline is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Please upload documents first.",
        )
    return pipeline


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _classify_llm_error(exc: Exception, provider: str) -> str:
    """
    Turn a raw LLM exception into a specific, actionable error message.

    Inspects the exception string for known HuggingFace, Anthropic,
    OpenAI, and Gemini error patterns so the client knows exactly what
    to do rather than seeing a generic failure message.
    """
    raw = str(exc).lower()

    if provider in ("huggingface", "huggingface_custom"):
        if any(k in raw for k in ("authorization", "401", "403", "token", "authenticate")):
            return (
                "HuggingFace requires an API token for this model. "
                "Get a free token at huggingface.co/settings/tokens, then paste it "
                "in the HuggingFace Custom provider field — or switch to Google Gemini "
                "which has a free API key and better quality."
            )
        if any(k in raw for k in ("rate limit", "429", "quota", "too many")):
            return (
                "HuggingFace free tier rate limit reached. "
                "Add a free HF token to increase your limit, or switch to Google Gemini "
                "(free API key at aistudio.google.com)."
            )
        if any(k in raw for k in ("loading", "currently loading", "503")):
            return (
                "The HuggingFace model is loading (cold start). "
                "Wait 20–30 seconds and try again, or switch to Google Gemini for instant responses."
            )
        return (
            "HuggingFace inference failed. The free tier has strict limits — "
            "add a free HF token or switch to Google Gemini (free key at aistudio.google.com)."
        )

    if provider == "anthropic":
        if any(k in raw for k in ("authentication", "401", "invalid x-api-key", "api_key")):
            return "Invalid Anthropic API key. Check your key at console.anthropic.com."
        if any(k in raw for k in ("credit", "billing", "402", "insufficient")):
            return "Your Anthropic account has insufficient credits. Add credits at console.anthropic.com."

    if provider == "openai":
        if any(k in raw for k in ("authentication", "401", "incorrect api key")):
            return "Invalid OpenAI API key. Check your key at platform.openai.com/api-keys."
        if any(k in raw for k in ("quota", "billing", "402", "insufficient_quota")):
            return "Your OpenAI account has run out of credits. Add credits at platform.openai.com/billing."

    if provider == "gemini":
        if any(k in raw for k in ("api key", "401", "403", "invalid")):
            return "Invalid Google API key. Get a free key at aistudio.google.com."

    return (
        f"The language model returned an unexpected error ({provider}). "
        "Check your API key and model ID, then try again."
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check() -> dict:
    """
    Liveness probe used by Render and other deployment platforms.

    Returns active session count so ops teams can monitor memory usage.
    """
    return {
        "status": "ok",
        "service": "DocChat API",
        "version": "1.0.0",
        "active_sessions": len(_sessions),
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_documents(
    files: list[UploadFile] = File(...),
    provider: str = Form(default="huggingface"),
    api_key: str | None = Form(default=None),
) -> UploadResponse:
    """
    Accept one or more PDF files, extract text, chunk, embed, and store in Chroma.

    Returns a session_id that must be included in subsequent /ask requests.
    The api_key is used only for this request and is never stored.
    """
    if len(_sessions) >= MAX_CONCURRENT_SESSIONS:
        raise HTTPException(
            status_code=503,
            detail="Server is at capacity. Please try again in a few minutes.",
        )

    if len(files) > MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {MAX_FILES_PER_UPLOAD} PDFs per upload.",
        )

    file_contents: list[tuple[str, bytes]] = []
    for upload in files:
        content = await upload.read()
        _validate_pdf(upload, content)
        file_contents.append((upload.filename or "document.pdf", content))
        logger.info("Received file: %s (%d bytes)", upload.filename, len(content))

    pipeline = RAGPipeline()
    session_id, doc_names, total_chunks = pipeline.ingest_documents(file_contents)

    _sessions[session_id] = pipeline
    logger.info(
        "Session %s created — %d documents, %d chunks", session_id, len(doc_names), total_chunks
    )

    return UploadResponse(
        session_id=session_id, documents=doc_names, total_chunks=total_chunks
    )


@app.post("/ask", response_model=AskResponse)
async def ask_question(body: AskRequest) -> AskResponse:
    """
    Answer a question against the documents in the given session.

    Retrieves top-5 relevant chunks, builds a prompt with source metadata,
    and calls the provider-selected LLM via LangChain. The api_key is used
    only for this request and is never stored or logged.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    pipeline = _get_session(body.session_id)

    try:
        answer, sources = pipeline.answer_question(
            question=body.question,
            provider=body.provider,
            api_key=body.api_key,
            model_id=body.model_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Error generating answer for session %s", body.session_id)
        detail = _classify_llm_error(exc, body.provider)
        raise HTTPException(status_code=502, detail=detail) from exc

    return AskResponse(
        answer=answer,
        sources=[SourceCitation(**s) for s in sources],
    )


@app.post("/load-samples", response_model=UploadResponse)
async def load_sample_documents() -> UploadResponse:
    """
    Load the pre-bundled sample PDFs from backend/sample_docs/.

    Useful for demo purposes — no file upload required.
    """
    sample_files = list(SAMPLE_DOCS_DIR.glob("*.pdf"))
    if not sample_files:
        raise HTTPException(
            status_code=500,
            detail="No sample documents found on the server. Please contact the administrator.",
        )

    file_contents: list[tuple[str, bytes]] = []
    for path in sorted(sample_files):
        content = path.read_bytes()
        file_contents.append((path.name, content))
        logger.info("Loading sample: %s (%d bytes)", path.name, len(content))

    pipeline = RAGPipeline()
    session_id, doc_names, total_chunks = pipeline.ingest_documents(file_contents)

    _sessions[session_id] = pipeline
    logger.info(
        "Sample session %s created — %d documents, %d chunks",
        session_id,
        len(doc_names),
        total_chunks,
    )

    return UploadResponse(
        session_id=session_id, documents=doc_names, total_chunks=total_chunks
    )
