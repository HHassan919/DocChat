"use client";

import { useState } from "react";
import clsx from "clsx";
import { type Provider, PROVIDERS } from "../lib/providers";

interface SetupModalProps {
  onComplete: (provider: Provider, apiKey: string, modelId: string) => void;
}

export default function SetupModal({ onComplete }: SetupModalProps) {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [showKey, setShowKey] = useState(false);

  const current = PROVIDERS.find((p) => p.id === provider)!;
  const hasKey = apiKey.trim().length > 0;
  const hasModel = modelId.trim().length > 0;
  const isReady = hasKey && (!current.requiresModel || hasModel);

  function handleProviderChange(newProvider: Provider) {
    setProvider(newProvider);
    setApiKey("");
    setModelId("");
    setShowKey(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-600 flex items-center justify-center flex-shrink-0">
              <DocumentMagnifyingGlassIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Welcome to DocChat</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Choose an AI provider to power your conversations
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 pb-6 space-y-5">

          {/* Provider list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Choose provider
            </p>
            <div className="space-y-1.5">
              {PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150",
                    provider === p.id
                      ? "border-accent-300 bg-accent-50"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="setup-provider"
                    value={p.id}
                    checked={provider === p.id}
                    onChange={() => handleProviderChange(p.id)}
                    className="mt-0.5 text-accent-600 focus:ring-accent-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{p.label}</span>
                      <span
                        className={clsx(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          p.badgeColor
                        )}
                      >
                        {p.badge}
                      </span>
                      {p.recommended && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API key input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">API key</p>
              <a
                href={current.keyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-600 hover:text-accent-700 hover:underline"
              >
                {current.badge.includes("Free") ? "Get free key →" : "Get key →"}
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={current.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">{current.keyHint}</p>
          </div>

          {/* Model override (shown only when relevant) */}
          {current.showModel && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">
                Model
                {current.requiresModel ? (
                  <span className="text-red-400 font-normal ml-1">— required</span>
                ) : (
                  <span className="text-gray-400 font-normal ml-1">
                    — optional (default: {current.defaultModel})
                  </span>
                )}
              </p>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder={
                  current.requiresModel ? current.modelExamples : current.defaultModel
                }
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-mono"
              />
              {current.modelExamples && !current.requiresModel && (
                <p className="text-xs text-gray-400">{current.modelExamples}</p>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={!isReady}
              onClick={() => onComplete(provider, apiKey.trim(), modelId.trim())}
              className={clsx(
                "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150",
                isReady
                  ? "bg-accent-600 text-white hover:bg-accent-700 shadow-sm hover:shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isReady ? "Start chatting →" : "Enter your API key to continue"}
            </button>
            <p className="text-xs text-center text-gray-400">
              Your key is sent per-request only — never stored on the server.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function DocumentMagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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
