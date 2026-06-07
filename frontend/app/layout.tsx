// layout.tsx — Root layout for DocChat Next.js app
// Sets document metadata, loads global styles, wraps all pages.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocChat — Ask Questions About Your Documents",
  description:
    "Upload PDF documents and ask questions in natural language. Get accurate, cited answers powered by RAG and LLMs.",
  keywords: ["document chat", "RAG", "PDF QA", "LangChain", "AI"],
  authors: [{ name: "Hateem Hassan" }],
  openGraph: {
    title: "DocChat",
    description: "Ask questions about your documents, get cited answers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
