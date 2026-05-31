import { ActionItem } from './types';

const ITEMS_KEY = 'action_items';
const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
  openrouterKey: string;
}

export function loadItems(): ActionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // migrate: backfill date from createdAt for items that predate the date field
    return parsed.map((item: ActionItem) => ({
      ...item,
      date: item.date ?? item.createdAt.slice(0, 10),
    }));
  } catch {
    return [];
  }
}

export function saveItems(items: ActionItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { openrouterKey: '' };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { openrouterKey: '' };
    const parsed = JSON.parse(raw);
    // migrate: drop legacy groqKey field
    return { openrouterKey: parsed.openrouterKey ?? '' };
  } catch {
    return { openrouterKey: '' };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasSettings(): boolean {
  return Boolean(loadSettings().openrouterKey);
}
