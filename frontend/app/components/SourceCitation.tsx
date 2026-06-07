// SourceCitation.tsx — Displays the source citations attached to an assistant message.
// Each citation shows document name, page number, and a short excerpt.
// The citation block is collapsible to keep the chat window clean.

"use client";

import { useState } from "react";
import clsx from "clsx";

export interface Citation {
  document: string;
  page: number;
  excerpt: string;
}

interface SourceCitationProps {
  sources: Citation[];
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-700 font-medium focus:outline-none"
        aria-expanded={isOpen}
      >
        <ChevronIcon
          className={clsx("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-90")}
        />
        {sources.length} source{sources.length > 1 ? "s" : ""} cited
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((source, i) => (
            <div
              key={`${source.document}-${source.page}-${i}`}
              className="rounded-lg border border-accent-100 bg-accent-50 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <DocumentIcon className="w-3.5 h-3.5 text-accent-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-accent-700 truncate">
                  {source.document}
                </span>
                <span className="text-xs text-accent-400 ml-auto whitespace-nowrap">
                  Page {source.page}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {source.excerpt}
                {source.excerpt.length >= 300 ? "…" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
