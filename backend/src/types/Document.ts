export type DocType = "Invoice" | "B/L" | "COO" | "PackingList" | "Other"

export interface Document {
  tokenId: number
  owner: string
  fileHash: string
  uri: string
  docType: DocType
  linkedContracts: string[]
  createdAt: number
  updatedAt?: number
  signer?: string 
  name?: string
  description?: string
  metadataUrl?: string
}
