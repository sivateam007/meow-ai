export interface FileAttachment {
  name: string;
  type: string;
  content: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "big-pickle",
  temperature: 0.7,
  maxTokens: 2048,
};

export const AVAILABLE_MODELS = [
  { id: "big-pickle", name: "Whiskers" },
  { id: "deepseek-v4-flash", name: "Shadow" },
  { id: "gpt-5.3-codex", name: "Mittens" },
  { id: "kimi-k2", name: "Luna" },
  { id: "gpt-5-codex", name: "Simba" },
  { id: "gemini-3.1-pro", name: "Nala" },
  { id: "claude-opus-4-1", name: "Tiger" },
  { id: "grok-code", name: "Oreo" },
];
