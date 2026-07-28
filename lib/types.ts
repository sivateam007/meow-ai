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
  webSearch: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "big-pickle",
  temperature: 0.7,
  maxTokens: 2048,
  webSearch: false,
};

export const AVAILABLE_MODELS = [
  { id: "big-pickle", name: "Whiskers" },
  { id: "deepseek-v4-flash-free", name: "Shadow" },
  { id: "mimo-v2.5-free", name: "Mittens" },
  { id: "ling-3.0-flash-free", name: "Luna" },
  { id: "nemotron-3-ultra-free", name: "Simba" },
  { id: "north-mini-code-free", name: "Oreo" },
  { id: "laguna-s-2.1-free", name: "Nala" },
];
