import type { Request, Response } from "express"
import UserDTO from "../dtos/UserDTO.js"
import { UserModel } from "../models/userModel.js"
import type { User } from '../types/User.js'
import type { AuthRequest } from '../middlewares/authMiddleware.js'
import jwt from 'jsonwebtoken'

// --- Wallet Connect / Auto-register ---
export async function walletConnectHandler(req: Request, res: Response) {
  try {
    const dto = new UserDTO(req.body)
    let user = await UserModel.getByAddress(dto.address)
    if (!user) {
      user = await UserModel.create(dto.toFirestore())
    } else {
      user = await UserModel.update(dto.address, { lastLoginAt: Date.now() })
    }

    const token = jwt.sign({ address: user!.address }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    
    res.json({ success: true, data: user, token })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

export async function getCurrentUserHandler(req: AuthRequest, res: Response) {
  try {
    const user: User | undefined = req.user
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' })

    res.json({ success: true, data: user })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// --- Get All Users (Admin Only) ---
export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const users = await UserModel.getAll()
    res.json({ success: true, data: users })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// --- Get Single User ---
export async function getUserHandler(req: Request, res: Response) {
  try {
    const { address } = req.params
    const user = await UserModel.getByAddress(address)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    res.json({ success: true, data: user })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// --- Update User Role / Metadata ---
export async function updateUserHandler(req: Request, res: Response) {
  try {
    const { address } = req.params
    const dto = req.body // bisa juga pakai Zod / UserDTO khusus update
    const user = await UserModel.update(address, dto)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    res.json({ success: true, data: user })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// --- Delete User ---
export async function deleteUserHandler(req: Request, res: Response) {
  try {
    const { address } = req.params
    const deleted = await UserModel.delete(address)
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" })

    res.json({ success: true, message: "User deleted successfully" })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}
