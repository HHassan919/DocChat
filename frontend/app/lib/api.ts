// api.ts — Typed API client for the DocChat backend.
// All backend communication goes through this module.
// Throws descriptive errors that bubble up to the UI layer.

import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // LLM calls can take up to 2 minutes on free-tier models
});

// ---------------------------------------------------------------------------
// Types — mirror the Pydantic models in backend/main.py
// ---------------------------------------------------------------------------

export interface UploadResponse {
  session_id: string;
  documents: string[];
  total_chunks: number;
}

export interface SourceCitation {
  document: string;
  page: number;
  excerpt: string;
}

export interface AskResponse {
  answer: string;
  sources: SourceCitation[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Upload one or more PDF files and receive a session ID.
 * The optional provider and apiKey are forwarded as form fields.
 */
export async function uploadDocuments(
  files: File[],
  provider: string = "huggingface",
  apiKey?: string
): Promise<UploadResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  form.append("provider", provider);
  if (apiKey) {
    form.append("api_key", apiKey);
  }

  const response = await client.post<UploadResponse>("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * Ask a question against the documents in the given session.
 * Returns the LLM answer and a list of source citations.
 */
export async function askQuestion(
  sessionId: string,
  question: string,
  provider: string = "huggingface",
  apiKey?: string
): Promise<AskResponse> {
  const response = await client.post<AskResponse>("/ask", {
    session_id: sessionId,
    question,
    provider,
    api_key: apiKey ?? null,
  });
  return response.data;
}

/**
 * Load the pre-bundled sample documents on the server.
 * Returns a session ID identical in shape to uploadDocuments.
 */
export async function loadSampleDocuments(): Promise<UploadResponse> {
  const response = await client.post<UploadResponse>("/load-samples");
  return response.data;
}

/**
 * Extract a human-readable error message from an Axios error or unknown throw.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") return "Request timed out. The model may be under load — please try again.";
    if (!error.response) return "Cannot reach the server. Please check your connection.";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
