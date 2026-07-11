import { ActionItem } from './types';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function buildGoogleCalendarUrl(item: ActionItem): string {
  const bareDate = item.date.replace(/-/g, '');
  let dates: string;
  let ctz = '';

  if (item.time) {
    const [hh, mm] = item.time.split(':');
    const startStamp = `${bareDate}T${hh}${mm}00`;
    const [y, m, d] = item.date.split('-').map(Number);
    const start = new Date(y, m - 1, d, Number(hh), Number(mm));
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const endStamp =
      `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}` +
      `T${String(end.getHours()).padStart(2, '0')}${String(end.getMinutes()).padStart(2, '0')}00`;
    dates = `${startStamp}/${endStamp}`;
    ctz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } else {
    dates = `${bareDate}/${addDays(item.date, 1)}`;
  }

  const details = [item.description, ...item.tasks.map(t => `• ${t.task}`)]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.title,
    dates,
  });
  if (details) params.set('details', details);
  if (ctz) params.set('ctz', ctz);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
