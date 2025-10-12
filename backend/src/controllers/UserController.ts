import type { Request, Response } from "express";
import UserDTO from "../dtos/userDTO.js";
import { UserModel } from "../models/userModel.js";
import { CompanyModel } from "../models/companyModel.js";
import { UserCompanyModel } from "../models/userCompanyModel.js";
import type { User } from '../types/User.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import jwt from 'jsonwebtoken';

// --- Wallet Connect / Auto-register ---
export async function walletConnectHandler(req: Request, res: Response) {
  try {
    const dto = new UserDTO(req.body);
    const address = dto.address;

    if (!address) {
      return res.status(400).json({ success: false, message: "Missing required field: address" });
    }

    // 1️⃣ Cek apakah user sudah ada
    let user: User | null = await UserModel.getByAddress(address);
    let isNewUser = false;

    if (!user) {
      // 2️⃣ Buat user baru
      user = await UserModel.create(dto.toFirestore());
      isNewUser = true;
    } else {
      // 3️⃣ Update last login
      const updatedUser = await UserModel.update(address, { lastLoginAt: Date.now() });
      if (updatedUser) user = updatedUser;
    }

    // 4️⃣ Jika user baru, buat default company & relasi user-company
    if (isNewUser && user) {
      const company = await CompanyModel.createDefaultForUser(user.address);

      if (company && company.id) {
        await UserCompanyModel.createUserCompany({
          userAddress: user.address,
          companyId: company.id,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
        });
      }
    }

    // 5️⃣ Generate JWT
    const token = jwt.sign({ address: user.address }, process.env.JWT_SECRET ?? "", { expiresIn: '7d' });

    res.json({ success: true, data: user, token });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// --- Get current user ---
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
    const dto = req.body
    const user = await UserModel.update(address, dto)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    res.json({ success: true, data: user })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// --- Update current user's own profile ---
export async function updateMeHandler(req: AuthRequest, res: Response) {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' })

    const { metadata } = req.body
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' })
    }

    const updated = await UserModel.update(user.address, { metadata })
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' })

    res.json({ success: true, data: updated })
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
