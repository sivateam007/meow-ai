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
  { id: "big-pickle", name: "Whiskers (Big Pickle)" },
  { id: "hy3-free", name: "Bolt (Hy3 Free)" },
  { id: "mimo-v2.5-free", name: "Mittens (MiMo V2.5)" },
  { id: "nemotron-3-ultra-free", name: "Simba (Nemotron 3 Ultra)" },
  { id: "nemotron-3.5-lightning-free", name: "Flash (Nemotron 3.5 Lightning)" },
  { id: "deepseek-v4-flash-free", name: "Shadow (DeepSeek V4)" },
  { id: "laguna-s-2.1-free", name: "Nala (Laguna S 2.1)" },
  { id: "muse-spark-1.2-contributor-free", name: "Spark (Muse Spark 1.2)" },
];
