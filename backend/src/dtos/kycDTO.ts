import { KYC } from "../types/Kyc.js"

export default class KYCDTO {
  tokenId: string
  owner: string
  fileHash: string
  metadataUrl: string
  documentUrl?: string
  name?: string
  description?: string
  createdAt: number
  updatedAt?: number

  constructor(data: Partial<KYC>) {
    if (!data.tokenId) throw new Error("tokenId is required")
    if (!data.owner) throw new Error("owner is required")
    if (!data.fileHash) throw new Error("fileHash is required")
    if (!data.metadataUrl) throw new Error("metadataUrl is required")

    this.tokenId = data.tokenId
    this.owner = data.owner
    this.fileHash = data.fileHash
    this.metadataUrl = data.metadataUrl
    this.documentUrl = data.documentUrl
    this.name = data.name || `NFT-${data.tokenId}`
    this.description = data.description || ""
    this.createdAt = data.createdAt || Date.now()
    this.updatedAt = data.updatedAt || Date.now()
  }

  toFirestore(): KYC {
    return {
      tokenId: this.tokenId,
      owner: this.owner,
      fileHash: this.fileHash,
      metadataUrl: this.metadataUrl,
      documentUrl: this.documentUrl,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
