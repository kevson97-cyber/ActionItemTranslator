export interface Task {
  task: string;
  done: boolean;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  tasks: Task[];
  createdAt: string;
  date: string; // YYYY-MM-DD — the day this item belongs to
  time?: string; // HH:MM (24h), optional — if unset, item is treated as all-day
  threadUrl?: string; // link to a Claude conversation for working this item
}
