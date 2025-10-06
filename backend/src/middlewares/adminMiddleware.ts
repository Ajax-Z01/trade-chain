import type { Request, Response, NextFunction } from "express"
import { UserModel } from "../models/UserModel.js"

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const address = req.headers["x-user-address"] as string
    if (!address) return res.status(401).json({ success: false, message: "Missing user address" })

    const user = await UserModel.getByAddress(address)
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" })
    }

    next()
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
