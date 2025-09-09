import { Request, Response } from "express"
import {
  addDocument,
  getDocumentById,
  getDocumentsByOwner,
  getDocumentsByContract,
  updateDocument,
  deleteDocument,
} from "../models/documentModel.js"
import DocumentDTO from "../dtos/documentDTO.js"

// --- POST /contract/:addr/docs
export const attachDocument = async (req: Request, res: Response) => {
  try {
    const { addr: contractAddress } = req.params
    const { tokenId, owner, fileHash, uri, docType, signer, name, description, metadataUrl } = req.body

    if (!tokenId || !owner || !fileHash || !uri || !docType) {
      return res.status(400).json({ message: "Missing required fields" })
    }

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
    })

    const doc = await addDocument(docData.toFirestore(), signer)
    return res.status(201).json(doc)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// --- GET /documents/:tokenId
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const doc = await getDocumentById(Number(tokenId))
    if (!doc) return res.status(404).json({ message: "Document not found" })
    return res.json(doc)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// --- GET /documents/owner/:owner
export const getDocumentsOwner = async (req: Request, res: Response) => {
  try {
    const { owner } = req.params
    const docs = await getDocumentsByOwner(owner)
    return res.json(docs)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// --- GET /documents/contract/:addr
export const getDocumentsContract = async (req: Request, res: Response) => {
  try {
    const { addr } = req.params
    const docs = await getDocumentsByContract(addr)
    return res.json(docs)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// --- PATCH /documents/:tokenId
export const updateDocumentController = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const data = req.body
    const updated = await updateDocument(Number(tokenId), data)
    if (!updated) return res.status(404).json({ message: "Document not found" })
    return res.json(updated)
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

// --- DELETE /documents/:tokenId
export const deleteDocumentController = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params
    const success = await deleteDocument(Number(tokenId))
    if (!success) return res.status(404).json({ message: "Document not found" })
    return res.json({ message: "Deleted successfully" })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}
