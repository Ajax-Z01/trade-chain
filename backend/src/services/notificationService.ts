import { v4 as uuidv4 } from "uuid"
import { NotificationModel } from "../models/notificationModel.js"
import type { Notification, NotificationType } from "../types/Notification.js"

export class NotificationService {
  /**
   * Create and store a notification
   */
  static async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    return NotificationModel.create(notification)
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(id: string): Promise<boolean> {
    return NotificationModel.markAsRead(id)
  }

  /**
   * Delete a notification
   */
  static async delete(id: string): Promise<boolean> {
    return NotificationModel.delete(id)
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    return NotificationModel.getByUser(userId)
  }
}
