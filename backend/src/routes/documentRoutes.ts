import { Router } from "express"
import {
  attachDocument,
  getDocument,
  getDocumentsOwner,
  getDocumentsContract,
  updateDocumentController,
  deleteDocumentController,
} from "../controllers/documentController.js"

const router = Router()

// --- POST /contract/:addr/docs
router.post("/contract/:addr/docs", attachDocument)

// --- GET /documents/:tokenId
router.get("/documents/:tokenId", getDocument)

// --- GET /documents/owner/:owner
router.get("/documents/owner/:owner", getDocumentsOwner)

// --- GET /documents/contract/:addr
router.get("/documents/contract/:addr", getDocumentsContract)

// --- PATCH /documents/:tokenId
router.patch("/documents/:tokenId", updateDocumentController)

// --- DELETE /documents/:tokenId
router.delete("/documents/:tokenId", deleteDocumentController)

export default router
