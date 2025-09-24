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

const router = Router()

// --- POST /contract/:addr/docs
router.post("/contract/:addr/docs", attachDocument)

// --- GET /documents
router.get("/", getAllDocuments)

// --- GET documents by owner
router.get("/owner/:owner", getDocumentsOwner)

// --- GET documents by contract
router.get("/contract/:addr", getDocumentsContract)

// --- GET single document by tokenId
router.get("/:tokenId", getDocument)

// --- GET document logs by tokenId
router.get("/:tokenId/logs", getDocumentLogsController)

// --- PATCH /documents/:tokenId
router.patch("/:tokenId", updateDocumentController)

// --- DELETE /documents/:tokenId
router.delete("/:tokenId", deleteDocumentController)

export default router
