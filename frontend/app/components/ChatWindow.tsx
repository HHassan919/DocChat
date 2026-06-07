// ChatWindow.tsx — The main chat interface component.
// Renders the scrollable message history and the input bar.
// Manages auto-scroll to the latest message.

"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import MessageBubble, { type Message } from "./MessageBubble";

interface ChatWindowProps {
  messages: Message[];
  onSend: (question: string) => void;
  isLoading: boolean;
  hasDocuments: boolean;
}

export default function ChatWindow({
  messages,
  onSend,
  isLoading,
  hasDocuments,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading || !hasDocuments) return;
    setInput("");
    onSend(question);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter; allow Shift+Enter for newlines
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const canSend = input.trim().length > 0 && !isLoading && hasDocuments;

  return (
    <div className="flex flex-col h-full">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <EmptyState hasDocuments={hasDocuments} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasDocuments
                ? "Ask a question about your documents…"
                : "Upload documents first to start chatting"
            }
            disabled={!hasDocuments || isLoading}
            rows={1}
            className={clsx(
              "flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5",
              "text-sm text-gray-800 placeholder-gray-400 leading-relaxed",
              "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent",
              "transition-all duration-150 max-h-32 overflow-y-auto",
              (!hasDocuments || isLoading) && "bg-gray-50 cursor-not-allowed"
            )}
            style={{ height: "auto", minHeight: "44px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={clsx(
              "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
              "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-500",
              canSend
                ? "bg-accent-600 hover:bg-accent-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-1.5 text-xs text-gray-400 text-center">
          Press Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

function EmptyState({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
      <div className="w-14 h-14 rounded-2xl bg-accent-50 flex items-center justify-center mb-4">
        <ChatBubbleIcon className="w-7 h-7 text-accent-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">
        {hasDocuments ? "Ready to answer" : "No documents loaded"}
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        {hasDocuments
          ? "Ask any question about the documents you uploaded. Answers will include exact source citations."
          : "Upload one or more PDF files on the left, or click "Try with sample documents" to get started immediately."}
      </p>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}
