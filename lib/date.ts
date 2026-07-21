// Shared date helpers. Two families on purpose:
//   • Local-time helpers (todayISO, formatLongDate) drive what the user sees
//     "today" as on their own device.
//   • UTC helpers (addDaysISO, toCompactDate) drive stored/exported dates so a
//     seeded curriculum day or a calendar export lands on the same calendar
//     date regardless of the viewer's timezone.

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A YYYY-MM-DD string as e.g. "Monday, July 21" using local-time parsing. */
export function formatLongDate(iso: string): string {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Add `days` to a YYYY-MM-DD string using UTC math, returning YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD string as compact YYYYMMDD (for Google Calendar URLs). */
export function toCompactDate(iso: string): string {
  return iso.replace(/-/g, '');
}
