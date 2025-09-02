import { Router } from "express"
import {
  createNFT,
  getNFTs,
  getNFT,
  getNFTsByOwnerController,
  updateNFTController,
  deleteNFTController,
} from "../controllers/nftController.js"

const router = Router()

// Create new NFT
router.post("/", createNFT)

// Get all NFTs
router.get("/", getNFTs)

// Get NFT by tokenId
router.get("/:tokenId", getNFT)

// Get NFTs by owner
router.get("/owner/:owner", getNFTsByOwnerController)

// Update NFT
router.put("/:tokenId", updateNFTController)

// Delete NFT
router.delete("/:tokenId", deleteNFTController)

export default router
