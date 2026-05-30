import { ActionItem } from './types';

const ITEMS_KEY = 'action_items';
const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
  groqKey: string;
  openrouterKey: string;
}

export function loadItems(): ActionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveItems(items: ActionItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { groqKey: '', openrouterKey: '' };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { groqKey: '', openrouterKey: '' };
  } catch {
    return { groqKey: '', openrouterKey: '' };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasSettings(): boolean {
  const s = loadSettings();
  return Boolean(s.groqKey && s.openrouterKey);
}
