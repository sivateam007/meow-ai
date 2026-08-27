"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";
import { Message } from "@/lib/types";
import { markdownToPlainText } from "@/lib/markdown";

interface MessageBubbleProps {
  message: Message;
  autoSpeak?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  isSearchingBubble?: boolean;
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");
    if (match) {
      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
    }
    if (codeString.includes("\n")) {
      return <CodeBlock>{codeString}</CodeBlock>;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
  },
  a({ href, children }) {
    const safe = href && /^(https?:|mailto:)/i.test(href);
    if (!safe) return <span>{children}</span>;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#a78bfa] hover:text-[#7c3aed] underline"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-[#7c3aed] pl-4 italic text-gray-400 my-2">
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-bold mb-1 mt-3">{children}</h3>;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse border border-[#3b3558] text-sm">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-[#3b3558] bg-[#13111c] px-3 py-1.5 text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-[#3b3558] px-3 py-1.5">{children}</td>
    );
  },
};

function arePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps) {
  return (
    prev.message === next.message &&
    prev.isStreaming === next.isStreaming &&
    prev.isSearchingBubble === next.isSearchingBubble &&
    prev.canRegenerate === next.canRegenerate &&
    prev.autoSpeak === next.autoSpeak
  );
}

function MessageBubble({
  message,
  autoSpeak,
  canRegenerate,
  onRegenerate,
  onEdit,
  isStreaming,
  isSearchingBubble,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoSpokenRef = useRef(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdownToPlainText(message.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const plainText = text.replace(/[#*`_~\[\]()>]/g, "").replace(/\n{2,}/g, ". ");
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.name.includes("Google") || v.name.includes("Samantha") || v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, []);

  useEffect(() => {
    if (autoSpeak && !autoSpokenRef.current && message.content) {
      autoSpokenRef.current = true;
      speak(message.content);
    }
    if (!autoSpeak) {
      autoSpokenRef.current = false;
    }
  }, [autoSpeak, message.content, speak]);

  const handleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    speak(message.content);
  }, [speaking, message.content, speak]);

  return (
    <div className={`message-appear flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 sm:px-5 py-3 ${
          isUser
            ? "bg-[#7c3aed] text-white rounded-br-md"
            : "bg-[#2a2640] border border-[#3b3558] text-gray-100 rounded-bl-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#3b3558]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#7c3aed] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="7" cy="5.5" rx="2" ry="2.5"/><ellipse cx="12" cy="4" rx="2" ry="2.5"/><ellipse cx="17" cy="5.5" rx="2" ry="2.5"/><path d="M4.5 13c0-3 2-5.5 5-6.5.8-.3 1.6-.3 2.5 0 3 1 5 3.5 5 6.5 0 2.5-1.5 4.5-3.5 5.5l-1.5.8c-.5.3-1 .5-1.5.5s-1-.2-1.5-.5l-1.5-.8c-2-1-3.5-3-3.5-5.5z"/></svg>
              </div>
              <span className="text-xs font-semibold text-[#a78bfa]">Meow AI</span>
            </div>
            <div className="flex items-center gap-1">
              {canRegenerate && !isStreaming && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg transition-all text-gray-500 hover:text-[#a78bfa] hover:bg-[#3d3760]"
                  title="Regenerate response"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition-all ${
                  copied
                    ? "text-[#7c3aed] bg-[#7c3aed]/10"
                    : "text-gray-500 hover:text-[#a78bfa] hover:bg-[#3d3760]"
                }`}
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleSpeak}
              className={`p-1.5 rounded-lg transition-all ${
                speaking
                  ? "text-[#7c3aed] bg-[#7c3aed]/10"
                  : "text-gray-500 hover:text-[#a78bfa] hover:bg-[#3d3760]"
              }`}
              title={speaking ? "Stop reading" : "Read aloud"}
            >
              {speaking ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            </div>
          </div>
        )}

        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att, i) => (
              <div key={i}>
                {att.type.startsWith("image/") ? (
                  <img src={att.content} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg border border-white/20" />
                ) : (
                  <div className="bg-white/10 rounded-lg px-2 py-1 text-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {att.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-[#a78bfa] animate-pulse ml-0.5 align-middle" aria-hidden="true" />
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 min-h-[24px]">
              {isSearchingBubble ? (
                <span className="text-xs text-gray-400">Searching the web…</span>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-gray-400">Thinking…</span>
                </>
              )}
            </div>
          )}
        </div>

        {isUser && (
          <div className="flex justify-end mt-1 gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg transition-all text-white/50 hover:text-white hover:bg-white/10"
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-lg transition-all ${
                copied
                  ? "text-white bg-white/20"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
              title={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble, arePropsEqual);
