import { useNuxtApp } from "#app"
import type { Document, DocumentLogEntry } from "~/types/Document"
import { useActivityLogs } from "~/composables/useActivityLogs"

// --- Safe parsers ---
function safeParseDate(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || Date.now()
  return Date.now()
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
    createdAt: safeParseDate(d?.createdAt),
    updatedAt: safeParseDate(d?.updatedAt),
    signer: d?.signer ?? undefined,
    name: d?.name ?? "",
    description: d?.description ?? "",
    metadataUrl: d?.metadataUrl ?? "",
    status: d?.status ?? "Draft",
    history: Array.isArray(d?.history) ? d.history : [],
  }
}

// --- Parse raw DocumentLogEntry ---
function parseDocumentLog(d: any): DocumentLogEntry {
  return {
    action: d.action,
    account: d.account,
    signer: d.signer,
    txHash: d.txHash,
    linkedContract: d.linkedContract,
    extra: d.extra,
    timestamp: safeParseDate(d.timestamp),
    onChainInfo: d.onChainInfo,
  }
}

// --- Composables ---
export async function getDocument(tokenId: number): Promise<Document | null> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data ? parseDocument(data) : null
  } catch (err) {
    console.error(`Error fetching document ${tokenId}:`, err)
    return null
  }
}

export async function getAllDocuments(): Promise<Document[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document`)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.data) ? json.data.map(parseDocument) : []
  } catch (err) {
    console.error("Error fetching documents:", err)
    return []
  }
}

export async function getDocumentsByOwner(owner: string): Promise<Document[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/owner/${owner}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data.map(parseDocument) : []
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
    const json = await res.json()

    if (!json?.data || !Array.isArray(json.data)) return []
    return json.data.map(parseDocument)
  } catch (err) {
    console.error(`Error fetching documents for contract ${contractAddr}:`, err)
    return []
  }
}

export async function getDocumentLogs(tokenId: number): Promise<DocumentLogEntry[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}/logs`)
    if (!res.ok) return []

    const json = await res.json()
    const history = json?.data?.history
    if (!Array.isArray(history)) return []

    return history.map(parseDocumentLog)
  } catch (err) {
    console.error(`Error fetching document logs ${tokenId}:`, err)
    return []
  }
}

export async function attachDocument(
  contractAddr: string,
  payload: Partial<Document>,
  account: string,
  txHash?: string
) {
  const { $apiBase } = useNuxtApp()
  const { addActivityLog } = useActivityLogs()

  try {
    const res = await fetch(`${$apiBase}/document/contract/${contractAddr}/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action: "mintDocument", signer: account, txHash }),
    })
    if (!res.ok) throw new Error("Failed to attach document")
    const data = await res.json()
    if (!data) throw new Error("No document data returned from backend")
    const doc = parseDocument(data)

    await addActivityLog(doc.owner, {
      type: "backend",
      action: "attachDocument",
      contractAddress: contractAddr,
      extra: { tokenId: doc.tokenId, name: doc.name },
      tags: ["document", "attach"],
    })

    return doc
  } catch (err) {
    console.error(`Error attaching document to contract ${contractAddr}:`, err)
    throw err
  }
}

export async function updateDocument(
  tokenId: number,
  payload: Partial<Document>,
  account: string,
  txHash?: string,
  action: string = "reviewDocument"
) {
  const { $apiBase } = useNuxtApp()
  const { addActivityLog } = useActivityLogs()

  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action, account, txHash }),
    })
    if (!res.ok) throw new Error("Failed to update document")
    const data = await res.json()
    const doc = parseDocument(data)

    await addActivityLog(account, {
      type: "backend",
      action: "updateDocument",
      extra: { tokenId: doc.tokenId, name: doc.name },
      tags: ["document", "update"],
    })

    return doc
  } catch (err) {
    console.error(`Error updating document ${tokenId}:`, err)
    throw err
  }
}

export async function deleteDocument(
  tokenId: number,
  account: string,
  txHash?: string
) {
  const { $apiBase } = useNuxtApp()
  const { addActivityLog } = useActivityLogs()

  try {
    const res = await fetch(`${$apiBase}/document/${tokenId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revokeDocument", account, txHash }),
    })
    if (!res.ok) throw new Error("Failed to delete document")
    const data = await res.json()

    await addActivityLog(account, {
      type: "backend",
      action: "deleteDocument",
      extra: { tokenId },
      tags: ["document", "delete"],
    })

    return data?.success ?? true
  } catch (err) {
    console.error(`Error deleting document ${tokenId}:`, err)
    throw err
  }
}

export function useDocuments() {
  return {
    getDocument,
    getAllDocuments,
    getDocumentsByOwner,
    getDocumentsByContract,
    getDocumentLogs,
    attachDocument,
    updateDocument,
    deleteDocument,
  }
}
