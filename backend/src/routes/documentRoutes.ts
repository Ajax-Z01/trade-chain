import { Router } from "express"
import {
  attachDocument,
  getDocument,
  getDocumentsOwner,
  getDocumentsContract,
  getDocumentLogsController,
  updateDocumentController,
  deleteDocumentController,
  getAllDocuments,
} from "../controllers/documentController.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"

const router = Router()

// --- POST /contract/:addr/docs
router.post("/contract/:addr/docs", authMiddleware, attachDocument)

// --- GET /documents
router.get("/", authMiddleware, getAllDocuments)

// --- GET documents by owner
router.get("/owner/:owner", authMiddleware, getDocumentsOwner)

// --- GET documents by contract
router.get("/contract/:addr", authMiddleware, getDocumentsContract)

// --- GET single document by tokenId
router.get("/:tokenId", authMiddleware, getDocument)

// --- GET document logs by tokenId
router.get("/:tokenId/logs", authMiddleware, getDocumentLogsController)

// --- PATCH /documents/:tokenId
router.patch("/:tokenId", authMiddleware, updateDocumentController)

// --- DELETE /documents/:tokenId
router.delete("/:tokenId", authMiddleware, deleteDocumentController)

export default router
