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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-[#0d1117] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
        {/* Handle bar (mobile) */}
        <div className="w-9 h-1 bg-white/10 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#e8edf5]">API Key</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-white/35 mb-5 leading-relaxed">
          Stored only on this device. Sent to OpenRouter only when analysing text.
        </p>

        <label className="block mb-6">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-2">
            OpenRouter API Key
          </span>
          <input
            type="password"
            value={openrouterKey}
            onChange={e => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-[#07090f] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-[#e8edf5] placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#4f8ef7]/40 transition-shadow"
          />
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#4f8ef7]/50 mt-1.5 inline-block hover:text-[#4f8ef7]/80 transition-colors"
          >
            Get a free key at openrouter.ai →
          </a>
        </label>

        <button
          onClick={save}
          disabled={!openrouterKey.trim()}
          className="w-full bg-gradient-to-r from-[#4f8ef7] to-[#6366f1] text-white font-semibold text-sm py-3 rounded-2xl disabled:opacity-30 transition-all active:scale-[0.98]"
        >
          {saved ? '✓ Saved' : 'Save Key'}
        </button>
      </div>
    </div>
  );
}
