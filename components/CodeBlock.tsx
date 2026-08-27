"use client";

import { useState } from "react";

interface CodeBlockProps {
  language?: string;
  children: string;
}

const EXTENSIONS: Record<string, string> = {
  html: "html",
  htm: "html",
  css: "css",
  js: "js",
  jsx: "jsx",
  ts: "ts",
  tsx: "tsx",
  json: "json",
  py: "py",
  python: "py",
  rb: "rb",
  go: "go",
  rs: "rs",
  java: "java",
  c: "c",
  cpp: "cpp",
  cs: "cs",
  php: "php",
  swift: "swift",
  kt: "kt",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  zsh: "sh",
  sql: "sql",
  yml: "yml",
  yaml: "yml",
  toml: "toml",
  ini: "ini",
  md: "md",
  markdown: "md",
  txt: "txt",
  xml: "xml",
  svg: "svg",
  csv: "csv",
  dockerfile: "dockerfile",
  diff: "diff",
  graphql: "graphql",
  scala: "scala",
  lua: "lua",
  perl: "pl",
  r: "r",
  dart: "dart",
  elixir: "ex",
  erlang: "erl",
  haskell: "hs",
  clojure: "clj",
  groovy: "groovy",
  makefile: "mk",
  nginx: "conf",
  powershell: "ps1",
  ps1: "ps1",
  proto: "proto",
  text: "txt",
};

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const lang = language || "text";
  const filename = `snippet.${EXTENSIONS[lang.toLowerCase()] || lang.toLowerCase()}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([children], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleOpen = () => {
    const blob = new Blob([children], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-[#3b3558]">
      <div className="flex items-center justify-between gap-2 bg-[#13111c] px-4 py-2 text-xs text-[#a78bfa]">
        <span title={`${filename}`}>{filename}</span>
        <div className="flex items-center gap-0.5">
          {lang.toLowerCase() === "html" && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#2a2640] hover:text-white transition-colors"
              title="Open in new tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#2a2640] hover:text-white transition-colors"
            title={`Download ${filename}`}
          >
            {downloaded ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Downloaded!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                Download
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#2a2640] hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="bg-[#13111c] p-4 overflow-x-auto text-sm leading-relaxed">
        <code className={`language-${lang}`}>{children}</code>
      </pre>
    </div>
  );
}
