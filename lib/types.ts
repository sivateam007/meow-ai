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
  model: "space-bunny-free",
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
 * a fallback attempt. The count of cats is therefore capped by the count of
 * models the provider actually offers.
 *
 * Luna is first because it is the default and the only model in this list
 * confirmed to answer; the others are currently refused by the provider with
 * 403 and are kept only so the fallback chain can try them if that changes.
 */
export const AVAILABLE_MODELS = [
  { id: "space-bunny-free", name: "Luna", personality: "Calm and dependable — the one that always answers." },
  { id: "big-pickle", name: "Whiskers", personality: "Warm and thoughtful — gives clear, detailed explanations." },
  { id: "nemotron-3.5-lightning-free", name: "Flash", personality: "Quick-witted and energetic — snappy responses with a lively tone." },
  { id: "muse-spark-1.3-contributor-free", name: "Spark", personality: "Bright and insightful — sparks new ideas and connections." },
  { id: "muse-spark-1.2-contributor-free", name: "Ember", personality: "Fresh and inventive — refines an idea with a newer perspective." },
];

export function getModelById(id: string) {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}

export function isAvailableModel(id: string): boolean {
  return AVAILABLE_MODELS.some((m) => m.id === id);
}
