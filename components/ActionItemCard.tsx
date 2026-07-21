'use client';

import { memo, useState, useRef, KeyboardEvent } from 'react';
import { ActionItem } from '../lib/types';
import { addToGoogleTasks, removeFromGoogleTasks } from '../lib/googleTasks';
import { buildGoogleCalendarUrl } from '../lib/calendar';

const PRIORITY_STRIP: Record<string, string> = {
  high:   'bg-[#ef4444]',
  medium: 'bg-[#f59e0b]',
  low:    'bg-[#10b981]',
};

const BADGE: Record<string, string> = {
  high:   'bg-[#fee2e2] text-[#dc2626]',
  medium: 'bg-[#fef3c7] text-[#d97706]',
  low:    'bg-[#d1fae5] text-[#059669]',
};

const PRIORITIES = ['high', 'medium', 'low'] as const;

interface Props {
  item: ActionItem;
  onChange: (updated: ActionItem) => void;
  onDelete: (id: string) => void;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81 3.34 11.22a.25.25 0 00-.065.108l-.647 2.268 2.268-.647a.25.25 0 00.108-.065L11.19 6.25z" />
    </svg>
  );
}

function TaskExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.5 8.2l1.8 1.8 3.2-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" />
      <path d="M2 6.5h12M5 2v2.5M11 2v2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8.5l3.2 3.2L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function ActionItemCard({ item, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActionItem>(item);
  const [newTaskText, setNewTaskText] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const newTaskRef = useRef<HTMLInputElement>(null);

  const synced = Boolean(item.googleTaskId);

  const toggleGoogleTask = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    setExportError('');
    try {
      if (item.googleTaskId) {
        await removeFromGoogleTasks(item.googleTaskId);
        onChange({ ...item, googleTaskId: undefined });
      } else {
        const taskId = await addToGoogleTasks(item);
        onChange({ ...item, googleTaskId: taskId });
      }
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Google Tasks sync failed');
    } finally {
      setExportBusy(false);
    }
  };

  const toggleDone = () => onChange({ ...item, done: !item.done });
  const toggleSubTask = (i: number) =>
    onChange({
      ...item,
      tasks: item.tasks.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)),
    });

  const startEdit = () => {
    setDraft({ ...item, tasks: item.tasks.map(t => ({ ...t })) });
    setNewTaskText('');
    setEditing(true);
  };

  const save = () => {
    onChange({
      ...draft,
      title: draft.title.trim() || item.title,
      tasks: draft.tasks.filter(t => t.task.trim()),
    });
    setEditing(false);
  };

  const addSubTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    setDraft({ ...draft, tasks: [...draft.tasks, { task: text, done: false }] });
    setNewTaskText('');
    newTaskRef.current?.focus();
  };

  const handleNewTaskKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubTask(); }
  };

  /* ── VIEW MODE ── */
  if (!editing) {
    const allDone = item.tasks.length > 0 && item.tasks.every(t => t.done);
    const faded = item.done || allDone;

    return (
      <div className={`relative bg-white border border-[#ede9fe] rounded-2xl mb-3 overflow-hidden shadow-[0_2px_8px_rgba(124,58,237,0.07)] transition-opacity ${faded ? 'opacity-40' : ''}`}>
        {/* Priority strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_STRIP[item.priority] ?? PRIORITY_STRIP.medium}`} />

        <div className="pl-5 pr-4 py-4">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.done}
              onChange={toggleDone}
              className="mt-[2px] flex-shrink-0 w-[15px] h-[15px] accent-[#7c3aed] cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-[15px] leading-snug text-[#1e1b4b] ${item.done ? 'line-through text-[#9ca3af]' : ''}`}>
                  {item.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide ${BADGE[item.priority] ?? BADGE.medium}`}>
                  {item.priority}
                </span>
              </div>
              {item.time && (
                <p className="text-[11px] text-[#9ca3af] mt-0.5">{formatTime12h(item.time)}</p>
              )}
              {item.description && (
                <p className="text-[12.5px] text-[#6b7280] mt-1 leading-relaxed">{item.description}</p>
              )}
              {item.threadUrl && (
                <a
                  href={item.threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1.5 text-[11.5px] font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
                >
                  Continue in Claude →
                </a>
              )}
            </div>
            <button
              onClick={() => window.open(buildGoogleCalendarUrl(item), '_blank', 'noopener,noreferrer')}
              className="flex-shrink-0 text-[#9ca3af] hover:text-[#7c3aed] transition-colors p-1"
              aria-label="Add to Google Calendar"
            >
              <CalendarExportIcon />
            </button>
            <button
              onClick={toggleGoogleTask}
              disabled={exportBusy}
              className={`flex-shrink-0 transition-colors p-1 disabled:opacity-40 ${
                synced
                  ? 'text-[#10b981] hover:text-[#dc2626]'
                  : 'text-[#9ca3af] hover:text-[#7c3aed]'
              }`}
              aria-label={synced ? 'Remove from Google Tasks' : 'Export to Google Tasks'}
            >
              {synced ? <CheckIcon /> : <TaskExportIcon />}
            </button>
            <button
              onClick={startEdit}
              className="flex-shrink-0 text-[#9ca3af] hover:text-[#7c3aed] transition-colors p-1 -mr-1"
              aria-label="Edit"
            >
              <PencilIcon />
            </button>
          </div>

          {/* Sub-tasks */}
          {item.tasks.length > 0 && (
            <ul className="mt-3 space-y-2 ml-6">
              {item.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleSubTask(i)}
                    className="mt-[2px] flex-shrink-0 w-[14px] h-[14px] accent-[#7c3aed] cursor-pointer"
                  />
                  <span className={`text-[12.5px] leading-snug ${task.done ? 'line-through text-[#9ca3af]' : 'text-[#6b7280]'}`}>
                    {task.task}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {exportError && (
            <p className="mt-2.5 text-[11.5px] text-[#dc2626] bg-[#fee2e2] rounded-lg px-2.5 py-1.5">
              {exportError}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── EDIT MODE ── */
  return (
    <div className="relative bg-white border border-[#c4b5fd] rounded-2xl mb-3 overflow-hidden shadow-[0_2px_12px_rgba(124,58,237,0.12)]">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_STRIP[draft.priority] ?? PRIORITY_STRIP.medium}`} />

      <div className="pl-5 pr-4 py-4">
        {/* Title + priority + description */}
        <div className="flex items-start gap-3 mb-4">
          <input
            type="checkbox"
            checked={draft.done}
            onChange={() => setDraft({ ...draft, done: !draft.done })}
            className="mt-[10px] flex-shrink-0 w-[15px] h-[15px] accent-[#7c3aed] cursor-pointer"
          />
          <div className="flex-1 min-w-0 space-y-2.5">
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-[#faf8ff] border border-[#ddd6fe] rounded-xl px-3 py-2 text-[14px] font-semibold text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 placeholder:text-[#9ca3af]"
              placeholder="Action item title"
            />
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setDraft({ ...draft, priority: p })}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-all ${
                    draft.priority === p
                      ? BADGE[p]
                      : 'bg-[#f3f4f6] text-[#9ca3af] hover:bg-[#e5e7eb]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
              className="w-full bg-[#faf8ff] border border-[#ddd6fe] rounded-xl px-3 py-2 text-[12.5px] text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 resize-none placeholder:text-[#9ca3af]"
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={draft.date}
                onChange={e => setDraft({ ...draft, date: e.target.value })}
                className="flex-1 bg-[#faf8ff] border border-[#ddd6fe] rounded-xl px-3 py-2 text-[12.5px] text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25"
              />
              <input
                type="time"
                value={draft.time ?? ''}
                onChange={e => setDraft({ ...draft, time: e.target.value || undefined })}
                className="flex-1 bg-[#faf8ff] border border-[#ddd6fe] rounded-xl px-3 py-2 text-[12.5px] text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25"
              />
            </div>
          </div>
        </div>

        {/* Sub-tasks */}
        <div className="ml-6 space-y-2 mb-4">
          {draft.tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() =>
                  setDraft({
                    ...draft,
                    tasks: draft.tasks.map((t, idx) => idx === i ? { ...t, done: !t.done } : t),
                  })
                }
                className="flex-shrink-0 w-[14px] h-[14px] accent-[#7c3aed] cursor-pointer"
              />
              <input
                type="text"
                value={task.task}
                onChange={e =>
                  setDraft({
                    ...draft,
                    tasks: draft.tasks.map((t, idx) => idx === i ? { ...t, task: e.target.value } : t),
                  })
                }
                className="flex-1 bg-[#faf8ff] border border-[#ddd6fe] rounded-xl px-3 py-1.5 text-[12.5px] text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25"
              />
              <button
                onClick={() => setDraft({ ...draft, tasks: draft.tasks.filter((_, idx) => idx !== i) })}
                className="flex-shrink-0 text-[#9ca3af] hover:text-[#ef4444] transition-colors px-1 text-sm"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <div className="w-[14px] flex-shrink-0" />
            <input
              ref={newTaskRef}
              type="text"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={handleNewTaskKey}
              placeholder="Add sub-task…"
              className="flex-1 bg-transparent border border-dashed border-[#c4b5fd] rounded-xl px-3 py-1.5 text-[12.5px] text-[#6b7280] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#7c3aed]"
            />
            {newTaskText.trim() && (
              <button
                onClick={addSubTask}
                className="flex-shrink-0 text-[#7c3aed] hover:text-[#6d28d9] transition-colors text-sm font-medium px-1"
              >
                Add
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-6">
          <button
            onClick={save}
            className="flex-1 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-xs font-semibold py-2 rounded-xl active:scale-[0.98] transition-transform shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#6b7280] text-xs rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="px-3 py-2 text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-[#fee2e2] text-xs rounded-xl transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ActionItemCard);
