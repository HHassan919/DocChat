// page.tsx — Main page for DocChat.
// Composes the sidebar (upload + provider settings) and the chat window.
// Owns all application state: session, messages, provider, loading flags.

"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import FileUpload from "./components/FileUpload";
import ChatWindow from "./components/ChatWindow";
import ApiKeyInput, { type Provider } from "./components/ApiKeyInput";
import { type Message } from "./components/MessageBubble";
import {
  uploadDocuments,
  askQuestion,
  loadSampleDocuments,
  extractErrorMessage,
} from "./lib/api";

export default function HomePage() {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadedDocs, setLoadedDocs] = useState<string[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);

  // Provider state
  const [provider, setProvider] = useState<Provider>("huggingface");
  const [apiKey, setApiKey] = useState("");

  // Loading flags
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function addMessage(message: Omit<Message, "id">): string {
    const id = uuidv4();
    setMessages((prev) => [...prev, { ...message, id }]);
    return id;
  }

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  function showError(text: string) {
    addMessage({ role: "assistant", content: text, isError: true });
  }

  // ---------------------------------------------------------------------------
  // Upload handler
  // ---------------------------------------------------------------------------

  const handleUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      try {
        const result = await uploadDocuments(files, provider, apiKey || undefined);
        setSessionId(result.session_id);
        setLoadedDocs(result.documents);
        setMessages([]);
        addMessage({
          role: "assistant",
          content: `Loaded ${result.documents.length} document${result.documents.length > 1 ? "s" : ""} (${result.total_chunks} chunks indexed). What would you like to know?`,
        });
      } catch (err) {
        showError(`Upload failed: ${extractErrorMessage(err)}`);
      } finally {
        setIsUploading(false);
      }
    },
    [provider, apiKey]
  );

  // ---------------------------------------------------------------------------
  // Sample documents handler
  // ---------------------------------------------------------------------------

  const handleLoadSamples = useCallback(async () => {
    setIsUploading(true);
    try {
      const result = await loadSampleDocuments();
      setSessionId(result.session_id);
      setLoadedDocs(result.documents);
      setMessages([]);
      addMessage({
        role: "assistant",
        content: `Sample documents loaded (${result.total_chunks} chunks indexed). Try asking questions like:\n• What is the vacation policy?\n• What are the key technical requirements?\n• What were the main research findings?`,
      });
    } catch (err) {
      showError(`Could not load samples: ${extractErrorMessage(err)}`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Ask handler
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(
    async (question: string) => {
      if (!sessionId) return;

      addMessage({ role: "user", content: question });

      const loadingId = addMessage({
        role: "assistant",
        content: "",
        isLoading: true,
      });

      setIsAsking(true);
      try {
        const result = await askQuestion(
          sessionId,
          question,
          provider,
          apiKey || undefined
        );
        updateMessage(loadingId, {
          content: result.answer,
          sources: result.sources,
          isLoading: false,
        });
      } catch (err) {
        updateMessage(loadingId, {
          content: `Error: ${extractErrorMessage(err)}`,
          isLoading: false,
          isError: true,
        });
      } finally {
        setIsAsking(false);
      }
    },
    [sessionId, provider, apiKey]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isLoading = isUploading || isAsking;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center">
            <DocumentMagnifyingGlassIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">DocChat</h1>
            <p className="text-xs text-gray-400 mt-0.5">Ask questions about your documents, get cited answers</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="hidden sm:block">
            {sessionId ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Session active · {loadedDocs.length} doc{loadedDocs.length !== 1 ? "s" : ""}
              </span>
            ) : (
              "No documents loaded"
            )}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4 flex-1">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Documents
              </h2>
              <FileUpload
                onUpload={handleUpload}
                onLoadSamples={handleLoadSamples}
                isLoading={isUploading}
                loadedDocuments={loadedDocs}
              />
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Settings
              </h2>
              <ApiKeyInput
                provider={provider}
                onProviderChange={setProvider}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
              />
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              Documents are processed in-memory for this session only. Nothing is stored on the server.
            </p>
          </div>
        </aside>

        {/* Chat panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            hasDocuments={!!sessionId}
          />
        </main>
      </div>
    </div>
  );
}

function DocumentMagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
