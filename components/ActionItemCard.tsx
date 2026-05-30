'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ActionItem } from '../lib/types';

const BADGE: Record<string, string> = {
  high: 'bg-red-950/60 text-red-400 border border-red-500/20',
  medium: 'bg-yellow-950/60 text-yellow-400 border border-yellow-500/20',
  low: 'bg-green-950/60 text-green-400 border border-green-500/20',
};

const PRIORITY_ACTIVE: Record<string, string> = {
  high: 'bg-red-950/60 text-red-400',
  medium: 'bg-yellow-950/60 text-yellow-400',
  low: 'bg-green-950/60 text-green-400',
};

const PRIORITIES = ['high', 'medium', 'low'] as const;

interface Props {
  item: ActionItem;
  onChange: (updated: ActionItem) => void;
  onDelete: () => void;
}

export default function ActionItemCard({ item, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActionItem>(item);
  const [newTaskText, setNewTaskText] = useState('');
  const newTaskRef = useRef<HTMLInputElement>(null);

  /* ── view-mode handlers (instant, no save needed) ── */
  const toggleDone = () => onChange({ ...item, done: !item.done });

  const toggleSubTask = (i: number) =>
    onChange({
      ...item,
      tasks: item.tasks.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)),
    });

  /* ── edit-mode helpers ── */
  const startEdit = () => {
    setDraft({ ...item, tasks: item.tasks.map((t) => ({ ...t })) });
    setNewTaskText('');
    setEditing(true);
  };

  const save = () => {
    const cleaned = {
      ...draft,
      title: draft.title.trim() || item.title,
      tasks: draft.tasks.filter((t) => t.task.trim()),
    };
    onChange(cleaned);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

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

  /* ════════════════════════════════════════════
     VIEW MODE
  ════════════════════════════════════════════ */
  if (!editing) {
    const allDone = item.tasks.length > 0 && item.tasks.every((t) => t.done);
    const faded = item.done || allDone;

    return (
      <div className={`bg-[#161b27] border border-white/5 rounded-xl p-4 mb-3 transition-opacity ${faded ? 'opacity-50' : ''}`}>
        {/* Main task row */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={item.done}
            onChange={toggleDone}
            className="mt-[3px] flex-shrink-0 w-[15px] h-[15px] accent-blue-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-[15px] leading-snug ${item.done ? 'line-through text-white/35' : ''}`}>
                {item.title}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${BADGE[item.priority] ?? BADGE.medium}`}>
                {item.priority.toUpperCase()}
              </span>
            </div>
            {item.description && (
              <p className="text-[12.5px] text-white/45 mt-1 leading-relaxed">{item.description}</p>
            )}
          </div>
          <button
            onClick={startEdit}
            className="flex-shrink-0 text-white/20 hover:text-white/55 transition-colors p-1 -mr-1 text-[13px]"
            aria-label="Edit"
          >
            ✏️
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
                  className="mt-[2px] flex-shrink-0 w-[14px] h-[14px] accent-blue-500 cursor-pointer"
                />
                <span className={`text-[12.5px] leading-snug ${task.done ? 'line-through text-white/25' : 'text-white/70'}`}>
                  {task.task}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════
     EDIT MODE
  ════════════════════════════════════════════ */
  return (
    <div className="bg-[#161b27] border border-blue-500/40 rounded-xl p-4 mb-3">
      {/* Main task row */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={draft.done}
          onChange={() => setDraft({ ...draft, done: !draft.done })}
          className="mt-[10px] flex-shrink-0 w-[15px] h-[15px] accent-blue-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-[14px] font-semibold text-white focus:outline-none focus:border-blue-500/60 placeholder:text-white/20"
            placeholder="Action item title"
          />
          {/* Priority picker */}
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setDraft({ ...draft, priority: p })}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                  draft.priority === p
                    ? PRIORITY_ACTIVE[p]
                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Description */}
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-white/70 focus:outline-none focus:border-blue-500/60 resize-none placeholder:text-white/20"
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
                  tasks: draft.tasks.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)),
                })
              }
              className="flex-shrink-0 w-[14px] h-[14px] accent-blue-500 cursor-pointer"
            />
            <input
              type="text"
              value={task.task}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tasks: draft.tasks.map((t, idx) => (idx === i ? { ...t, task: e.target.value } : t)),
                })
              }
              className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-blue-500/60"
            />
            <button
              onClick={() =>
                setDraft({ ...draft, tasks: draft.tasks.filter((_, idx) => idx !== i) })
              }
              className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors text-sm px-1"
              aria-label="Remove sub-task"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add sub-task input */}
        <div className="flex items-center gap-2">
          <div className="w-[14px] flex-shrink-0" />
          <input
            ref={newTaskRef}
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={handleNewTaskKey}
            placeholder="Add sub-task…"
            className="flex-1 bg-transparent border border-dashed border-white/10 rounded-lg px-3 py-1.5 text-[12.5px] text-white/50 placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 focus:text-white"
          />
          {newTaskText.trim() && (
            <button
              onClick={addSubTask}
              className="flex-shrink-0 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium px-1"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Save / Cancel / Delete */}
      <div className="flex gap-2 ml-6">
        <button
          onClick={save}
          className="flex-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold py-2 rounded-lg transition-all"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-950/40 hover:bg-red-950/70 text-red-400 text-xs rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
