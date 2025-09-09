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
router.get("/:tokenId", getDocument)

// --- GET /documents/owner/:owner
router.get("/owner/:owner", getDocumentsOwner)

// --- GET /documents/contract/:addr
router.get("/contract/:addr", getDocumentsContract)

// --- PATCH /documents/:tokenId
router.patch("/:tokenId", updateDocumentController)

// --- DELETE /documents/:tokenId
router.delete("/:tokenId", deleteDocumentController)

export default router
