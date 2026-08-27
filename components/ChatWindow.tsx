"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  onEdit?: (index: number) => void;
  editingMsg?: { index: number; content: string; attachments?: FileAttachment[] } | null;
  onCancelEdit?: () => void;
  onEditSend?: (content: string, attachments?: FileAttachment[]) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  liveMode: boolean;
  onToggleLiveMode: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  suggestions?: string[];
  emptyStatePrompts?: string[];
  voice?: string;
  voiceLang?: string;
  voiceRate?: number;
  voicePitch?: number;
  voiceVolume?: number;
}

const NEAR_BOTTOM_THRESHOLD = 120;

export default function ChatWindow({
  messages,
  onSend,
  isLoading,
  isSearching,
  onStop,
  onRegenerate,
  onEdit,
  editingMsg,
  onCancelEdit,
  onEditSend,
  onOpenSidebar,
  onOpenSettings,
  liveMode,
  onToggleLiveMode,
  webSearch,
  onToggleWebSearch,
  suggestions,
  emptyStatePrompts,
  voice,
  voiceLang,
  voiceRate,
  voicePitch,
  voiceVolume,
}: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    isNearBottomRef.current = true;
    setShowJump(false);
  }, []);

  // Instant-follow scroll only while the user is already near the bottom.
  useEffect(() => {
    if (isNearBottomRef.current) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) return; // during streaming, follow only when near bottom
    scrollToBottom(true);
  }, [isLoading, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance < NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = near;
    setShowJump(!near && el.scrollHeight > el.clientHeight + 200);
  }, []);

  const lastAssistantMsg = messages.filter((m) => m.role === "assistant").pop();
  const lastMsgIndex = lastAssistantMsg ? messages.indexOf(lastAssistantMsg) : -1;
  const canRegenerate = lastMsgIndex >= 0 && lastMsgIndex === messages.length - 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
      <header className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[#3b3558] bg-[#13111c]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onOpenSidebar} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#3d3760]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="7" cy="5.5" rx="2" ry="2.5"/><ellipse cx="12" cy="4" rx="2" ry="2.5"/><ellipse cx="17" cy="5.5" rx="2" ry="2.5"/><path d="M4.5 13c0-3 2-5.5 5-6.5.8-.3 1.6-.3 2.5 0 3 1 5 3.5 5 6.5 0 2.5-1.5 4.5-3.5 5.5l-1.5.8c-.5.3-1 .5-1.5.5s-1-.2-1.5-.5l-1.5-.8c-2-1-3.5-3-3.5-5.5z"/></svg>
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
            {liveMode && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </span>
            )}
          </button>
          <button
            onClick={onOpenSettings}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#3d3760]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37-2.37.996-.608 2.296-.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-y-auto"
      >
        <div className="chat-bg h-full">
          <div className="chat-bg-overlay h-full">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 h-full">
              {messages.length === 0 && !isLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#7c3aed]/20 flex items-center justify-center mb-4 sm:mb-6">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#7c3aed] flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="7" cy="5.5" rx="2" ry="2.5"/><ellipse cx="12" cy="4" rx="2" ry="2.5"/><ellipse cx="17" cy="5.5" rx="2" ry="2.5"/><path d="M4.5 13c0-3 2-5.5 5-6.5.8-.3 1.6-.3 2.5 0 3 1 5 3.5 5 6.5 0 2.5-1.5 4.5-3.5 5.5l-1.5.8c-.5.3-1 .5-1.5.5s-1-.2-1.5-.5l-1.5-.8c-2-1-3.5-3-3.5-5.5z"/></svg>
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Meow AI</h1>
                  <p className="text-gray-400 text-base sm:text-lg max-w-md mb-6 sm:mb-8">
                    Your friendly AI assistant. Ask me anything!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
                    {(emptyStatePrompts || [
                      "Explain quantum computing",
                      "Write a Python sorting algorithm",
                      "Help me write a poem",
                      "What are the best practices for React?",
                    ]).map((prompt) => (
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
                      liveStreamSpeak={liveMode && msg.role === "assistant" && i === lastMsgIndex && isLoading}
                      canRegenerate={msg.role === "assistant" && i === lastMsgIndex && !isLoading}
                      onRegenerate={onRegenerate}
                      onEdit={onEdit ? () => onEdit(i) : undefined}
                      isStreaming={isLoading && msg.role === "assistant" && i === messages.length - 1}
                      isSearchingBubble={isSearching && i === messages.length - 1}
                      voice={voice}
                      voiceLang={voiceLang}
                      voiceRate={voiceRate}
                      voicePitch={voicePitch}
                      voiceVolume={voiceVolume}
                    />
                  ))}
                  {!isLoading && suggestions && suggestions.length > 0 && messages.length > 0 && (
                    <div className="mt-2 mb-4 px-1">
                      <p className="text-xs text-gray-500 mb-2">You might want to ask:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => onSend(s)}
                            className="text-left text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#3b3558] bg-[#2a2640]/50 text-gray-300 hover:text-white hover:border-[#7c3aed]/50 hover:bg-[#2a2640] transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div />
            </div>
          </div>
        </div>
      </div>

      {showJump && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-[#2a2640] border border-[#3b3558] text-gray-300 hover:text-white hover:border-[#7c3aed]/60 shadow-lg flex items-center justify-center transition-all"
          title="Jump to latest"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        onStop={onStop}
        webSearch={webSearch}
        onToggleWebSearch={onToggleWebSearch}
        liveMode={liveMode}
        editingMsg={editingMsg}
        onCancelEdit={onCancelEdit}
        onEditSend={onEditSend}
      />
    </div>
  );
}
