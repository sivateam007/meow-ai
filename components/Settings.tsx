"use client";

import { useState, useEffect, ReactNode } from "react";
import { Settings as SettingsType, AVAILABLE_MODELS, DEFAULT_SETTINGS } from "@/lib/types";

function getTodayUsage(): string {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const tokens = parseInt(localStorage.getItem(`meow_usage_${day}`) || "0", 10) || 0;
    if (tokens < 1000) return `${tokens} tokens`;
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } catch {
    return "unavailable";
  }
}

interface SettingsProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
  onClose: () => void;
}

interface VoiceOption {
  name: string;
  lang: string;
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: "ta-IN", label: "Tamil" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ru-RU", label: "Russian" },
];

const FEMALE_HINTS = [
  "google", "samantha", "zira", "aria", "jenny", "allison", "ava", "emma",
  "susan", "victoria", "karen", "moira", "tessa", "veena", "swara", "neerja",
  "shilpa", "lekha", "heera", "leela", "heather", "sarah", "fiona", "kate",
];

function langLabel(code: string): string {
  const base = code.split("-")[0].toLowerCase();
  const found = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (found) return found.label;
  const langs: Record<string, string> = {
    en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada",
    ml: "Malayalam", bn: "Bengali", mr: "Marathi", gu: "Gujarati", pa: "Punjabi",
    es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
    zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", ru: "Russian",
  };
  return langs[base] || code;
}

function isFemaleVoice(name: string): boolean {
  const n = name.toLowerCase();
  return FEMALE_HINTS.some((h) => n.includes(h));
}

function testSpeak(
  voiceName: string | undefined,
  lang: string | undefined,
  rate: number,
  pitch: number,
  volume: number
) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance("Hello! This is how I sound in Meow AI.");
  const avail = window.speechSynthesis.getVoices();
  const preferred =
    avail.find((v) => v.name === voiceName) ||
    (lang ? avail.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase())) : undefined);
  if (preferred) u.voice = preferred;
  else if (lang) u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;
  window.speechSynthesis.speak(u);
}

function groupVoices(list: VoiceOption[]): Map<string, VoiceOption[]> {
  const map = new Map<string, VoiceOption[]>();
  for (const v of list) {
    const key = v.lang.split("-")[0].toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return map;
}

export default function Settings({ settings, onSave, onClose }: SettingsProps) {
  const [local, setLocal] = useState<SettingsType>({ ...settings });
  const [todayUsage, setTodayUsage] = useState("…");
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    setTodayUsage(getTodayUsage());
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const opts: VoiceOption[] = window.speechSynthesis.getVoices().map((v) => ({
        name: v.name,
        lang: v.lang,
      }));
      setVoices(opts);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
            <select
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
              className="w-full bg-[#1e1b2e] border border-[#3b3558] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#7c3aed] transition-colors"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              {AVAILABLE_MODELS.find((m) => m.id === local.model)?.personality}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {local.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={local.temperature}
              onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
              className="w-full accent-[#7c3aed]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens: {local.maxTokens}
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={local.maxTokens}
              onChange={(e) => setLocal({ ...local, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-[#7c3aed]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>

          <div className="border-t border-[#3b3558] pt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Read-aloud language
            </label>
            <select
              value={local.voiceLang || "auto"}
              onChange={(e) => {
                const v = e.target.value === "auto" ? undefined : e.target.value;
                setLocal({ ...local, voiceLang: v });
              }}
              className="w-full bg-[#1e1b2e] border border-[#3b3558] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#7c3aed] transition-colors"
            >
              <option value="auto">Auto-detect (Tamil, Hindi, English…)</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voice{local.voice ? ` — ${local.voice}` : ""}
              </label>
              <select
                value={local.voice || ""}
                onChange={(e) => {
                  const opt = voices.find((v) => v.name === e.target.value);
                  setLocal({ ...local, voice: e.target.value || undefined, voiceLang: opt?.lang || local.voiceLang });
                }}
                className="w-full bg-[#1e1b2e] border border-[#3b3558] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#7c3aed] transition-colors"
              >
                <option value="">Automatic (match language)</option>
                {(() => {
                  const grouped = groupVoices(voices);
                  const out: ReactNode[] = [];
                  grouped.forEach((group, base) => {
                    out.push(
                      <optgroup key={base} label={langLabel(base)}>
                        {group.map((v) => (
                          <option key={v.name} value={v.name}>
                            {isFemaleVoice(v.name) ? "♀ " : ""}{v.name}
                            {isFemaleVoice(v.name) ? " (female)" : ""}
                          </option>
                        ))}
                      </optgroup>
                    );
                  });
                  return out;
                })()}
              </select>
              {voices.length === 0 && (
                <p className="mt-1.5 text-xs text-gray-500">No voices detected on this device.</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Tamil works only if a ta-IN voice is installed on your device.</p>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Speed: {local.voiceRate?.toFixed(1) ?? "1.0"}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={local.voiceRate ?? 1}
                  onChange={(e) => setLocal({ ...local, voiceRate: parseFloat(e.target.value) })}
                  className="w-full accent-[#7c3aed]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pitch: {local.voicePitch?.toFixed(1) ?? "1.0"}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={local.voicePitch ?? 1}
                  onChange={(e) => setLocal({ ...local, voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-[#7c3aed]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volume: {Math.round((local.voiceVolume ?? 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={local.voiceVolume ?? 1}
                  onChange={(e) => setLocal({ ...local, voiceVolume: parseFloat(e.target.value) })}
                  className="w-full accent-[#7c3aed]"
                />
              </div>
            </div>

            <button
              onClick={() => testSpeak(local.voice, local.voiceLang, local.voiceRate ?? 1, local.voicePitch ?? 1, local.voiceVolume ?? 1)}
              className="mt-4 w-full py-2 rounded-xl border border-[#a78bfa]/40 text-[#a78bfa] text-sm hover:bg-[#3d3760] transition-colors"
            >
              Test voice
            </button>
          </div>

          <div className="border border-[#3b3558] rounded-xl px-4 py-3 bg-[#13111c]/60">
            <p className="text-xs text-gray-400">
              Estimated usage today (this device):{" "}
              <span className="text-white font-semibold">{todayUsage}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setLocal({ ...DEFAULT_SETTINGS }); }}
            className="flex-1 py-2.5 rounded-xl border border-[#3b3558] text-gray-400 text-sm hover:bg-[#3d3760] transition-colors"
          >
            Reset Default
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#a78bfa] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
