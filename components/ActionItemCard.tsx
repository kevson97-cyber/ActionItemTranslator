'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ActionItem } from '../lib/types';

const PRIORITY_STRIP: Record<string, string> = {
  high:   'bg-[#f87171]',
  medium: 'bg-[#fbbf24]',
  low:    'bg-[#34d399]',
};

const BADGE: Record<string, string> = {
  high:   'bg-red-950/50 text-[#f87171]',
  medium: 'bg-amber-950/50 text-[#fbbf24]',
  low:    'bg-emerald-950/50 text-[#34d399]',
};

const PRIORITY_BTN_ACTIVE: Record<string, string> = {
  high:   'bg-red-950/60 text-[#f87171]',
  medium: 'bg-amber-950/60 text-[#fbbf24]',
  low:    'bg-emerald-950/60 text-[#34d399]',
};

const PRIORITIES = ['high', 'medium', 'low'] as const;

interface Props {
  item: ActionItem;
  onChange: (updated: ActionItem) => void;
  onDelete: () => void;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81 3.34 11.22a.25.25 0 00-.065.108l-.647 2.268 2.268-.647a.25.25 0 00.108-.065L11.19 6.25z" />
    </svg>
  );
}

export default function ActionItemCard({ item, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActionItem>(item);
  const [newTaskText, setNewTaskText] = useState('');
  const newTaskRef = useRef<HTMLInputElement>(null);

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
      <div className={`relative bg-[#0d1117] border border-white/[0.06] rounded-2xl mb-3 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.4)] transition-opacity ${faded ? 'opacity-40' : ''}`}>
        {/* Priority strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_STRIP[item.priority] ?? PRIORITY_STRIP.medium}`} />

        <div className="pl-5 pr-4 py-4">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.done}
              onChange={toggleDone}
              className="mt-[2px] flex-shrink-0 w-[15px] h-[15px] accent-[#4f8ef7] cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-[15px] leading-snug text-[#e8edf5] ${item.done ? 'line-through text-white/30' : ''}`}>
                  {item.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide ${BADGE[item.priority] ?? BADGE.medium}`}>
                  {item.priority}
                </span>
              </div>
              {item.description && (
                <p className="text-[12.5px] text-white/40 mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
            <button
              onClick={startEdit}
              className="flex-shrink-0 text-white/15 hover:text-white/50 transition-colors p-1 -mr-1"
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
                    className="mt-[2px] flex-shrink-0 w-[14px] h-[14px] accent-[#4f8ef7] cursor-pointer"
                  />
                  <span className={`text-[12.5px] leading-snug ${task.done ? 'line-through text-white/20' : 'text-white/60'}`}>
                    {task.task}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  /* ── EDIT MODE ── */
  return (
    <div className="relative bg-[#0d1117] border border-[#4f8ef7]/25 rounded-2xl mb-3 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${PRIORITY_STRIP[draft.priority] ?? PRIORITY_STRIP.medium}`} />

      <div className="pl-5 pr-4 py-4">
        {/* Title + priority + description */}
        <div className="flex items-start gap-3 mb-4">
          <input
            type="checkbox"
            checked={draft.done}
            onChange={() => setDraft({ ...draft, done: !draft.done })}
            className="mt-[10px] flex-shrink-0 w-[15px] h-[15px] accent-[#4f8ef7] cursor-pointer"
          />
          <div className="flex-1 min-w-0 space-y-2.5">
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-[#07090f] border border-white/[0.08] rounded-xl px-3 py-2 text-[14px] font-semibold text-[#e8edf5] focus:outline-none focus:ring-1 focus:ring-[#4f8ef7]/40 placeholder:text-white/20"
              placeholder="Action item title"
            />
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setDraft({ ...draft, priority: p })}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-all ${
                    draft.priority === p
                      ? PRIORITY_BTN_ACTIVE[p]
                      : 'bg-white/[0.05] text-white/25 hover:bg-white/[0.09]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
              className="w-full bg-[#07090f] border border-white/[0.08] rounded-xl px-3 py-2 text-[12.5px] text-white/60 focus:outline-none focus:ring-1 focus:ring-[#4f8ef7]/40 resize-none placeholder:text-white/20"
              placeholder="Description (optional)"
              rows={2}
            />
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
                className="flex-shrink-0 w-[14px] h-[14px] accent-[#4f8ef7] cursor-pointer"
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
                className="flex-1 bg-[#07090f] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[12.5px] text-[#e8edf5] focus:outline-none focus:ring-1 focus:ring-[#4f8ef7]/40"
              />
              <button
                onClick={() => setDraft({ ...draft, tasks: draft.tasks.filter((_, idx) => idx !== i) })}
                className="flex-shrink-0 text-white/20 hover:text-[#f87171] transition-colors px-1 text-sm"
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
              className="flex-1 bg-transparent border border-dashed border-white/[0.08] rounded-xl px-3 py-1.5 text-[12.5px] text-white/40 placeholder:text-white/20 focus:outline-none focus:border-[#4f8ef7]/35 focus:text-white/70"
            />
            {newTaskText.trim() && (
              <button
                onClick={addSubTask}
                className="flex-shrink-0 text-[#4f8ef7]/70 hover:text-[#4f8ef7] transition-colors text-sm font-medium px-1"
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
            className="flex-1 bg-gradient-to-r from-[#4f8ef7] to-[#6366f1] text-white text-xs font-semibold py-2 rounded-xl active:scale-[0.98] transition-transform"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.09] text-white/40 text-xs rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-[#f87171]/50 hover:text-[#f87171] hover:bg-red-950/30 text-xs rounded-xl transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
