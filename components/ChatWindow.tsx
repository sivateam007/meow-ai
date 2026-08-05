"use client";

import { useEffect, useRef } from "react";
import { Message, FileAttachment } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

interface ChatWindowProps {
  messages: Message[];
  onSend: (content: string, attachments?: FileAttachment[]) => void;
  isLoading: boolean;
  isSearching: boolean;
  onStop: () => void;
  onRegenerate: () => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  liveMode: boolean;
  onToggleLiveMode: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
}

export default function ChatWindow({
  messages,
  onSend,
  isLoading,
  isSearching,
  onStop,
  onRegenerate,
  onOpenSidebar,
  onOpenSettings,
  liveMode,
  onToggleLiveMode,
  webSearch,
  onToggleWebSearch,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const lastAssistantMsg = messages.filter((m) => m.role === "assistant").pop();
  const lastMsgIndex = lastAssistantMsg ? messages.indexOf(lastAssistantMsg) : -1;
  const canRegenerate = lastMsgIndex >= 0 && lastMsgIndex === messages.length - 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[#3b3558] bg-[#13111c]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onOpenSidebar} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#3d3760]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center text-xs font-bold">
              M
            </div>
            <span className="font-semibold text-white text-sm sm:text-base">Meow AI</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleLiveMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              liveMode
                ? "bg-[#7c3aed] text-white"
                : "text-gray-400 hover:text-white hover:bg-[#3d3760] border border-[#3b3558]"
            }`}
            title={liveMode ? "Disable live mode" : "Enable live mode"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="hidden sm:inline">Live</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#3d3760]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="chat-bg min-h-full">
          <div className="chat-bg-overlay min-h-full">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#7c3aed]/20 flex items-center justify-center mb-4 sm:mb-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#7c3aed] flex items-center justify-center text-xl sm:text-2xl font-bold">
                      M
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Meow AI</h1>
                  <p className="text-gray-400 text-base sm:text-lg max-w-md mb-6 sm:mb-8">
                    Your friendly AI assistant. Ask me anything!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
                    {[
                      "Explain quantum computing",
                      "Write a Python sorting algorithm",
                      "Help me write a poem",
                      "What are the best practices for React?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => onSend(prompt)}
                        className="text-left p-3 rounded-xl border border-[#3b3558] bg-[#2a2640]/50 text-sm text-gray-400 hover:text-white hover:border-[#7c3aed]/50 hover:bg-[#2a2640] transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      message={msg}
                      autoSpeak={liveMode && msg.role === "assistant" && i === lastMsgIndex && !isLoading}
                      canRegenerate={msg.role === "assistant" && i === lastMsgIndex && !isLoading}
                      onRegenerate={onRegenerate}
                      isLoading={isLoading}
                    />
                  ))}
                  {isLoading && (
                    <div className="message-appear flex justify-start mb-4">
                      <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 bg-[#2a2640] border border-[#3b3558]">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#3b3558]">
                          <div className="w-6 h-6 rounded-full bg-[#7c3aed] flex items-center justify-center text-xs font-bold">
                            M
                          </div>
                          <span className="text-xs font-semibold text-[#a78bfa]">Meow AI</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          {isSearching && (
                            <span className="text-xs text-gray-400">Searching the web…</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </div>

      <ChatInput onSend={onSend} isLoading={isLoading} onStop={onStop} webSearch={webSearch} onToggleWebSearch={onToggleWebSearch} />
    </div>
  );
}
