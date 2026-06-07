// ApiKeyInput.tsx — Collapsible panel for selecting LLM provider and entering
// an optional API key. The key is held only in component state and sent
// per-request; it is never stored, logged, or persisted to any backend.
//
// Provider status is reflected in the collapsed header so the user always
// knows which model will answer their next question without opening the panel.

"use client";

import { useState } from "react";
import clsx from "clsx";

export type Provider = "huggingface" | "openai" | "gemini";

interface ApiKeyInputProps {
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const PROVIDERS: { id: Provider; label: string; description: string; requiresKey: boolean }[] = [
  {
    id: "huggingface",
    label: "HuggingFace (free)",
    description: "Mistral-7B via HuggingFace — no key required",
    requiresKey: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o-mini — bring your own key",
    requiresKey: true,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Gemini 1.5 Flash — bring your own key",
    requiresKey: true,
  },
];

export default function ApiKeyInput({
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
}: ApiKeyInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;
  const hasKey = apiKey.trim().length > 0;
  const isReady = !currentProvider.requiresKey || hasKey;

  return (
    <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <SparklesIcon className="w-4 h-4 text-accent-500" />
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-700">LLM Provider</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className={clsx("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", isReady ? "bg-green-500" : "bg-amber-400")} />
              {currentProvider.label}{!isReady && " — key required"}
            </p>
          </div>
        </div>
        <ChevronIcon
          className={clsx(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
          {/* Provider selection */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500">Choose provider</p>
            {PROVIDERS.map((p) => (
              <label
                key={p.id}
                className={clsx(
                  "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-150",
                  provider === p.id
                    ? "border-accent-300 bg-accent-50"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={provider === p.id}
                  onChange={() => onProviderChange(p.id)}
                  className="mt-0.5 text-accent-600 focus:ring-accent-500"
                />
                <div>
                  <p className="text-xs font-medium text-gray-700">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* API key input — shown only when the selected provider requires one */}
          {currentProvider.requiresKey && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">
                API key{" "}
                <span className="text-gray-400 font-normal">(optional — used for this session only)</span>
              </p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder={`Paste your ${currentProvider.label} API key…`}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Your key is never stored or logged. It is sent only with each request.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
