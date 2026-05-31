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

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-[#7c3aed]/70 flex-shrink-0">
      <path d="M4.5 1a.5.5 0 0 1 .5.5V2h6v-.5a.5.5 0 0 1 1 0V2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1v-.5a.5.5 0 0 1 .5-.5zM2 5v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5H2z"/>
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setItems(loadItems());
    const s = loadSettings();
    setSettings(s);
    if (!hasSettings()) setSettingsOpen(true);
    setSelectedDate(todayISO());
  }, []);

  const refreshSettings = () => setSettings(loadSettings());

  const today = todayISO();
  const effectiveDate = selectedDate || today;

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

  const clearText = () => setText('');

  const clearItems = () => {
    const next = items.filter(i => i.date !== effectiveDate);
    setItems(next);
    saveItems(next);
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

  return (
    <>
      <main className="max-w-[640px] mx-auto px-4 pt-8 pb-24">

        {/* ── Header ── */}
        <div className="relative text-center mb-7">
          <button
            onClick={() => setSettingsOpen(true)}
            className={`absolute right-0 top-0 p-2 rounded-xl transition-colors ${
              keysConfigured
                ? 'text-[#1e1b4b]/25 hover:text-[#1e1b4b]/55 hover:bg-[#1e1b4b]/[0.05]'
                : 'text-[#7c3aed] hover:bg-[#7c3aed]/10 animate-pulse'
            }`}
            aria-label="Settings"
          >
            <GearIcon />
          </button>
          <h1 className="text-[30px] font-bold italic bg-gradient-to-r from-[#7c3aed] to-[#a855f7] bg-clip-text text-transparent font-[family-name:var(--font-playfair)]">
            Action Items
          </h1>
          <p className="text-[12px] text-[#6b7280] mt-1.5">Use voice or manual input for action items</p>
        </div>

        {/* ── Keys warning ── */}
        {!keysConfigured && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full mb-5 flex items-center gap-3 px-4 py-3 bg-[#ede9fe] border border-[#c4b5fd] rounded-2xl text-[#7c3aed] text-sm hover:bg-[#ddd6fe] transition-colors text-left"
          >
            <span>🔑</span>
            <span>Add your OpenRouter API key to get started</span>
          </button>
        )}

        {/* ── Input ── */}
        <VoiceRecorder currentText={text} onTextChange={setText} />

        <div className="relative mb-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze(); }}
            placeholder="Paste meeting notes, voice memo, or a task list…"
            className="w-full h-36 bg-[#faf8ff] border border-[#ddd6fe] rounded-2xl p-4 pr-8 text-sm text-[#1e1b4b] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 leading-relaxed"
          />
          {text && (
            <button
              onClick={clearText}
              className="absolute top-2.5 right-3 text-[#9ca3af] hover:text-[#6b7280] transition-colors text-sm leading-none"
              aria-label="Clear text"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Date picker ── */}
        <div className="flex items-center gap-2.5 mb-4">
          <label className="relative flex items-center gap-2 px-3 py-2 bg-white border border-[#ddd6fe] rounded-xl cursor-pointer hover:border-[#c4b5fd] transition-colors shadow-sm">
            <CalendarIcon />
            <span className="text-[13px] text-[#1e1b4b]/80 select-none">{formatDate(effectiveDate)}</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
          {effectiveDate !== today && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-xs text-[#7c3aed] hover:text-[#6d28d9] px-2.5 py-1.5 rounded-lg hover:bg-[#ede9fe] transition-colors font-medium"
            >
              Today
            </button>
          )}
        </div>

        {/* ── Analyze ── */}
        <button
          onClick={analyze}
          disabled={!text.trim() || loading}
          className="w-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white font-semibold text-sm py-3 rounded-2xl disabled:opacity-30 transition-opacity active:scale-[0.98] shadow-[0_4px_14px_rgba(124,58,237,0.35)] mb-6"
        >
          {loading ? 'Analysing…' : '⚡ Extract Action Items'}
        </button>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {sorted.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">
                  {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
                </span>
                <div className="flex gap-1.5">
                  {nHigh > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#dc2626]">
                      {nHigh} high
                    </span>
                  )}
                  {nMedium > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706]">
                      {nMedium} mid
                    </span>
                  )}
                  {nLow > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#059669]">
                      {nLow} low
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="text-[11px] font-semibold text-[#dc2626] bg-[#fee2e2] hover:bg-[#fecaca] px-3 py-1 rounded-full transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={exportMd}
                  className="text-[11px] font-semibold text-[#7c3aed] bg-[#ede9fe] hover:bg-[#ddd6fe] px-3 py-1 rounded-full transition-colors"
                >
                  Export ↓
                </button>
              </div>
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
            <p className="text-[#9ca3af] text-sm">No items for this day</p>
            {effectiveDate !== today && (
              <button
                onClick={() => setSelectedDate(today)}
                className="mt-3 text-[#7c3aed]/60 text-xs hover:text-[#7c3aed] transition-colors"
              >
                Go to today →
              </button>
            )}
          </div>
        )}

      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-[#1e1b4b]/20 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white border border-[#ede9fe] rounded-2xl p-6 w-full max-w-sm shadow-[0_8px_32px_rgba(124,58,237,0.15)]">
            <h3 className="text-[15px] font-semibold text-[#1e1b4b] mb-1">Clear action items?</h3>
            <p className="text-[13px] text-[#6b7280] mb-5">
              This will remove all items for {formatDate(effectiveDate)}. This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#6b7280] text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearItems(); setConfirmOpen(false); }}
                className="flex-1 px-4 py-2.5 bg-[#fee2e2] hover:bg-[#fecaca] text-[#dc2626] text-sm font-semibold rounded-xl transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); refreshSettings(); }}
      />
    </>
  );
}
