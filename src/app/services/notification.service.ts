import { Injectable } from '@angular/core';

import {
  LocalNotifications,
  ScheduleOptions,
  ActionPerformed,
  PendingResult
} from '@capacitor/local-notifications';

import { Capacitor } from '@capacitor/core';

import { Todo } from '../models/todo.model';


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() {}


  /**
   * Request notification permission.
   */
  async requestPermission(): Promise<boolean> {

    if (Capacitor.getPlatform() === 'web') {
      console.log(
        'Local notifications are not available on web.'
      );

      return false;
    }

    const current = await LocalNotifications.checkPermissions();

    if (current.display === 'granted') {
      return true;
    }

    const permission =
      await LocalNotifications.requestPermissions();

    console.log(
      'Notification permission:',
      permission.display
    );

    return permission.display === 'granted';
  }


  /**
   * Check whether Android allows exact alarms.
   */
  async checkExactAlarmPermission(): Promise<boolean> {

    if (Capacitor.getPlatform() !== 'android') {
      return true;
    }

    try {

      const result = await LocalNotifications.checkExactNotificationSetting();

      console.log(
        'Exact alarm permission:',
        result.exact_alarm
      );

      return result.exact_alarm === 'granted';

    } catch (error) {

      console.warn(
        'Could not check exact alarm permission:',
        error
      );

      return false;
    }
  }


  /**
   * Create a unique notification ID from the task ID.
   */
  private getNotificationId(
    todoId: number
  ): number {
    // Android notification and PendingIntent IDs must fit in a signed 32-bit
    // integer. Todo IDs are timestamp-based and are much larger than that.
    return Math.abs(todoId % 2_147_483_647) || 1;
  }


  /**
   * Convert DD-MM-YYYY + HH:mm
   * into a JavaScript Date.
   */
  private getDueDateTime(todo: Todo): Date | null {

    if (!todo.dueDate || !todo.dueTime) {
      return null;
    }

    const dateParts =
      todo.dueDate.split('-');

    if (dateParts.length !== 3) {
      return null;
    }

    const day =
      Number(dateParts[0]);

    const month =
      Number(dateParts[1]) - 1;

    const year =
      Number(dateParts[2]);


    const timeParts =
      todo.dueTime.split(':');

    if (timeParts.length !== 2) {
      return null;
    }

    const hours =
      Number(timeParts[0]);

    const minutes =
      Number(timeParts[1]);


    const dueDate = new Date(
      year,
      month,
      day,
      hours,
      minutes,
      0,
      0
    );


    if (isNaN(dueDate.getTime())) {
      return null;
    }

    return dueDate;
  }


  /**
   * Schedule a notification for
   * a pending task.
   */
  async scheduleTaskNotification(
    todo: Todo
  ): Promise<void> {

    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    if (todo.completed) {
      return;
    }


    const dueDate =
      this.getDueDateTime(todo);


    if (!dueDate) {

      console.log(
        `Task "${todo.title}" has no valid date/time.`
      );

      return;
    }


    // Do not schedule notifications
    // in the past.
    if (dueDate.getTime() <= Date.now()) {

      console.log(
        `Task "${todo.title}" is already due.`
      );

      return;
    }


    if (!(await this.ensureSchedulingPermissions())) {
      return;
    }


    const notificationId =
      this.getNotificationId(todo.id);


    // Remove previous notification
    // for this task.
    await this.cancelTaskNotification(
      todo.id
    );


    const options: ScheduleOptions = {

      notifications: [

        {
          id: notificationId,
          title: 'Task still pending',
          body: `"${todo.title}" is due and still pending.`,

          schedule: {
            at: dueDate,
            allowWhileIdle: true
          },

          extra: {
            taskId: todo.id
          }
        }

      ]
    };


    try {

      const result =
        await LocalNotifications.schedule(
          options
        );


      console.log(
        'Notification scheduled:',
        result
      );

      console.log(
        `Task "${todo.title}" scheduled for:`,
        dueDate.toString()
      );


      // Debug: verify Android still
      // considers it pending.
      const pending =
        await LocalNotifications.getPending();

      console.log(
        'Pending notifications:',
        pending.notifications
      );

    } catch (error) {

      console.error(
        'FAILED TO SCHEDULE NOTIFICATION:',
        error
      );
    }
  }


  /**
   * Ensure Android can show a notification at the task's exact due time.
   * Android 12+ exposes exact alarms as a special app setting, separate from
   * the normal notification prompt.
   */
  private async ensureSchedulingPermissions(): Promise<boolean> {

    const hasNotificationPermission = await this.requestPermission();

    if (!hasNotificationPermission) {
      console.warn('Notification permission was not granted.');
      return false;
    }

    const notificationsEnabled = await LocalNotifications.areEnabled();

    if (!notificationsEnabled.value) {
      console.warn('Notifications are disabled in the Android app settings.');
      return false;
    }

    const exactAlarmAllowed = await this.checkExactAlarmPermission();

    if (exactAlarmAllowed) {
      return true;
    }

    // Opens Android's "Alarms & reminders" setting for this app. Once the
    // user enables it, Android restarts the app and pending tasks are
    // scheduled again from HomePage.ngOnInit.
    console.warn('Exact alarm permission is not granted. Opening settings.');
    await LocalNotifications.changeExactNotificationSetting();
    return false;
  }


  /**
   * Cancel a task notification.
   */
  async cancelTaskNotification(
    todoId: number
  ): Promise<void> {

    if (
      Capacitor.getPlatform() === 'web'
    ) {
      return;
    }


    try {

      await LocalNotifications.cancel({

        notifications: [

          {
            id: this.getNotificationId(todoId)
          }

        ]

      });


      console.log(
        `Notification cancelled for task ${todoId}`
      );

    } catch (error) {

      console.warn(
        `Could not cancel notification for task ${todoId}`,
        error
      );
    }
  }


  /**
   * Reschedule an existing task.
   */
  async rescheduleTaskNotification(
    todo: Todo
  ): Promise<void> {

    await this.cancelTaskNotification(
      todo.id
    );


    if (!todo.completed) {

      await this.scheduleTaskNotification(
        todo
      );
    }
  }


  /**
   * Handle task status changes.
   */
  async handleTaskStatusChange(
    todo: Todo
  ): Promise<void> {

    if (todo.completed) {

      await this.cancelTaskNotification(
        todo.id
      );

    } else {

      await this.scheduleTaskNotification(
        todo
      );
    }
  }


  /**
   * Schedule notifications for
   * existing pending tasks.
   */
  async scheduleExistingTasks(
    todos: Todo[]
  ): Promise<void> {

    if (
      Capacitor.getPlatform() === 'web'
    ) {
      return;
    }


    const pendingTasks =
      todos.filter(
        todo => !todo.completed
      );


    if (pendingTasks.length === 0) {
      return;
    }


    for (const todo of pendingTasks) {

      await this.scheduleTaskNotification(
        todo
      );
    }
  }


  /**
   * Listen for notification actions.
   */
  async addNotificationListeners(): Promise<void> {

    if (
      Capacitor.getPlatform() === 'web'
    ) {
      return;
    }


    await LocalNotifications.addListener(
      'localNotificationReceived',
      notification => {

        console.log(
          'LOCAL NOTIFICATION RECEIVED:',
          notification
        );

      }
    );


    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event: ActionPerformed) => {

        console.log(
          'Notification tapped:',
          event.notification
        );

      }
    );
  }


  /**
   * Get pending scheduled notifications.
   */
  async getPendingNotifications(): Promise<PendingResult> {

    return await LocalNotifications.getPending();
  }
}
