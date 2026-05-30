'use client';

import { useState, useEffect } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import ActionItemCard from '../components/ActionItemCard';
import SettingsModal from '../components/SettingsModal';
import { ActionItem } from '../lib/types';
import { loadItems, saveItems, loadSettings, hasSettings } from '../lib/storage';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function Home() {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ groqKey: '', openrouterKey: '' });

  useEffect(() => {
    setItems(loadItems());
    const s = loadSettings();
    setSettings(s);
    if (!hasSettings()) setSettingsOpen(true);
  }, []);

  const refreshSettings = () => {
    setSettings(loadSettings());
  };

  const analyze = async () => {
    if (!text.trim() || loading) return;
    if (!settings.openrouterKey) {
      setSettingsOpen(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': settings.openrouterKey,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newItems: ActionItem[] = data.items.map(
        (item: Omit<ActionItem, 'id' | 'createdAt'>) => ({
          id: uid(),
          title: item.title,
          description: item.description,
          priority: item.priority,
          tasks: item.tasks,
          createdAt: new Date().toISOString(),
        })
      );

      const merged = [...newItems, ...items];
      setItems(merged);
      saveItems(merged);
      setText('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (itemId: string, taskIndex: number) => {
    const updated = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            tasks: item.tasks.map((t, i) =>
              i === taskIndex ? { ...t, done: !t.done } : t
            ),
          }
        : item
    );
    setItems(updated);
    saveItems(updated);
  };

  const clear = () => {
    setItems([]);
    setText('');
    saveItems([]);
  };

  const exportMd = () => {
    const md = sorted
      .map(
        (item, i) =>
          `### ${i + 1}. ${item.title}\n**Priority:** ${item.priority}\n${item.description}` +
          (item.tasks.length
            ? '\n' + item.tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.task}`).join('\n')
            : '')
      )
      .join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'action_items.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...items].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  );

  const nHigh = items.filter((i) => i.priority === 'high').length;
  const nMedium = items.filter((i) => i.priority === 'medium').length;
  const nLow = items.filter((i) => i.priority === 'low').length;
  const nTasks = items.reduce((s, i) => s + i.tasks.length, 0);
  const keysConfigured = Boolean(settings.groqKey && settings.openrouterKey);

  return (
    <>
      <main className="max-w-[680px] mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-0.5">✅ Action Item Translator</h1>
            <p className="text-xs text-white/35">Whisper large-v3 · Qwen 3</p>
          </div>
          <button
            onClick={() => { setSettingsOpen(true); }}
            className={`mt-1 p-2 rounded-lg text-lg transition-colors ${
              keysConfigured
                ? 'text-white/30 hover:text-white/60 hover:bg-white/5'
                : 'text-yellow-400 hover:bg-yellow-400/10 animate-pulse'
            }`}
            title="API Key Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Keys warning */}
        {!keysConfigured && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full mb-5 flex items-center gap-2 px-4 py-3 bg-yellow-950/40 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm hover:bg-yellow-950/60 transition-colors text-left"
          >
            <span className="text-base">🔑</span>
            <span>Tap to add your API keys and get started</span>
          </button>
        )}

        {/* Input */}
        <h2 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">Input</h2>

        <VoiceRecorder
          groqKey={settings.groqKey}
          onTranscript={(t) => setText((prev) => (prev ? `${prev}\n${t}` : t))}
          onNeedSettings={() => setSettingsOpen(true)}
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze();
          }}
          placeholder="Paste meeting notes, voice memo transcript, or a task list…"
          className="w-full h-40 bg-[#161b27] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 mb-3 leading-relaxed"
        />

        <div className="flex gap-2 mb-6">
          <button
            onClick={analyze}
            disabled={!text.trim() || loading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm py-2.5 rounded-lg disabled:opacity-40 transition-opacity active:scale-95"
          >
            {loading ? 'Analysing…' : '⚡ Extract Action Items'}
          </button>
          <button
            onClick={clear}
            className="px-4 py-2.5 bg-[#1e2535] text-white text-sm rounded-lg hover:bg-[#252d40] transition-colors active:scale-95"
          >
            🗑️ Clear
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {items.length > 0 && (
          <>
            <hr className="border-white/8 mb-4" />

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45 mb-3">
              <span>📋 {items.length} action items</span>
              <span>·</span>
              <span>🔴 {nHigh} high</span>
              <span>🟡 {nMedium} medium</span>
              <span>🟢 {nLow} low</span>
              {nTasks > 0 && (
                <>
                  <span>·</span>
                  <span>📌 {nTasks} sub-tasks</span>
                </>
              )}
            </div>

            <button
              onClick={exportMd}
              className="mb-4 px-3 py-1.5 bg-[#1e2535] text-white text-xs rounded-lg hover:bg-[#252d40] transition-colors"
            >
              ⬇️ Export Markdown
            </button>

            {sorted.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onToggleTask={(idx) => toggleTask(item.id, idx)}
              />
            ))}
          </>
        )}

        {items.length === 0 && !text && keysConfigured && (
          <p className="text-center text-white/20 text-sm py-12">
            Record your voice or paste text above, then tap ⚡ Extract Action Items
          </p>
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          refreshSettings();
        }}
      />
    </>
  );
}
