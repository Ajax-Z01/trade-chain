import { v4 as uuidv4 } from "uuid"
import { NotificationModel } from "../models/notificationModel.js"
import type { Notification, NotificationType } from "../types/Notification.js"

export class NotificationService {
  /**
   * Create and store a notification, mendukung payload tambahan
   */
  static async notify(
    userId: string,
    executorId: string,
    type: NotificationType,
    title: string,
    message: string,
    extraData?: Record<string, any>
  ): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      executorId,
      type,
      title,
      message,
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      extraData,
    }

    return NotificationModel.create(notification)
  }

  static async markAsRead(id: string): Promise<boolean> {
    return NotificationModel.markAsRead(id)
  }

  static async delete(id: string): Promise<boolean> {
    return NotificationModel.delete(id)
  }

  static async getUserNotifications(userId: string): Promise<Notification[]> {
    return NotificationModel.getByUser(userId)
  }
}
