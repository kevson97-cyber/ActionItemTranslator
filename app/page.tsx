'use client';

import { useState, useEffect } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import ActionItemCard from '../components/ActionItemCard';
import SettingsModal from '../components/SettingsModal';
import DateStrip from '../components/DateStrip';
import { ActionItem } from '../lib/types';
import { loadItems, saveItems, loadSettings, hasSettings } from '../lib/storage';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

export default function Home() {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ openrouterKey: '' });
  const [selectedDate, setSelectedDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setItems(loadItems());
    const s = loadSettings();
    setSettings(s);
    if (!hasSettings()) setSettingsOpen(true);
    setSelectedDate(todayISO());
  }, []);

  const refreshSettings = () => setSettings(loadSettings());

  /* ── date helpers ── */
  const effectiveDate = selectedDate || todayISO();

  const itemCountByDate = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.date] = (acc[item.date] ?? 0) + 1;
    return acc;
  }, {});

  const dateItems = items.filter(i => i.date === effectiveDate);
  const sorted = [...dateItems].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  );

  /* ── actions ── */
  const analyze = async () => {
    if (!text.trim() || loading) return;
    if (!settings.openrouterKey) { setSettingsOpen(true); return; }
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
        (item: Omit<ActionItem, 'id' | 'createdAt' | 'done' | 'date'>) => ({
          id: uid(),
          title: item.title,
          description: item.description,
          priority: item.priority,
          done: false,
          tasks: item.tasks,
          createdAt: new Date().toISOString(),
          date: effectiveDate,
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

  const updateItem = (updated: ActionItem) => {
    const next = items.map(item => item.id === updated.id ? updated : item);
    setItems(next);
    saveItems(next);
  };

  const deleteItem = (id: string) => {
    const next = items.filter(item => item.id !== id);
    setItems(next);
    saveItems(next);
  };

  const clear = () => {
    const next = items.filter(i => i.date !== effectiveDate);
    setItems(next);
    saveItems(next);
    setText('');
  };

  const exportMd = () => {
    const md = sorted
      .map(
        (item, i) =>
          `### ${i + 1}. ${item.title}\n**Priority:** ${item.priority}\n${item.description}` +
          (item.tasks.length
            ? '\n' + item.tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.task}`).join('\n')
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

  const nHigh   = dateItems.filter(i => i.priority === 'high').length;
  const nMedium = dateItems.filter(i => i.priority === 'medium').length;
  const nLow    = dateItems.filter(i => i.priority === 'low').length;
  const keysConfigured = Boolean(settings.openrouterKey);
  const today = todayISO();

  return (
    <>
      <main className="max-w-[640px] mx-auto px-4 pt-6 pb-24">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#e8edf5]">Action Items</h1>
            <p className="text-[13px] text-white/30 mt-0.5">{formatDate(effectiveDate)}</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`mt-0.5 p-2 rounded-xl transition-colors ${
              keysConfigured
                ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.05]'
                : 'text-[#4f8ef7] hover:bg-[#4f8ef7]/10 animate-pulse'
            }`}
            aria-label="Settings"
          >
            <GearIcon />
          </button>
        </div>

        {/* ── Keys warning ── */}
        {!keysConfigured && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full mb-5 flex items-center gap-3 px-4 py-3 bg-[#4f8ef7]/[0.07] border border-[#4f8ef7]/20 rounded-2xl text-[#4f8ef7]/80 text-sm hover:bg-[#4f8ef7]/[0.11] transition-colors text-left"
          >
            <span>🔑</span>
            <span>Add your OpenRouter API key to get started</span>
          </button>
        )}

        {/* ── Date strip ── */}
        <DateStrip
          selectedDate={effectiveDate}
          onSelect={setSelectedDate}
          itemCountByDate={itemCountByDate}
          weekOffset={weekOffset}
          onWeekChange={delta => setWeekOffset(w => w + delta)}
          onResetToToday={() => { setWeekOffset(0); setSelectedDate(today); }}
        />

        {/* ── Divider ── */}
        <div className="h-px bg-white/[0.05] my-5" />

        {/* ── Input ── */}
        <VoiceRecorder currentText={text} onTextChange={setText} />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze(); }}
          placeholder="Paste meeting notes, voice memo, or a task list…"
          className="w-full h-36 bg-[#0a0e18] border border-white/[0.07] rounded-2xl p-4 text-sm text-[#e8edf5] placeholder:text-white/18 resize-none focus:outline-none focus:ring-1 focus:ring-[#4f8ef7]/35 mb-3 leading-relaxed"
        />

        <div className="flex gap-2.5 mb-6">
          <button
            onClick={analyze}
            disabled={!text.trim() || loading}
            className="flex-1 bg-gradient-to-r from-[#4f8ef7] to-[#6366f1] text-white font-semibold text-sm py-3 rounded-2xl disabled:opacity-30 transition-opacity active:scale-[0.98]"
          >
            {loading ? 'Analysing…' : '⚡ Extract Action Items'}
          </button>
          <button
            onClick={clear}
            className="px-5 py-3 bg-white/[0.05] text-white/35 hover:text-white/60 hover:bg-white/[0.08] text-sm rounded-2xl transition-colors active:scale-[0.98]"
          >
            Clear
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-950/25 border border-red-500/15 rounded-2xl p-3.5 mb-4 text-[#f87171] text-sm">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {sorted.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-semibold text-white/20 uppercase tracking-widest">
                  {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
                </span>
                <div className="flex gap-1.5">
                  {nHigh > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/50 text-[#f87171]">
                      {nHigh} high
                    </span>
                  )}
                  {nMedium > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/50 text-[#fbbf24]">
                      {nMedium} mid
                    </span>
                  )}
                  {nLow > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/50 text-[#34d399]">
                      {nLow} low
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={exportMd}
                className="text-[11px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]"
              >
                Export ↓
              </button>
            </div>

            {sorted.map(item => (
              <ActionItemCard
                key={item.id}
                item={item}
                onChange={updateItem}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </>
        )}

        {sorted.length === 0 && keysConfigured && (
          <div className="text-center py-16">
            <p className="text-white/12 text-sm">No items for this day</p>
            {effectiveDate !== today && (
              <button
                onClick={() => { setSelectedDate(today); setWeekOffset(0); }}
                className="mt-3 text-[#4f8ef7]/40 text-xs hover:text-[#4f8ef7]/70 transition-colors"
              >
                Go to today →
              </button>
            )}
          </div>
        )}

      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); refreshSettings(); }}
      />
    </>
  );
}
