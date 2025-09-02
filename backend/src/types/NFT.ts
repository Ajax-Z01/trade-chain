export interface NFT {
  tokenId: string
  owner: string
  fileHash: string
  metadataUrl: string
  documentUrl?: string
  name?: string
  description?: string
  createdAt: number
  updatedAt?: number
}
