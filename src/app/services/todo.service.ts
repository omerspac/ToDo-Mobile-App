import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Todo, PriorityLevel } from '../models/todo.model';

const STORAGE_KEY = 'todo_app_tasks';

@Injectable({
  providedIn: 'root'
})
export class TodoService {

  private todos: Todo[] = [];
  private isLoaded = false;

  private defaultSampleTodos: Todo[] = [
    {
      id: 1,
      title: 'Welcome To Todo App',
      description: 'Press here to "mark as complete". Click above to add a task!',
      dueDate: '15-08-2026',
      dueTime: '00:00',
      priority: 'Medium',
      completed: false
    },
  ];

  constructor() {}

  async loadTodos(): Promise<Todo[]> {
    // Prevent loading the same data multiple times
    if (this.isLoaded) {
      return this.todos;
    }

    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      let dataStr = value;

      // Browser fallback
      if (!dataStr && typeof localStorage !== 'undefined') {
        dataStr = localStorage.getItem(STORAGE_KEY);
      }

      if (dataStr) {
        this.todos = JSON.parse(dataStr);
      } else {
        this.todos = [...this.defaultSampleTodos];
        await this.saveTodos();
      }

    } catch (e) {
      console.warn(
        'Failed to load from Capacitor Preferences, trying localStorage',
        e
      );

      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw) {
          this.todos = JSON.parse(raw);
        } else {
          this.todos = [...this.defaultSampleTodos];
        }

      } else {
        this.todos = [...this.defaultSampleTodos];
      }
    }

    // Ensure all loaded tasks use DD-MM-YYYY format
    this.todos = this.todos.map(todo => ({
      ...todo,
      dueDate: this.formatToDDMMYYYY(todo.dueDate),
      dueTime: todo.dueTime || undefined
    }));

    this.isLoaded = true;

    return this.todos;
  }

  async saveTodos(): Promise<void> {
    try {
      const json = JSON.stringify(this.todos);

      await Preferences.set({
        key: STORAGE_KEY,
        value: json
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, json);
      }

    } catch (e) {
      console.error('Error saving tasks to storage:', e);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.todos)
        );
      }
    }
  }

  getTodos(): Todo[] {
    return this.todos;
  }

  formatToDDMMYYYY(dateStr?: string): string {

    if (!dateStr) {
      const d = new Date();

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      return `${day}-${month}-${year}`;
    }

    const str = dateStr.trim();

    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(str)) {
      return str.replace(/\//g, '-');
    }

    // YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(str)) {

      const parts = str.split(/[-\/]/);

      const [year, month, day] = parts;

      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }

    const d = new Date(str);

    if (!isNaN(d.getTime())) {

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      return `${day}-${month}-${year}`;
    }

    return str;
  }

  async addTodo(
    title: string,
    description: string,
    dueDate?: string,
    dueTime?: string,
    priority: PriorityLevel = 'Medium'
  ): Promise<Todo> {

    const formattedDueDate =
      this.formatToDDMMYYYY(dueDate);

    const todo: Todo = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      dueDate: formattedDueDate,
      dueTime: dueTime || undefined,
      priority,
      completed: false
    };

    this.todos.unshift(todo);

    await this.saveTodos();

    return todo;
  }

  async updateTodo(updated: Todo): Promise<void> {

    const index = this.todos.findIndex(t => t.id === updated.id);

    if (index !== -1) {

      const formattedDueDate = this.formatToDDMMYYYY(updated.dueDate);

      this.todos[index] = {
        ...updated,
        dueDate: formattedDueDate,
        dueTime: updated.dueTime || undefined
      };

      await this.saveTodos();
    }
  }

  async toggleTodo(id: number): Promise<void> {

    const todo = this.todos.find(t => t.id === id);

    if (todo) {

      todo.completed = !todo.completed;

      await this.saveTodos();
    }
  }

  async deleteTodo(id: number): Promise<void> {

    this.todos = this.todos.filter(todo => todo.id !== id);

    await this.saveTodos();
  }
}