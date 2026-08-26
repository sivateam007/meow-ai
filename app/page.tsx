"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import Settings from "@/components/Settings";
import { Conversation, Message, Settings as SettingsType, DEFAULT_SETTINGS, FileAttachment } from "@/lib/types";
import {
  fetchConversations,
  fetchConversation,
  createConversationAPI,
  updateConversationAPI,
  deleteConversationAPI,
  getSettings,
  saveSettings,
  generateTitle,
} from "@/lib/storage";

const FLUSH_INTERVAL_MS = 60;

function recordUsage(promptTokens?: number, completionTokens?: number) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const key = `meow_usage_${day}`;
    const prev = parseInt(localStorage.getItem(key) || "0", 10) || 0;
    const total = prev + (promptTokens || 0) + (completionTokens || 0);
    localStorage.setItem(key, String(total));
  } catch {
    // ignore storage failures
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setSettings(getSettings());
    fetchConversations().then(setConversations);
  }, [status]);

  const refreshConversations = useCallback(() => {
    fetchConversations().then(setConversations);
  }, []);

  const handleNewChat = async () => {
    const conv = await createConversationAPI("New Chat", []);
    if (conv) {
      refreshConversations();
      setActiveConv(conv);
    }
  };

  const handleSelectChat = async (id: string) => {
    const conv = await fetchConversation(id);
    if (conv) setActiveConv(conv);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteConversationAPI(id);
    refreshConversations();
    if (activeConv?.id === id) {
      setActiveConv(null);
    }
  };

  const handleSaveSettings = (newSettings: SettingsType) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleWebSearch = () => {
    const updated = { ...settings, webSearch: !settings.webSearch };
    setSettings(updated);
    saveSettings(updated);
  };

  const streamResponse = async (conv: Conversation, msgs: Message[], title: string, isRegenerate = false) => {
    setIsLoading(true);
    if (settings.webSearch) setIsSearching(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    let usage: { promptTokens?: number; completionTokens?: number } | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const assistantTimestamp = Date.now();

    // Show the assistant bubble instantly — user sees "Thinking…" right away.
    const withPlaceholder: Message[] = [
      ...msgs,
      { role: "assistant", content: "", timestamp: assistantTimestamp },
    ];
    setActiveConv({ ...conv, title, messages: withPlaceholder, updatedAt: Date.now() });

    const applyFlush = () => {
      flushTimer = null;
      setActiveConv((prev) => {
        if (!prev) return prev;
        const ms = [...prev.messages];
        if (ms.length > 0 && ms[ms.length - 1].role === "assistant") {
          ms[ms.length - 1] = {
            role: "assistant",
            content: assistantContent,
            timestamp: assistantTimestamp,
          };
        }
        return { ...prev, messages: ms };
      });
    };

    const scheduleFlush = () => {
      if (!flushTimer) {
        flushTimer = setTimeout(applyFlush, FLUSH_INTERVAL_MS);
      }
    };

    const cancelFlush = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    };

    try {
      // Attachments are sent as structured data; the server embeds contents only
      // for the newest message and collapses older ones (token savings).
      const payloadMessages = msgs.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.attachments ? { attachments: m.attachments } : {}),
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, settings }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      if (reader) {
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            for (const line of event.split("\n").filter((l) => l.trim() !== "")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (data === "[DONE]") {
                streamDone = true;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.usage) {
                  usage = parsed.usage;
                  continue;
                }
                if (parsed.content) {
                  setIsSearching(false);
                  assistantContent += parsed.content;
                  scheduleFlush();
                }
              } catch {
                // skip
              }
            }

            if (streamDone) break;
            boundary = buffer.indexOf("\n\n");
          }
        }
      }

      cancelFlush();
      applyFlush();

      recordUsage(usage?.promptTokens, usage?.completionTokens);

      const finalMessages = [...msgs, { role: "assistant" as const, content: assistantContent, timestamp: assistantTimestamp }];
      await updateConversationAPI(conv.id, {
        title,
        messages: finalMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          ...(m.attachments ? { attachments: m.attachments } : {}),
        })),
      });
      const finalConv = { ...conv, title, messages: finalMessages, updatedAt: Date.now() };
      setActiveConv(finalConv);
      refreshConversations();
    } catch (error: unknown) {
      cancelFlush();

      if (controller.signal.aborted) {
        applyFlush();
        const hasPartial = assistantContent.trim().length > 0;
        if (hasPartial || !isRegenerate) {
          const persistedMessages = hasPartial
            ? [...msgs, { role: "assistant" as const, content: assistantContent, timestamp: assistantTimestamp }]
            : msgs;
          setActiveConv({ ...conv, title, messages: persistedMessages, updatedAt: Date.now() });
          await updateConversationAPI(conv.id, {
            messages: persistedMessages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              ...(m.attachments ? { attachments: m.attachments } : {}),
            })),
          });
          refreshConversations();
        }
        return;
      }

      // Connection dropped / error mid-stream: keep whatever was already shown.
      const hasPartial = assistantContent.trim().length > 0;
      let errorText = "Sorry, something went wrong. Please try again later.";
      if (error instanceof Error && error.message) {
        errorText = error.message;
      }
      const finalAssistant: Message = hasPartial
        ? { role: "assistant", content: `${assistantContent}\n\n_(interrupted — ${errorText})_`, timestamp: assistantTimestamp }
        : { role: "assistant", content: errorText, timestamp: Date.now() };

      const errorConv = {
        ...conv,
        messages: [...msgs, finalAssistant],
        updatedAt: Date.now(),
      };
      setActiveConv(errorConv);
      await updateConversationAPI(conv.id, {
        messages: [...msgs, finalAssistant].map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      });
    } finally {
      abortRef.current = null;
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  const handleSend = async (content: string, attachments?: FileAttachment[]) => {
    let conv = activeConv;
    if (!conv) {
      conv = await createConversationAPI("New Chat", []);
      if (!conv) return;
      refreshConversations();
      setActiveConv(conv);
    }

    const userMessage: Message = { role: "user", content, timestamp: Date.now(), attachments: attachments && attachments.length > 0 ? attachments : undefined };
    const updatedMessages = [...conv.messages, userMessage];

    let newTitle = conv.title;
    if (updatedMessages.length === 1) {
      newTitle = generateTitle(content);
    }

    conv = { ...conv, title: newTitle, messages: updatedMessages, updatedAt: Date.now() };
    setActiveConv({ ...conv });
    refreshConversations();

    await streamResponse(conv, updatedMessages, newTitle);
  };

  const handleRegenerate = useCallback(async () => {
    if (!activeConv || isLoading) return;
    const msgs = activeConv.messages;
    const lastIdx = msgs.length - 1;
    if (lastIdx < 0 || msgs[lastIdx].role !== "assistant") return;
    const previousMessages = msgs.slice(0, lastIdx);
    await streamResponse(activeConv, previousMessages, activeConv.title, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv, isLoading, settings]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  if (status === "loading" || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#13111c]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-[#13111c]">
      <Sidebar
        conversations={conversations}
        activeId={activeConv?.id || null}
        onSelect={handleSelectChat}
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatWindow
        messages={activeConv?.messages || []}
        onSend={handleSend}
        isLoading={isLoading}
        isSearching={isSearching}
        onStop={handleStop}
        onRegenerate={handleRegenerate}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        liveMode={liveMode}
        onToggleLiveMode={() => setLiveMode((prev) => !prev)}
        webSearch={settings.webSearch}
        onToggleWebSearch={handleToggleWebSearch}
      />
      {settingsOpen && (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
