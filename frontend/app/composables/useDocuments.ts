// composables/useDocuments.ts
import { useRuntimeConfig } from "#app"
import { useActivityLogs } from "~/composables/useActivityLogs"
import type { Document, DocumentLogEntry } from "~/types/Document"

// --- Safe parsers ---
function safeParseDate(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || Date.now()
  return Date.now()
}

// --- Parse raw Document from backend ---
function parseDocument(d: any): Document {
  return {
    tokenId: Number(d?.tokenId) ?? 0,
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
    history: Array.isArray(d?.history) ? d.history.map(parseDocumentLog) : [],
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

// --- Composable ---
export function useDocuments() {
  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase
  const { addActivityLog } = useActivityLogs()

  // --- Queries ---
  const getAllDocuments = async (): Promise<Document[]> => {
    try {
      const res = await fetch(`${$apiBase}/document`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseDocument) : []
    } catch (err) {
      console.error("[getAllDocuments] Error:", err)
      return []
    }
  }

  const getDocumentById = async (tokenId: number): Promise<Document | null> => {
    try {
      const res = await fetch(`${$apiBase}/document/${tokenId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ? parseDocument(data.data) : null
    } catch (err) {
      console.error(`[getDocumentById] Error ${tokenId}:`, err)
      return null
    }
  }

  const getDocumentsByOwner = async (owner: string): Promise<Document[]> => {
    try {
      const res = await fetch(`${$apiBase}/document/owner/${owner}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseDocument) : []
    } catch (err) {
      console.error(`[getDocumentsByOwner] Error ${owner}:`, err)
      return []
    }
  }

  const getDocumentsByContract = async (contractAddr: string): Promise<Document[]> => {
    try {
      const res = await fetch(`${$apiBase}/document/contract/${contractAddr}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseDocument) : []
    } catch (err) {
      console.error(`[getDocumentsByContract] Error ${contractAddr}:`, err)
      return []
    }
  }

  const getDocumentLogs = async (tokenId: number): Promise<DocumentLogEntry[]> => {
    try {
      const res = await fetch(`${$apiBase}/document/${tokenId}/logs`)
      if (!res.ok) return []
      const data = await res.json()
      const history = data?.data?.history
      return Array.isArray(history) ? history.map(parseDocumentLog) : []
    } catch (err) {
      console.error(`[getDocumentLogs] Error ${tokenId}:`, err)
      return []
    }
  }

  // --- Mutations ---
  const attachDocument = async (
    contractAddr: string,
    payload: Partial<Document>,
    account: string,
    txHash?: string
  ) => {
    const res = await fetch(`${$apiBase}/document/contract/${contractAddr}/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action: "mintDocument", signer: account, txHash }),
    })
    if (!res.ok) throw new Error("Failed to attach document")
    const data = await res.json()
    const doc = parseDocument(data.data)

    await addActivityLog(doc.owner, {
      type: "backend",
      action: "attachDocument",
      contractAddress: contractAddr,
      extra: { tokenId: doc.tokenId, name: doc.name },
      tags: ["document", "attach"],
    })

    return doc
  }

  interface UpdateDocumentArgs {
    tokenId: number
    payload: Partial<Document>
    account: string
    txHash?: string
    action?: string
    status?: string
  }

  const updateDocument = async ({
    tokenId,
    payload,
    account,
    txHash,
    action = "updateDocument",
    status,
  }: UpdateDocumentArgs) => {
    const res = await fetch(`${$apiBase}/document/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action, account, txHash, status }),
    })
    if (!res.ok) throw new Error("Failed to update document")
    const data = await res.json()
    const doc = parseDocument(data.data)

    await addActivityLog(account, {
      type: "backend",
      action,
      extra: { tokenId: doc.tokenId, name: doc.name, signer: payload.signer },
      tags: ["document", "update"],
    })

    return doc
  }

  const deleteDocument = async (tokenId: number, account: string, txHash?: string) => {
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
  }

  return {
    getAllDocuments,
    getDocumentById,
    getDocumentsByOwner,
    getDocumentsByContract,
    getDocumentLogs,
    attachDocument,
    updateDocument,
    deleteDocument,
  }
}
