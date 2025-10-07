import { Router } from "express"
import {
  walletConnectHandler,
  getCurrentUserHandler,
  getAllUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "../controllers/userController.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { adminMiddleware } from "../middlewares/adminMiddleware.js"

const router = Router()

// --- Wallet Connect / Auto-register ---
router.post("/wallet-connect", walletConnectHandler)

// --- Get Current User ---
router.get("/me", authMiddleware, getCurrentUserHandler)

// --- Get All Users (Admin only) ---
router.get("/", authMiddleware, adminMiddleware, getAllUsersHandler)

// --- Get Single User ---
router.get("/:address", getUserHandler)

// --- Update User (Admin only) ---
router.patch("/:address", authMiddleware, adminMiddleware, updateUserHandler)

// --- Delete User (Admin only) ---
router.delete("/:address", authMiddleware, adminMiddleware, deleteUserHandler)

export default router
