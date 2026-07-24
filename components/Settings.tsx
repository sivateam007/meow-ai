"use client";

import { useState } from "react";
import { Settings as SettingsType, AVAILABLE_MODELS, DEFAULT_SETTINGS } from "@/lib/types";

interface SettingsProps {
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
  onClose: () => void;
}

export default function Settings({ settings, onSave, onClose }: SettingsProps) {
  const [local, setLocal] = useState<SettingsType>({ ...settings });

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
