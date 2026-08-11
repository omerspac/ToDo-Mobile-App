export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  priority?: PriorityLevel;
}