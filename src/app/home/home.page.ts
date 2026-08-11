import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Todo, PriorityLevel } from '../models/todo.model';
import { TodoService } from '../services/todo.service';
import { NotificationService } from '../services/notification.service';
import { Preferences } from '@capacitor/preferences';

import {
  addOutline,
  createOutline,
  trashOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  checkmarkDoneOutline,
  timeOutline,
  ellipseOutline,
  listOutline,
  searchOutline,
  filterOutline,
  chevronBackOutline,
  chevronForwardOutline,
  logOutOutline,
  calendarOutline,
  alertCircleOutline,
  moonOutline,
  sunnyOutline,
  closeOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
  IonInput,
  IonTextarea,
  IonSearchbar,
  // IonSegment,
  // IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonLabel,
  AlertController,
  IonFab,
  IonFabButton,
  IonDatetime
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonModal,
    IonInput,
    IonTextarea,
    IonSearchbar,
    // IonSegment,
    // IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonLabel,
    IonFab,
    IonFabButton,
    IonDatetime
  ],
})
export class HomePage implements OnInit {

  searchQuery = '';
  selectedStatus: 'All' | 'Pending' | 'Completed' = 'All';

  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 20];

  showAddModal = false;
  showEditModal = false;
  isDarkMode = true;

  newTodo: {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: PriorityLevel;
  } = {
    title: '',
    description: '',
    dueDate: this.getTodayDateISO(),
    dueTime: '00:00',
    priority: 'Medium'
  };

  editingTodo: Todo | null = null;

  getTodayDateISO(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(dateStr?: string): string {
    if (!dateStr) return '';
    const str = dateStr.trim();

    // If DD-MM-YYYY or DD/MM/YYYY -> output DD-MM-YYYY
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(str)) {
      return str.replace(/\//g, '-');
    }

    // If YYYY-MM-DD or YYYY/MM/DD
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

  formatToYYYYMMDD(dateStr?: string): string {
    if (!dateStr) return this.getTodayDateISO();
    const str = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const parts = str.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 2) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return this.getTodayDateISO();
  }

 constructor(
  private todoService: TodoService,
  private notificationService: NotificationService,
  private alertController: AlertController,
  private router: Router
  ) {
    addIcons({
      addOutline,
      createOutline,
      trashOutline,

      checkmarkCircleOutline,
      checkmarkOutline,
      checkmarkDoneOutline,

      timeOutline,
      ellipseOutline,
      listOutline,

      searchOutline,
      filterOutline,

      chevronBackOutline,
      chevronForwardOutline,

      logOutOutline,
      calendarOutline,
      alertCircleOutline,

      moonOutline,
      sunnyOutline,
      closeOutline,
    });
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.body.classList.remove('dark-theme');
    } else {
      this.isDarkMode = true;
      document.body.classList.add('dark-theme');
    }
  }

  async ngOnInit() {

    const todos =
      await this.todoService.loadTodos();

      await this.notificationService.addNotificationListeners();

      await this.notificationService.scheduleExistingTasks(todos);
  }

  get allTodos(): Todo[] {
    return this.todoService.getTodos();
  }

  get totalTasksCount(): number {
    return this.allTodos.length;
  }

  get pendingCount(): number {
    return this.allTodos.filter(t => !t.completed).length;
  }

  get completedCount(): number {
    return this.allTodos.filter(t => t.completed).length;
  }

  get filteredTodos(): Todo[] {
    return this.allTodos.filter(todo => {
      const matchesSearch =
        !this.searchQuery ||
        todo.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(this.searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (this.selectedStatus === 'Pending') {
        matchesStatus = !todo.completed;
      } else if (this.selectedStatus === 'Completed') {
        matchesStatus = todo.completed;
      }

      return matchesSearch && matchesStatus;
    });
  }

  get totalPages(): number {
    const pages = Math.ceil(this.filteredTodos.length / this.pageSize);
    return pages > 0 ? pages : 1;
  }

  get paginatedTodos(): Todo[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredTodos.slice(startIndex, startIndex + this.pageSize);
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value || '';
    this.currentPage = 1;
  }

  onStatusFilterChange(event: any) {
    this.selectedStatus = event.detail.value;
    this.currentPage = 1;
  }

  selectStatus(status: 'All' | 'Pending' | 'Completed') {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  onPageSizeChange(event: any) {
    this.pageSize = Number(event.detail.value);
    this.currentPage = 1;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  async toggleStatus(todo: Todo, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    await this.todoService.toggleTodo(
      todo.id
    );

    const updatedTodo = this.allTodos.find(
        t => t.id === todo.id
      );

    if (!updatedTodo) {
      return;
    }

    await this.notificationService.handleTaskStatusChange(updatedTodo);
  }

  openAddModal() {
    this.newTodo = {
      title: '',
      description: '',
      dueDate: this.getTodayDateISO(),
      dueTime: '00:00',
      priority: 'Medium'
    };

    this.showAddModal = true;
  }

async addTodo() {

  if (!this.newTodo.title.trim()) {
    return;
  }

  const todo = await this.todoService.addTodo(
    this.newTodo.title,
    this.newTodo.description,
    this.newTodo.dueDate,
    this.newTodo.dueTime,
    this.newTodo.priority
  );

  // Close modal immediately after task is created
  this.showAddModal = false;

  // Schedule notification separately
  try {
    await this.notificationService.scheduleTaskNotification(todo);
  } catch (error) {
    console.error(
      'Failed to schedule task notification:',
      error
    );
  }
}

  editTodo(todo: Todo, event?: Event) {
  if (event) {
    event.stopPropagation();
  }

  this.editingTodo = {
    ...todo,
    dueDate: this.formatToYYYYMMDD(todo.dueDate),
    dueTime: todo.dueTime || '00:00'
  };

    this.showEditModal = true;
  }

  async updateTodo() {
    if (!this.editingTodo || !this.editingTodo.title.trim()) {
      return;
    }

    await this.todoService.updateTodo(
      this.editingTodo
    );

    await this.notificationService.rescheduleTaskNotification(
        this.editingTodo
      );

    this.editingTodo = null;
    this.showEditModal = false;
  }

  async deleteTodo(id: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const todo = this.allTodos.find(t => t.id === id);
    if (!todo) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Delete Task',
      message: `Are you sure you want to delete "${todo.title}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.notificationService.cancelTaskNotification(id);
            await this.todoService.deleteTodo(id);
            
            if (this.paginatedTodos.length === 0 && this.currentPage > 1) {
              this.currentPage--;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // THEME TOGGLE FUNCTIONALITY
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  async logout() {
    await Preferences.remove({
      key: 'todo_app_logged_in'
    });

    await this.router.navigate(['/login'], {
      replaceUrl: true
    });
  }

  getPriorityColor(priority?: PriorityLevel): string {
    switch (priority) {
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'medium';
    }
  }
}