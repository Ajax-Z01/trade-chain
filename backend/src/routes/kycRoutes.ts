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

const router = Router()

// --- Create new KYC ---
router.post("/", createKYC)

// --- Get all KYCs ---
router.get("/", getAllKYCs)

// --- Get KYC by tokenId ---
router.get("/:tokenId", getKYCById)

// --- Get KYCs by owner ---
router.get("/owner/:owner", getKYCsByOwner)

// --- Update KYC ---
router.put("/:tokenId", updateKYC)

// --- Delete KYC ---
router.delete("/:tokenId", deleteKYC)

// --- Get KYC Logs ---
router.get("/:tokenId/logs", getKYCLogs)

export default router
