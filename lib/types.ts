export interface Task {
  task: string;
  done: boolean;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  tasks: Task[];
  createdAt: string;
}
