import { Conversation, DEFAULT_SETTINGS, Settings, isAvailableModel } from "./types";

const SETTINGS_KEY = "meow-ai-settings";

/**
 * Reads settings, falling back to the defaults.
 *
 * A stored `model` is validated against the live roster: models are retired by
 * the provider from time to time, and a stale id left in localStorage would
 * otherwise make the server reject every message with "Invalid model".
 */
export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    return isAvailableModel(parsed.model)
      ? parsed
      : { ...parsed, model: DEFAULT_SETTINGS.model };
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

/**
 * Builds a conversation that exists only in this browser tab.
 *
 * Chatting itself needs no persistence — the server streams a reply straight
 * from the request. So when the database is unreachable this keeps the message
 * flowing rather than silently swallowing it and leaving the composer looking
 * dead. The trade-off is that history for this conversation is lost on reload,
 * which is the right call: a working chat that forgets beats a chat that
 * refuses to answer.
 */
export function makeLocalConversation(): Conversation {
  const now = Date.now();
  return {
    id: `local-${now}`,
    title: "New Chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
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
  messages: {
    role: string;
    content: string;
    timestamp: number;
    attachments?: unknown;
    sources?: unknown;
    analysis?: string;
  }[]
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
  data: {
    title?: string;
    messages?: {
      role: string;
      content: string;
      timestamp: number;
      attachments?: unknown;
      sources?: unknown;
      analysis?: string;
    }[];
  }
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
