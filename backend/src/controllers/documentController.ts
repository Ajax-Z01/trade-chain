import { Request, Response } from "express"
import { DocumentModel } from "../models/documentModel.js"
import DocumentDTO from "../dtos/documentDTO.js"

// --- POST /contract/:addr/docs ---
export const attachDocument = async (req: Request, res: Response) => {
  try {
    const { addr: contractAddress } = req.params
    const { tokenId, owner, fileHash, uri, docType, signer, name, description, metadataUrl, action, txHash } = req.body

    if (!tokenId || !owner || !fileHash || !uri || !docType) {
      return res.status(400).json({ success: false, message: "Missing required fields" })
    }
    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!signer) return res.status(400).json({ success: false, message: "Missing signer/account field" })

    const docData = new DocumentDTO({
      tokenId,
      owner,
      fileHash,
      uri,
      docType,
      linkedContracts: [contractAddress],
      signer,
      name,
      description,
      metadataUrl,
      status: 'Draft',
      createdAt: Date.now(),
    })

    const doc = await DocumentModel.create(docData.toFirestore(), signer, action, txHash)
    return res.status(201).json({ success: true, data: doc })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- GET /documents ---
export const getAllDocuments = async (_req: Request, res: Response) => {
  try {
    const docs = await DocumentModel.getAll()
    return res.json({ success: true, data: docs })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- GET /documents/:tokenId ---
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const doc = await DocumentModel.getById(+tokenId)
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" })
    return res.json({ success: true, data: doc })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- GET /documents/owner/:owner ---
export const getDocumentsOwner = async (req: Request, res: Response) => {
  try {
    const { owner } = req.params
    const docs = await DocumentModel.getByOwner(owner)
    return res.json({ success: true, data: docs })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- GET /documents/contract/:addr ---
export const getDocumentsContract = async (req: Request, res: Response) => {
  try {
    const { addr } = req.params
    const docs = await DocumentModel.getByContract(addr)
    return res.json({ success: true, data: docs })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- GET /documents/:tokenId/logs ---
export const getDocumentLogsController = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const logs = await DocumentModel.getLogs(+tokenId)
    if (!logs.length) return res.status(404).json({ success: false, message: "No logs found" })
    return res.json({ success: true, data: logs })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- PATCH /documents/:tokenId ---
export const updateDocumentController = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const { action, txHash, account, ...updateData } = req.body

    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!account) return res.status(400).json({ success: false, message: "Missing account field" })

    const updated = await DocumentModel.update(+tokenId, updateData, action, txHash, account)
    if (!updated) return res.status(404).json({ success: false, message: "Document not found" })
    return res.json({ success: true, data: updated })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- DELETE /documents/:tokenId ---
export const deleteDocumentController = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const { action, txHash, account } = req.body

    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!account) return res.status(400).json({ success: false, message: "Missing account field" })

    const success = await DocumentModel.delete(+tokenId, action, txHash, account)
    if (!success) return res.status(404).json({ success: false, message: "Document not found" })
    return res.json({ success: true, message: "Deleted successfully" })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}
