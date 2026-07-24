export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
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
  { id: "big-pickle", name: "Big Pickle" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
  { id: "gpt-5.3-codex", name: "GPT 5.3 Codex" },
  { id: "kimi-k2", name: "Kimi K2" },
  { id: "gpt-5-codex", name: "GPT 5 Codex" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
  { id: "claude-opus-4-1", name: "Claude Opus 4.1" },
  { id: "grok-code", name: "Grok Code" },
];
