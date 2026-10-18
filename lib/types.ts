export interface FileAttachment {
  name: string;
  type: string;
  content: string;
}

export interface SearchSource {
  title: string;
  url: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
  model?: string;
  sources?: SearchSource[];
  analysis?: string;
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
  voice?: string;
  voiceLang?: string;
  voiceRate?: number;
  voicePitch?: number;
  voiceVolume?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "nvidia/nemotron-3.5-lightning:free",
  temperature: 0.7,
  maxTokens: 2048,
  webSearch: false,
  voiceRate: 1,
  voicePitch: 1,
  voiceVolume: 1,
};

/**
 * The model roster, one cat per model.
 *
 * Every id comes from OpenRouter's live /models listing and is confirmed
 * $0 for both prompt and completion. Vendor-prefixed and `:free`-suffixed
 * because that is OpenRouter's scheme.
 *
 * Nemotron dominates deliberately: it is the family this app was built around,
 * and OpenRouter carries five of them free. Models that are only free inside
 * OpenCode are absent — that gateway answers 403 FreeTierError to every
 * external caller, so its ids can never be reached from a website.
 *
 * Deliberately excluded: nemotron-3.5-content-safety (a classifier, not a
 * chat model) and the Google Lyria pair (music generation).
 */
export const AVAILABLE_MODELS = [
  { id: "nvidia/nemotron-3.5-lightning:free", name: "Flash", personality: "Quick-witted and energetic — snappy responses with a lively tone." },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Whiskers", personality: "Warm and thoughtful — gives clear, detailed explanations." },
  { id: "nvidia/nemotron-3.5-super-vl:free", name: "Spark", personality: "Bright and observant — reads images as readily as text." },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Ember", personality: "Steady and capable — a balanced all-rounder." },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Mochi", personality: "Small but sharp — thinks things through step by step." },
  { id: "google/gemma-4-31b-it:free", name: "Luna", personality: "Calm and dependable — the one that always answers." },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Sable", personality: "Sleek and quick — light on its feet, easy to talk to." },
  { id: "thinkingmachines/inkling:free", name: "Cleo", personality: "Curious and articulate — explains the why, not just the what." },
  { id: "thinkingmachines/inkling-small:free", name: "Nori", personality: "Nimble and plain-spoken — short answers, no fuss." },
  { id: "dots-studio/dots-3-note-preview:free", name: "Tofu", personality: "Gentle and curious — happy to explore ideas with you." },
];

export function getModelById(id: string) {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}

export function isAvailableModel(id: string): boolean {
  return AVAILABLE_MODELS.some((m) => m.id === id);
}
