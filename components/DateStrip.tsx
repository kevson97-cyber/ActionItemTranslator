'use client';

interface Props {
  selectedDate: string;
  onSelect: (date: string) => void;
  itemCountByDate: Record<string, number>;
  weekOffset: number;
  onWeekChange: (delta: -1 | 1) => void;
  onResetToToday: () => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon…6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dateISO(d);
  });
}

function formatWeekLabel(weekOffset: number, dates: string[]): string {
  if (weekOffset === 0) return 'This week';
  if (weekOffset === -1) return 'Last week';
  if (weekOffset === 1) return 'Next week';
  const [yyyy, mm, dd] = dates[0].split('-').map(Number);
  const start = new Date(yyyy, mm - 1, dd);
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DateStrip({
  selectedDate,
  onSelect,
  itemCountByDate,
  weekOffset,
  onWeekChange,
  onResetToToday,
}: Props) {
  const today = todayISO();
  const dates = getWeekDates(weekOffset);
  const isCurrentWeek = weekOffset === 0;

  return (
    <div>
      {/* Week navigation row */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => onWeekChange(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors text-lg leading-none select-none"
          aria-label="Previous week"
        >
          ‹
        </button>

        <button
          onClick={onResetToToday}
          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
            isCurrentWeek
              ? 'text-white/25 cursor-default'
              : 'text-[#4f8ef7]/70 hover:text-[#4f8ef7] hover:bg-[#4f8ef7]/8'
          }`}
        >
          {formatWeekLabel(weekOffset, dates)}
        </button>

        <button
          onClick={() => onWeekChange(1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors text-lg leading-none select-none"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {/* Day pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {dates.map((date, i) => {
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const count = itemCountByDate[date] ?? 0;
          const dayNum = parseInt(date.slice(8), 10);

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={`flex flex-col items-center flex-shrink-0 w-[46px] pt-2 pb-2.5 rounded-2xl transition-all active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#4f8ef7] to-[#6366f1] text-white shadow-[0_4px_16px_rgba(79,142,247,0.30)]'
                  : isToday
                  ? 'bg-white/[0.05] ring-1 ring-[#4f8ef7]/40 text-[#e8edf5]'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[9px] font-semibold uppercase tracking-widest mb-1.5 leading-none">
                {isToday ? 'TDY' : DAY_NAMES[i]}
              </span>
              <span className="text-[15px] font-bold leading-none">
                {dayNum}
              </span>
              <div className="h-2 mt-1.5 flex items-center justify-center">
                {count > 0 && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isSelected ? 'bg-white/60' : 'bg-[#4f8ef7]/70'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
