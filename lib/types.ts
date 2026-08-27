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
  model?: string;
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
  { id: "big-pickle", name: "Whiskers", personality: "Warm and thoughtful — gives clear, detailed explanations." },
  { id: "hy3-free", name: "Bolt", personality: "Fast and sharp — concise answers that get straight to the point. Shows its reasoning." },
  { id: "mimo-v2.5-free", name: "Mittens", personality: "Playful and creative — loves analogies and vivid explanations." },
  { id: "nemotron-3-ultra-free", name: "Simba", personality: "Confident and comprehensive — thorough, well-structured deep dives." },
  { id: "nemotron-3.5-lightning-free", name: "Flash", personality: "Quick-witted and energetic — snappy responses with a lively tone." },
  { id: "deepseek-v4-flash-free", name: "Shadow", personality: "Mysterious and analytical — precise technical reasoning." },
  { id: "laguna-s-2.1-free", name: "Nala", personality: "Gentle and supportive — encouraging, patient guidance." },
  { id: "muse-spark-1.2-contributor-free", name: "Spark", personality: "Bright and insightful — sparks new ideas and connections." },
];

export function getModelById(id: string) {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}
