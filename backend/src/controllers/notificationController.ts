import { Request, Response } from "express"
import { NotificationModel } from "../models/notificationModel.js"

export class NotificationController {
  // --- Get All ---
  static async getAll(req: Request, res: Response) {
    try {
      const notifications = await NotificationModel.getAll()
      res.status(200).json({ success: true, data: notifications })
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  // --- Get by User ---
  static async getByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params
      if (!userId) return res.status(400).json({ success: false, message: "userId is required" })

      const notifications = await NotificationModel.getByUser(userId)
      res.status(200).json({ success: true, data: notifications })
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  // --- Get by Id ---
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const notification = await NotificationModel.getById(id)
      if (!notification) return res.status(404).json({ success: false, message: "Not found" })

      res.status(200).json({ success: true, data: notification })
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  // --- Mark as Read ---
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params
      const success = await NotificationModel.markAsRead(id)
      if (!success) return res.status(404).json({ success: false, message: "Not found" })

      res.status(200).json({ success: true, message: "Notification marked as read" })
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message })
    }
  }

  // --- Delete ---
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const success = await NotificationModel.delete(id)
      if (!success) return res.status(404).json({ success: false, message: "Not found" })

      res.status(200).json({ success: true, message: "Notification deleted" })
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}
