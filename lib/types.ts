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
  { id: "hy3-free", name: "Bolt" },
  { id: "mimo-v2.5-free", name: "Mittens" },
  { id: "nemotron-3-ultra-free", name: "Simba" },
  { id: "nemotron-3.5-lightning-free", name: "Flash" },
  { id: "deepseek-v4-flash-free", name: "Shadow" },
  { id: "laguna-s-2.1-free", name: "Nala" },
  { id: "muse-spark-1.2-contributor-free", name: "Spark" },
];
