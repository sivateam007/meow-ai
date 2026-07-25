import { Conversation, DEFAULT_SETTINGS, Settings } from "./types";

const SETTINGS_KEY = "meow-ai-settings";

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function generateTitle(content: string): string {
  const clean = content.replace(/[#*`_~\[\]]/g, "").trim();
  return clean.length > 40 ? clean.substring(0, 40) + "..." : clean;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/conversations");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createConversationAPI(
  title: string,
  messages: { role: string; content: string; timestamp: number; attachments?: unknown }[]
): Promise<Conversation | null> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, messages }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateConversationAPI(
  id: string,
  data: { title?: string; messages?: { role: string; content: string; timestamp: number; attachments?: unknown }[] }
): Promise<Conversation | null> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteConversationAPI(id: string): Promise<boolean> {
  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  return res.ok;
}
