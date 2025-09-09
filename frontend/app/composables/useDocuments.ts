import { useNuxtApp } from "#app"
import type { Document, DocType } from "~/types/Document"

// --- Safe parsers ---
function safeParseDate(value: unknown): number | null {
  try {
    if (typeof value === "number" || typeof value === "string") {
      return Number(value)
    }
  } catch (err: unknown) {
    console.warn('safeParseDate error:', err)
  }
  return null
}

// --- Parse raw Document from backend ---
function parseDocument(d: any): Document {
  return {
    tokenId: d?.tokenId ?? 0,
    owner: d?.owner ?? "",
    fileHash: d?.fileHash ?? "",
    uri: d?.uri ?? "",
    docType: d?.docType ?? "Other",
    linkedContracts: Array.isArray(d?.linkedContracts) ? d.linkedContracts : [],
    createdAt: safeParseDate(d?.createdAt) ?? Date.now(),
    updatedAt: safeParseDate(d?.updatedAt) ?? Date.now(),
    signer: d?.signer ?? undefined,
    name: d?.name ?? "",
    description: d?.description ?? "",
    metadataUrl: d?.metadataUrl ?? "",
  }
}

// --- Composables ---
export async function getDocument(tokenId: number): Promise<Document | null> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.data ? parseDocument(data.data) : null
  } catch (err) {
    console.error(`Error fetching document ${tokenId}:`, err)
    return null
  }
}

export async function getDocumentsByOwner(owner: string): Promise<Document[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/owner/${owner}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data.map(parseDocument) : []
  } catch (err) {
    console.error(`Error fetching documents by owner ${owner}:`, err)
    return []
  }
}

export async function getDocumentsByContract(contractAddr: string): Promise<Document[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/contract/${contractAddr}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data.map(parseDocument) : []
  } catch (err) {
    console.error(`Error fetching documents for contract ${contractAddr}:`, err)
    return []
  }
}

export async function attachDocument(contractAddr: string, payload: Partial<Document>) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/contract/${contractAddr}/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to attach document")
    const data = await res.json()
    console.log('attachDocument response', data)
    if (!data) throw new Error('No document data returned from backend')
    return parseDocument(data)
  } catch (err) {
    console.error(`Error attaching document to contract ${contractAddr}:`, err)
    throw err
  }
}

export async function updateDocument(tokenId: number, payload: Partial<Document>) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to update document")
    const data = await res.json()
    return parseDocument(data.data)
  } catch (err) {
    console.error(`Error updating document ${tokenId}:`, err)
    throw err
  }
}

export async function deleteDocument(tokenId: number) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete document")
    const data = await res.json()
    return data.success ?? true
  } catch (err) {
    console.error(`Error deleting document ${tokenId}:`, err)
    throw err
  }
}

export function useDocuments() {
  return {
    getDocument,
    getDocumentsByOwner,
    getDocumentsByContract,
    attachDocument,
    updateDocument,
    deleteDocument,
  }
}
