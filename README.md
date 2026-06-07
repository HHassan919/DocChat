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

DocChat lets you upload PDF documents and ask questions about them in natural language. It uses semantic search to find the most relevant sections across your documents and generates accurate answers with source citations — showing exactly which document and page each answer came from.

No hallucination. No guessing. Every answer is grounded in your documents.

## Features

- **Multi-document upload** — drag and drop up to 5 PDFs, 20 MB each
- **Cited answers** — every response shows document name, page number, and the matched excerpt
- **Three LLM options** — use the free default, or plug in your own Gemini or OpenAI key for higher quality
- **Sample documents** — hit "Try with sample documents" to explore the app instantly, no upload needed
- **Session isolation** — each session has its own in-memory vector store; nothing is persisted on the server
- **Fully containerized** — runs with a single `docker-compose up` command

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11, FastAPI |
| RAG Orchestration | LangChain |
| Vector Store | Chroma (in-memory, per-session) |
| PDF Extraction | pdfplumber |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Default LLM | Zephyr-7B-Beta (HuggingFace, no key required) |
| Optional LLMs | HuggingFace Custom, Anthropic Claude, Google Gemini, OpenAI GPT |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Deployment | Render (backend), Vercel (frontend) |

## LLM Providers

DocChat works out of the box with no API key required. Switch providers at any time using the **LLM Provider** panel in the sidebar — changes take effect on your next question without any page reload.

| # | Provider | Model | Cost | What you need |
|---|---|---|---|---|
| 1 | **HuggingFace** (default) | Zephyr-7B-Beta | Free | Nothing — works anonymously |
| 2 | **HuggingFace Custom** | Any public HF model | Free | HF token + model ID |
| 3 | **Anthropic Claude** | Claude 3.5 Haiku (default) | Paid | API key from [console.anthropic.com](https://console.anthropic.com) |
| 4 | **Google Gemini** | Gemini 1.5 Flash (default) | Free key | API key from [aistudio.google.com](https://aistudio.google.com) |
| 5 | **OpenAI** | GPT-4o-mini (default) | Paid | API key from [platform.openai.com](https://platform.openai.com/api-keys) |

**How to switch providers:**
1. Open the **LLM Provider** panel in the left sidebar (click to expand)
2. Select a provider — the panel shows exactly what each one needs
3. Paste your API key and optionally specify a model (or leave blank to use the default)
4. Ask your next question — it uses the new provider immediately

**Model override:** For providers 2–5 you can type any compatible model ID in the model field. Leave it blank to use the default shown in the placeholder. Examples:
- Anthropic: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- Gemini: `gemini-1.5-pro`, `gemini-2.0-flash`
- OpenAI: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- HuggingFace Custom: `mistralai/Mistral-7B-Instruct-v0.2`, `meta-llama/Llama-3.2-3B-Instruct`

> Your API key is sent with each request only. It is never stored, logged, or retained on the server — it lives only in your browser tab for the duration of your session.

**Recommended for best free results:** Google Gemini — free API key, 30 seconds to set up, excellent answer quality.

## Local Setup — Without Docker

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone the repository

```bash
git clone https://github.com/HHassan919/DocChat.git
cd DocChat
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Optional: add your HF_API_TOKEN to .env for better rate limits
uvicorn main:app --reload --port 8000
```

API runs at `http://localhost:8000`.
Interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000`.

## Local Setup — With Docker

The fastest way to run the full stack locally.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Run

```bash
git clone https://github.com/HHassan919/DocChat.git
cd DocChat
cp .env.example .env
# Optional: add your HF_API_TOKEN in .env
docker-compose up --build
```

Open `http://localhost:3000`. Both services start automatically — the frontend waits for the backend health check before serving traffic.

To stop:
```bash
docker-compose down
```

## Cloud Deployment

### Backend → Render

1. Fork or clone this repo to your GitHub account
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
5. Add environment variables:
   - `HF_API_TOKEN` — your HuggingFace token *(optional, improves rate limits)*
   - `FRONTEND_ORIGIN` — your Vercel frontend URL *(add after the next step)*
6. Click **Deploy** and note your Render URL (e.g. `https://docchat-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` → your Render URL from the step above
5. Click **Deploy** and note your Vercel URL
6. Go back to Render → update `FRONTEND_ORIGIN` to your Vercel URL → **Redeploy**

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start takes ~30 seconds. Upgrade to a paid Render plan to eliminate this.

## How It Works

```
User uploads PDF(s)
      │
      ▼
pdfplumber extracts text page-by-page
      │
      ▼
LangChain splits text into overlapping chunks
(800 characters, 100 character overlap)
      │
      ▼
HuggingFace embeds each chunk as a vector
(sentence-transformers/all-MiniLM-L6-v2)
      │
      ▼
Chroma stores vectors + metadata
(document name, page number, chunk index)
      │
User asks a question
      │
      ▼
Question is embedded and compared against
stored chunks using cosine similarity
      │
      ▼
Top 5 most relevant chunks retrieved
      │
      ▼
LLM generates a cited answer using only
the retrieved chunks (no hallucination)
      │
      ▼
Answer + source citations returned to UI
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `HF_API_TOKEN` | HuggingFace token — improves rate limits on the free tier | Optional |
| `PORT` | Backend server port (Render sets this automatically) | Optional (default: `8000`) |
| `FRONTEND_ORIGIN` | Frontend URL for CORS — set to your Vercel URL in production | Optional (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Backend URL used by the frontend | Required in production |

Copy `.env.example` to `.env` (backend) and `frontend/.env.local` (frontend) to get started.

## Project Structure

```
DocChat/
├── backend/
│   ├── main.py              # FastAPI routes: /upload, /ask, /load-samples, /health
│   ├── rag_pipeline.py      # Full RAG pipeline: extract → chunk → embed → retrieve → generate
│   ├── requirements.txt     # Pinned Python dependencies
│   ├── Dockerfile           # Multi-stage Docker build with non-root user
│   ├── render.yaml          # Render deployment config
│   └── sample_docs/         # Pre-bundled PDFs for the "Try with samples" feature
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Main page — owns all session and provider state
│   │   ├── layout.tsx            # Root layout with metadata
│   │   ├── globals.css           # Tailwind base + custom animations
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx    # Scrollable message history + input bar
│   │   │   ├── MessageBubble.tsx # User/assistant bubbles + typing indicator
│   │   │   ├── FileUpload.tsx    # Drag-drop PDF uploader with client-side validation
│   │   │   ├── ApiKeyInput.tsx   # Provider selector + API key input
│   │   │   └── SourceCitation.tsx # Collapsible citation cards per answer
│   │   └── lib/
│   │       └── api.ts            # Typed API client (upload, ask, load-samples)
│   ├── Dockerfile           # Multi-stage Next.js Docker build
│   └── vercel.json          # Vercel deployment config
├── docker-compose.yml       # Local full-stack: backend + frontend with health checks
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
- GitHub: [github.com/HHassan919](https://github.com/HHassan919)
