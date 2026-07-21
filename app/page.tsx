'use client';

import { useState, useEffect, useMemo, useCallback, useRef, ChangeEvent } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import ActionItemCard from '../components/ActionItemCard';
import SettingsModal from '../components/SettingsModal';
import { ActionItem } from '../lib/types';
import { loadItems, saveItems, loadSettings, hasSettings } from '../lib/storage';
import { seedCurriculum } from '../lib/curriculum';
import { todayISO, formatLongDate } from '../lib/date';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/* Downscale a photo client-side so the upload stays small enough for the API */
function imageToDataUrl(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not process image')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h2l1.2-1.8a1 1 0 0 1 .83-.45h3.94a1 1 0 0 1 .83.45L14 5h2a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-8z" strokeLinejoin="round" />
      <circle cx="10" cy="10.2" r="3" />
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
  const [loaded, setLoaded] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedCurriculum();
    setItems(loadItems());
    const s = loadSettings();
    setSettings(s);
    if (!hasSettings()) setSettingsOpen(true);
    setSelectedDate(todayISO());
    setLoaded(true);
  }, []);

  // Persist on every change to items. Gated on `loaded` so we never overwrite
  // stored items with the empty starting state (safe under StrictMode, which
  // re-runs effects but leaves `loaded` false until the mount effect has run).
  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  const refreshSettings = () => setSettings(loadSettings());

  const today = todayISO();
  const effectiveDate = selectedDate || today;

  const dateItems = useMemo(
    () => items.filter(i => i.date === effectiveDate),
    [items, effectiveDate]
  );
  const sorted = useMemo(
    () =>
      [...dateItems].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
      ),
    [dateItems]
  );

  /* ── actions ── */
  const runAnalysis = async (payload: { text?: string; image?: string }): Promise<boolean> => {
    if (loading) return false;
    if (!settings.openrouterKey) { setSettingsOpen(true); return false; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': settings.openrouterKey,
        },
        body: JSON.stringify(payload),
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

      setItems(prev => [...newItems, ...prev]);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!text.trim()) return;
    if (await runAnalysis({ text })) setText('');
  };

  const onPhotoPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-taking the same photo
    if (!file) return;
    try {
      const image = await imageToDataUrl(file);
      await runAnalysis({ image });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not read image');
    }
  };

  // Stable identity (functional updaters, no `items` closure) so the memoized
  // ActionItemCards don't re-render when unrelated state (e.g. the textarea)
  // changes.
  const updateItem = useCallback((updated: ActionItem) => {
    setItems(prev => prev.map(item => item.id === updated.id ? updated : item));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearText = () => setText('');

  const clearItems = () => {
    setItems(prev => prev.filter(i => i.date !== effectiveDate));
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

  const { nHigh, nMedium, nLow } = useMemo(() => {
    const counts = { nHigh: 0, nMedium: 0, nLow: 0 };
    for (const i of dateItems) {
      if (i.priority === 'high') counts.nHigh++;
      else if (i.priority === 'medium') counts.nMedium++;
      else if (i.priority === 'low') counts.nLow++;
    }
    return counts;
  }, [dateItems]);
  const keysConfigured = Boolean(settings.openrouterKey);

  return (
    <>
      <main className="max-w-[640px] mx-auto px-4 pt-8 pb-24">

        {/* ── Header ── */}
        <div className="relative text-center mb-7">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading}
            className="absolute left-0 top-0 p-2 rounded-xl transition-colors text-[#1e1b4b]/25 hover:text-[#1e1b4b]/55 hover:bg-[#1e1b4b]/[0.05] disabled:opacity-40"
            aria-label="Capture photo"
          >
            <CameraIcon />
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoPicked}
            className="hidden"
          />
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
            <span className="text-[13px] text-[#1e1b4b]/80 select-none">{formatLongDate(effectiveDate)}</span>
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
                onDelete={deleteItem}
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
              This will remove all items for {formatLongDate(effectiveDate)}. This can&apos;t be undone.
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
