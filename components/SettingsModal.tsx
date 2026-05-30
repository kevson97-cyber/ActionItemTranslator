'use client';

import { useState, useEffect } from 'react';
import { loadSettings, saveSettings, type AppSettings } from '../lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [groqKey, setGroqKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const s = loadSettings();
      setGroqKey(s.groqKey);
      setOpenrouterKey(s.openrouterKey);
      setSaved(false);
    }
  }, [open]);

  const save = () => {
    saveSettings({ groqKey: groqKey.trim(), openrouterKey: openrouterKey.trim() });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const hasKeys = groqKey.trim() && openrouterKey.trim();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">API Keys</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>

        <p className="text-xs text-white/40 mb-5 leading-relaxed">
          Keys are stored only on this device and never sent to any server other than the respective API providers.
        </p>

        <label className="block mb-4">
          <span className="text-xs font-medium text-white/60 block mb-1.5">
            Groq API Key
            <span className="ml-1 text-white/30">· Whisper large-v3 transcription</span>
          </span>
          <input
            type="password"
            value={groqKey}
            onChange={(e) => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-[#161b27] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25"
          />
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-400/70 mt-1 inline-block hover:text-blue-400"
          >
            Get a free key at console.groq.com →
          </a>
        </label>

        <label className="block mb-6">
          <span className="text-xs font-medium text-white/60 block mb-1.5">
            OpenRouter API Key
            <span className="ml-1 text-white/30">· Qwen 3 analysis</span>
          </span>
          <input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-[#161b27] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25"
          />
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-400/70 mt-1 inline-block hover:text-blue-400"
          >
            Get a free key at openrouter.ai →
          </a>
        </label>

        <button
          onClick={save}
          disabled={!hasKeys}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
        >
          {saved ? '✓ Saved' : 'Save Keys'}
        </button>
      </div>
    </div>
  );
}
