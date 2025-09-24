import type { Request, Response } from "express"
import { KYCModel } from "../models/kycModel.js"
import type { KYC, KYCLogEntry, KYCStatus } from "../types/Kyc.js"

// --- Create KYC ---
export const createKYC = async (req: Request, res: Response) => {
  try {
    const {
      tokenId,
      owner,
      fileHash,
      metadataUrl,
      documentUrl,
      name,
      description,
      status,
      action,
      txHash,
      executor,
    } = req.body

    if (!tokenId || !owner || !fileHash || !metadataUrl) {
      return res.status(400).json({ success: false, message: "Missing required KYC fields" })
    }
    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!executor) return res.status(400).json({ success: false, message: "Missing executor field" })

    const kyc: KYC = await KYCModel.create({
      tokenId,
      owner,
      fileHash,
      metadataUrl,
      documentUrl,
      name,
      description,
      status: status as KYCStatus,
    })

    const logEntry: KYCLogEntry = {
      action: action as KYCLogEntry["action"],
      txHash: txHash || "",
      account: kyc.owner,
      executor,
      timestamp: Date.now()
    }
    await KYCModel.addLogEntry(tokenId, logEntry)

    return res.status(201).json({ success: true, data: kyc })
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

// --- Get all KYCs ---
export const getAllKYCs = async (_req: Request, res: Response) => {
  try {
    const kycs = await KYCModel.getAll()
    return res.json({ success: true, data: kycs })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- Get KYC by tokenId ---
export const getKYCById = async (req: Request, res: Response) => {
  try {
    const kyc = await KYCModel.getById(req.params.tokenId)
    if (!kyc) return res.status(404).json({ success: false, message: "KYC not found" })
    return res.json({ success: true, data: kyc })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- Get KYCs by owner ---
export const getKYCsByOwner = async (req: Request, res: Response) => {
  try {
    const owner = req.params.owner
    const kycs = await KYCModel.getByOwner(owner)
    return res.json({ success: true, data: kycs })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- Update KYC ---
export const updateKYC = async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId
    const { action, txHash, executor, ...updateData } = req.body

    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!executor) return res.status(400).json({ success: false, message: "Missing executor field" })

    const kyc = await KYCModel.update(tokenId, updateData)
    if (!kyc) return res.status(404).json({ success: false, message: "KYC not found" })

    const logEntry: KYCLogEntry = {
      action: action as KYCLogEntry["action"],
      txHash: txHash || "",
      account: kyc.owner,
      executor,
      timestamp: Date.now()
    }
    await KYCModel.addLogEntry(tokenId, logEntry)

    return res.json({ success: true, data: kyc })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- Delete KYC ---
export const deleteKYC = async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId
    const { action, txHash, executor } = req.body

    if (!action) return res.status(400).json({ success: false, message: "Missing action field" })
    if (!executor) return res.status(400).json({ success: false, message: "Missing executor field" })

    const kyc = await KYCModel.getById(tokenId)
    if (!kyc) return res.status(404).json({ success: false, message: "KYC not found" })

    const deleted = await KYCModel.delete(tokenId)
    if (!deleted) return res.status(500).json({ success: false, message: "Failed to delete KYC" })

    const logEntry: KYCLogEntry = {
      action: action as KYCLogEntry["action"],
      txHash: txHash || "",
      account: kyc.owner,
      executor,
      timestamp: Date.now()
    }
    await KYCModel.addLogEntry(tokenId, logEntry)

    return res.json({ success: true, message: "KYC deleted successfully" })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// --- Get KYC Logs ---
export const getKYCLogs = async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId
    const logs = await KYCModel.getLogs(tokenId)
    if (!logs) return res.status(404).json({ success: false, message: "No logs found" })
    return res.json({ success: true, data: logs })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
