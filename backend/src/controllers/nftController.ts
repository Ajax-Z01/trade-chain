import { Request, Response } from "express"
import {
  addNFT,
  getNFTById,
  getAllNFTs,
  getNFTsByOwner,
  updateNFT,
  deleteNFT,
} from "../models/nftModel.js"
import type { NFT } from "../types/NFT.js"

// Create NFT
export const createNFT = async (req: Request, res: Response) => {
  try {
    const nft: NFT = await addNFT(req.body)
    return res.status(201).json({
      success: true,
      data: nft,
    })
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

// Get all NFTs
export const getNFTs = async (_req: Request, res: Response) => {
  try {
    const nfts = await getAllNFTs()
    return res.json({ success: true, data: nfts })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// Get NFT by tokenId
export const getNFT = async (req: Request, res: Response) => {
  try {
    const nft = await getNFTById(req.params.tokenId)
    if (!nft) return res.status(404).json({ success: false, message: "NFT not found" })

    return res.json({ success: true, data: nft })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// Get NFTs by owner
export const getNFTsByOwnerController = async (req: Request, res: Response) => {
  try {
    const nfts = await getNFTsByOwner(req.params.owner)
    return res.json({ success: true, data: nfts })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// Update NFT
export const updateNFTController = async (req: Request, res: Response) => {
  try {
    const updated = await updateNFT(req.params.tokenId, req.body)
    if (!updated) return res.status(404).json({ success: false, message: "NFT not found" })

    return res.json({ success: true, data: updated })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// Delete NFT
export const deleteNFTController = async (req: Request, res: Response) => {
  try {
    const deleted = await deleteNFT(req.params.tokenId)
    if (!deleted) return res.status(404).json({ success: false, message: "NFT not found" })

    return res.json({ success: true, message: "NFT deleted successfully" })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
