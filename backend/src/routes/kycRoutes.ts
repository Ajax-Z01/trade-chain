import { Router } from "express"
import {
  createKYC,
  getAllKYCs,
  getKYCById,
  getKYCsByOwner,
  updateKYC,
  deleteKYC,
  getKYCLogs,
} from "../controllers/kycController.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"

const router = Router()

// --- Create new KYC ---
router.post("/", authMiddleware, createKYC)

// --- Get all KYCs ---
router.get("/", authMiddleware, getAllKYCs)

// --- Get KYC by tokenId ---
router.get("/:tokenId", authMiddleware, getKYCById)

// --- Get KYCs by owner ---
router.get("/owner/:owner", authMiddleware, getKYCsByOwner)

// --- Update KYC ---
router.patch("/:tokenId", authMiddleware, updateKYC)

// --- Delete KYC ---
router.delete("/:tokenId", authMiddleware, deleteKYC)

// --- Get KYC Logs ---
router.get("/:tokenId/logs", authMiddleware, getKYCLogs)

export default router
