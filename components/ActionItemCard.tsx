'use client';

import { ActionItem } from '../lib/types';

const BADGE: Record<string, string> = {
  high: 'bg-red-950/60 text-red-400',
  medium: 'bg-yellow-950/60 text-yellow-400',
  low: 'bg-green-950/60 text-green-400',
};

interface Props {
  item: ActionItem;
  onToggleTask: (index: number) => void;
}

export default function ActionItemCard({ item, onToggleTask }: Props) {
  return (
    <div className="bg-[#161b27] border border-white/5 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="font-semibold text-[15px] leading-snug">{item.title}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${BADGE[item.priority] ?? BADGE.medium}`}>
          {item.priority.toUpperCase()}
        </span>
      </div>
      <p className="text-[12.5px] text-white/50 mb-3 leading-relaxed">{item.description}</p>
      {item.tasks.length > 0 && (
        <ul className="space-y-2">
          {item.tasks.map((task, i) => (
            <li key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggleTask(i)}
                className="mt-0.5 flex-shrink-0 accent-blue-500 cursor-pointer"
              />
              <span className={`text-[12.5px] leading-snug ${task.done ? 'line-through text-white/25' : 'text-white/75'}`}>
                {task.task}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
