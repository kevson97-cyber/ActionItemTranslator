'use client';

import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setOpenrouterKey(loadSettings().openrouterKey);
      setSaved(false);
    }
  }, [open]);

  const save = () => {
    saveSettings({ openrouterKey: openrouterKey.trim() });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 pb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">API Key</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>

        <p className="text-xs text-white/40 mb-5 leading-relaxed">
          Your key is stored only on this device and sent only to OpenRouter when analysing text.
        </p>

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
          disabled={!openrouterKey.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
        >
          {saved ? '✓ Saved' : 'Save Key'}
        </button>
      </div>
    </div>
  );
}
