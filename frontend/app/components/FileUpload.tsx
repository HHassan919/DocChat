// FileUpload.tsx — Drag-and-drop + click-to-browse PDF upload component
// Handles file selection, validation feedback, and upload progress state.

"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  onLoadSamples: () => void;
  isLoading: boolean;
  loadedDocuments: string[];
}

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;
const ACCEPTED_TYPES = ["application/pdf", "application/x-pdf"];

export default function FileUpload({
  onUpload,
  onLoadSamples,
  isLoading,
  loadedDocuments,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFiles(files: File[]): string | null {
    if (files.length === 0) return "No files selected.";
    if (files.length > MAX_FILES) {
      return `Maximum ${MAX_FILES} files allowed per upload.`;
    }
    for (const file of files) {
      const isPdf =
        file.name.toLowerCase().endsWith(".pdf") ||
        ACCEPTED_TYPES.includes(file.type);
      if (!isPdf) {
        return `"${file.name}" is not a PDF. Only PDF files are accepted.`;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `"${file.name}" exceeds the ${MAX_SIZE_MB} MB size limit.`;
      }
    }
    return null;
  }

  function handleFiles(files: File[]) {
    const error = validateFiles(files);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    onUpload(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    handleFiles(files);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF documents"
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer",
          "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500",
          isDragging
            ? "border-accent-500 bg-accent-50 scale-[1.01]"
            : "border-gray-200 bg-white hover:border-accent-400 hover:bg-gray-50",
          isLoading && "opacity-60 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
          aria-hidden="true"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center">
            <UploadIcon className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? "Drop PDFs here" : "Drag & drop PDFs here"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              or click to browse — up to {MAX_FILES} files, {MAX_SIZE_MB} MB each
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
            <div className="flex items-center gap-2 text-sm text-accent-600 font-medium">
              <Spinner className="w-4 h-4" />
              Processing documents…
            </div>
          </div>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}

      {/* Sample documents button */}
      <button
        type="button"
        onClick={onLoadSamples}
        disabled={isLoading}
        className={clsx(
          "w-full py-2 px-4 rounded-lg border border-gray-200 bg-white",
          "text-sm font-medium text-gray-600 hover:text-accent-700 hover:border-accent-300",
          "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent-500",
          "flex items-center justify-center gap-2",
          isLoading && "opacity-60 cursor-not-allowed"
        )}
      >
        <BookOpenIcon className="w-4 h-4" />
        Try with sample documents
      </button>

      {/* Loaded documents list */}
      {loadedDocuments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Loaded documents
          </p>
          <ul className="space-y-1">
            {loadedDocuments.map((doc) => (
              <li
                key={doc}
                className="flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2"
              >
                <DocumentIcon className="w-3.5 h-3.5 text-accent-500 flex-shrink-0" />
                <span className="truncate">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons — avoids an external icon library dependency
// ---------------------------------------------------------------------------

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
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

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx(className, "animate-spin")} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
