import type { Request, Response } from "express"
import { DashboardModel } from "../models/dashboardModel.js"


export class DashboardController {
  // --- Admin / superuser dashboard ---
  static async getDashboard(req: Request, res: Response) {
    try {
      const dashboard = await DashboardModel.getDashboard()
      return res.status(200).json({ success: true, data: dashboard })
    } catch (err: any) {
      console.error("Error fetching dashboard:", err)
      return res.status(500).json({ success: false, message: err.message || "Internal server error" })
    }
  }

  // --- User dashboard ---
  static async getUserDashboard(req: Request, res: Response) {
    try {
      const userAddress = (req as any).user?.address
      if (!userAddress) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const dashboard = await DashboardModel.getUserDashboard(userAddress)
      return res.status(200).json({ success: true, data: dashboard })
    } catch (err: any) {
      console.error("Error fetching user dashboard:", err)
      return res.status(500).json({ success: false, message: err.message || "Internal server error" })
    }
  }
}
