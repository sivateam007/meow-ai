"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import Settings from "@/components/Settings";
import { Conversation, Message, Settings as SettingsType, DEFAULT_SETTINGS, FileAttachment } from "@/lib/types";
import { SYSTEM_PROMPT } from "@/lib/constants";
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
    const assistantMessage: Message = { role: "assistant", content: "", timestamp: Date.now() };

    try {
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...msgs.map((m) => {
          let msgContent = m.content;
          if (m.attachments && m.attachments.length > 0) {
            const fileParts = m.attachments.map((a) => {
              if (a.type.startsWith("image/")) {
                return `[Image attached: ${a.name}]`;
              }
              return `[File attached: ${a.name}]\n\`\`\`\n${a.content.substring(0, 8000)}\n\`\`\``;
            });
            msgContent = msgContent + "\n\n" + fileParts.join("\n\n");
          }
          return { role: m.role, content: msgContent };
        }),
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, settings }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setIsSearching(false);
                assistantContent += parsed.content;
                assistantMessage.content = assistantContent;
                setActiveConv((prev) => {
                  if (!prev) return prev;
                  const ms = [...prev.messages];
                  if (ms.length > 0 && ms[ms.length - 1].role === "assistant") {
                    ms[ms.length - 1] = { ...assistantMessage };
                  } else {
                    ms.push({ ...assistantMessage });
                  }
                  return { ...prev, messages: ms, updatedAt: Date.now() };
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      const finalMessages = [...msgs, { ...assistantMessage, content: assistantContent }];
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
      if (controller.signal.aborted) {
        const hasPartial = assistantContent.trim().length > 0;
        if (hasPartial || !isRegenerate) {
          const persistedMessages = hasPartial
            ? [...msgs, { ...assistantMessage, content: assistantContent }]
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
      let errorText = "Sorry, something went wrong. Please try again later.";
      if (error instanceof Error) {
        errorText = error.message || errorText;
      }
      const errorMessage: Message = {
        role: "assistant",
        content: errorText,
        timestamp: Date.now(),
      };
      const errorConv = {
        ...conv,
        messages: [...msgs, errorMessage],
        updatedAt: Date.now(),
      };
      setActiveConv(errorConv);
      await updateConversationAPI(conv.id, {
        messages: [...msgs, errorMessage].map((m) => ({
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

  const handleRegenerate = async () => {
    if (!activeConv || isLoading) return;
    const msgs = activeConv.messages;
    const lastIdx = msgs.length - 1;
    if (lastIdx < 0 || msgs[lastIdx].role !== "assistant") return;
    const previousMessages = msgs.slice(0, lastIdx);
    await streamResponse(activeConv, previousMessages, activeConv.title, true);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  };

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
