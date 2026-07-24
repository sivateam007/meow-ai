"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import Settings from "@/components/Settings";
import { Conversation, Message, Settings as SettingsType, DEFAULT_SETTINGS } from "@/lib/types";
import { SYSTEM_PROMPT } from "@/lib/constants";
import {
  getConversations,
  saveConversation,
  deleteConversation as deleteConv,
  createConversation,
  getSettings,
  saveSettings,
  generateTitle,
} from "@/lib/storage";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setConversations(getConversations());
    setSettings(getSettings());
  }, []);

  const refreshConversations = useCallback(() => {
    setConversations(getConversations());
  }, []);

  const handleNewChat = () => {
    const conv = createConversation();
    saveConversation(conv);
    refreshConversations();
    setActiveConv(conv);
  };

  const handleSelectChat = (id: string) => {
    const conv = getConversations().find((c) => c.id === id);
    if (conv) setActiveConv(conv);
  };

  const handleDeleteChat = (id: string) => {
    deleteConv(id);
    refreshConversations();
    if (activeConv?.id === id) {
      setActiveConv(null);
    }
  };

  const handleSaveSettings = (newSettings: SettingsType) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSend = async (content: string) => {
    let conv = activeConv;
    if (!conv) {
      conv = createConversation();
      saveConversation(conv);
      refreshConversations();
      setActiveConv(conv);
    }

    const userMessage: Message = { role: "user", content, timestamp: Date.now() };
    const updatedMessages = [...conv.messages, userMessage];

    conv = { ...conv, messages: updatedMessages, updatedAt: Date.now() };
    if (updatedMessages.length === 1) {
      conv.title = generateTitle(content);
    }
    setActiveConv({ ...conv });
    saveConversation(conv);
    refreshConversations();

    setIsLoading(true);

    try {
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, settings }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

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
                assistantContent += parsed.content;
                assistantMessage.content = assistantContent;
                setActiveConv((prev) => {
                  if (!prev) return prev;
                  const msgs = [...prev.messages];
                  if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                    msgs[msgs.length - 1] = { ...assistantMessage };
                  } else {
                    msgs.push({ ...assistantMessage });
                  }
                  return { ...prev, messages: msgs, updatedAt: Date.now() };
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      const finalConv = {
        ...conv!,
        messages: [...updatedMessages, { ...assistantMessage, content: assistantContent }],
        updatedAt: Date.now(),
      };
      saveConversation(finalConv);
      setActiveConv(finalConv);
      refreshConversations();
    } catch (error: unknown) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Sorry, something went wrong: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API key in .env.local and try again.`,
        timestamp: Date.now(),
      };
      const errorConv = {
        ...conv!,
        messages: [...updatedMessages, errorMessage],
        updatedAt: Date.now(),
      };
      setActiveConv(errorConv);
      saveConversation(errorConv);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
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
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
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
