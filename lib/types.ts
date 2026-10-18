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
 * Every `id` here must be verified against the provider's live model list
 * before it ships — an id the provider has retired returns 404/410 and wastes
 * a fallback attempt.
 *
 * These ids come from OpenRouter's free tier, which unlike OpenCode's is not
 * restricted to calls made from inside their own app. Nemotron appears three
 * times because it is the family this app was originally built around; the
 * ids are OpenRouter's, so they carry the `:free` suffix and the vendor
 * prefix.
 */
export const AVAILABLE_MODELS = [
  { id: "nvidia/nemotron-3.5-lightning:free", name: "Flash", personality: "Quick-witted and energetic — snappy responses with a lively tone." },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Whiskers", personality: "Warm and thoughtful — gives clear, detailed explanations." },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Spark", personality: "Bright and insightful — sparks new ideas and connections." },
  { id: "google/gemma-4-31b-it:free", name: "Ember", personality: "Fresh and inventive — refines an idea with a newer perspective." },
  { id: "thinkingmachines/inkling:free", name: "Luna", personality: "Calm and dependable — the one that always answers." },
];

export function getModelById(id: string) {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}

export function isAvailableModel(id: string): boolean {
  return AVAILABLE_MODELS.some((m) => m.id === id);
}
