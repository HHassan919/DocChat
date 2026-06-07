# DocChat

> Ask questions about your documents. Get cited, accurate answers.

```
  ██████╗  ██████╗  ██████╗ ██████╗██╗  ██╗ █████╗ ████████╗
  ██╔══██╗██╔═══██╗██╔════╝██╔════╝██║  ██║██╔══██╗╚══██╔══╝
  ██║  ██║██║   ██║██║     ██║     ███████║███████║   ██║
  ██║  ██║██║   ██║██║     ██║     ██╔══██║██╔══██║   ██║
  ██████╔╝╚██████╔╝╚██████╗╚██████╗██║  ██║██║  ██║   ██║
  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
```

[Screenshot — add after deployment]

## What It Does

DocChat lets you upload PDF documents and ask questions about them in natural language. It retrieves the most relevant sections from your documents using semantic search and generates accurate answers with source citations — showing exactly which document and page each answer came from.

No hallucination. No guessing. Every answer is grounded in your documents.

## Features

- **Multi-document upload** — up to 5 PDFs per session, 20 MB each
- **Cited answers** — every response shows document name, page number, and a matched excerpt
- **Provider-flexible LLM** — HuggingFace free tier by default; bring your own OpenAI or Gemini key for higher quality
- **Sample documents** — click "Try with sample documents" to explore immediately, no upload needed
- **Session isolation** — each session has its own in-memory vector store; nothing persists on the server
- **Clean, professional UI** — built for daily use, not demos

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11, FastAPI |
| RAG Orchestration | LangChain |
| Vector Store | Chroma (in-memory) |
| PDF Extraction | pdfplumber |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 (HuggingFace) |
| Default LLM | Mistral-7B-Instruct-v0.2 (HuggingFace free tier) |
| Optional LLMs | OpenAI GPT-4o-mini, Google Gemini 1.5 Flash |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Deployment | Render (backend), Vercel (frontend) |

## Local Setup — Without Docker

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env if you have a HuggingFace token (optional but recommended)
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Visit `http://localhost:8000/docs` for the interactive API documentation.

### Frontend

```bash
cd frontend
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000`.

## Local Setup — With Docker

```bash
# Copy and configure environment variables
cp .env.example .env
# Optionally set HF_API_TOKEN in .env

docker-compose up --build
```

Open `http://localhost:3000`. Both services start automatically; the frontend
waits for the backend health check to pass before serving traffic.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `HF_API_TOKEN` | HuggingFace API token — improves rate limits on free models | Optional |
| `PORT` | Backend server port (Render sets this automatically) | Optional (default: 8000) |
| `FRONTEND_ORIGIN` | Frontend URL for CORS — set to your Vercel URL in production | Optional (default: localhost:3000) |
| `NEXT_PUBLIC_API_URL` | Backend URL used by the frontend | Required in production |

See `.env.example` for full documentation.

## Deployment

### Backend → Render

1. Push this repository to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `HF_API_TOKEN` — your HuggingFace token (optional but recommended)
   - `FRONTEND_ORIGIN` — your Vercel deployment URL (once deployed)
7. Set **Health Check Path** to `/health`
8. Click **Deploy**

> The `render.yaml` in `backend/` can also be used for infrastructure-as-code deployment.

### Frontend → Vercel

1. Import this GitHub repository on [Vercel](https://vercel.com)
2. Set the **Root Directory** to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL (e.g. `https://docchat-api.onrender.com`)
4. Click **Deploy**

## How It Works

```
User uploads PDF(s)
      │
      ▼
pdfplumber extracts text page-by-page
      │
      ▼
LangChain RecursiveCharacterTextSplitter
chunks text (800 chars, 100 overlap)
      │
      ▼
HuggingFace Inference API embeds each chunk
(sentence-transformers/all-MiniLM-L6-v2)
      │
      ▼
Chroma stores embeddings + metadata
(document name, page number, chunk index)
      │
User asks a question
      │
      ▼
Question is embedded and compared
against stored chunks (cosine similarity)
      │
      ▼
Top 5 chunks retrieved with source metadata
      │
      ▼
LLM generates a cited answer
(HuggingFace / OpenAI / Gemini via LangChain)
      │
      ▼
Answer + sources returned to frontend
```

## Project Structure

```
DocChat/
├── backend/
│   ├── main.py              # FastAPI routes: /upload, /ask, /load-samples, /health
│   ├── rag_pipeline.py      # RAG logic: extraction, chunking, embedding, retrieval, generation
│   ├── requirements.txt     # Pinned Python dependencies
│   ├── Dockerfile           # Multi-stage Docker build
│   ├── render.yaml          # Render deployment config
│   └── sample_docs/         # Pre-bundled sample PDFs for demo
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main page — owns all session state
│   │   ├── layout.tsx       # Root layout with metadata
│   │   ├── globals.css      # Tailwind base + custom animations
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx      # Message history + input bar
│   │   │   ├── MessageBubble.tsx   # User/assistant message rendering
│   │   │   ├── FileUpload.tsx      # Drag-drop PDF uploader
│   │   │   ├── ApiKeyInput.tsx     # Provider selector + key input
│   │   │   └── SourceCitation.tsx  # Collapsible citation cards
│   │   └── lib/
│   │       └── api.ts       # Typed backend API client
│   ├── Dockerfile           # Multi-stage Next.js Docker build
│   └── vercel.json          # Vercel deployment config
├── docker-compose.yml       # Local full-stack development
├── .env.example             # All environment variables documented
├── LICENSE                  # Portfolio/evaluation use only
└── README.md
```

## License

Copyright (c) 2026 Hateem Hassan. All rights reserved.

This source code is made publicly available for portfolio and evaluation purposes only.
Commercial use or redistribution requires explicit written permission from the author.

## Built By

**Hateem Hassan** — Full-Stack AI Engineer

- LinkedIn: [linkedin.com/in/hateem-hassan/](https://linkedin.com/in/hateem-hassan/)
- GitHub: [github.com/hateem-hassan](https://github.com/hateem-hassan)
