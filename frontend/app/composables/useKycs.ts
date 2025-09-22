import { useNuxtApp } from "#app"
import type { KYC, KYCLogs } from "~/types/Kyc"
import { useActivityLogs } from "~/composables/useActivityLogs"
import { useWallet } from "~/composables/useWallets"

// --- Safe parsers ---
function safeParseHex(value: unknown): `0x${string}` | null {
  if (typeof value === "string" && value.startsWith("0x")) return value as `0x${string}`
  return null
}

function safeParseDate(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  return Date.now()
}

// --- Parse raw KYC from backend ---
function parseKYC(n: any): KYC {
  return {
    tokenId: n.tokenId,
    owner: safeParseHex(n.owner) ?? "",
    fileHash: n.fileHash,
    metadataUrl: n.metadataUrl,
    documentUrl: n.documentUrl ?? null,
    name: n.name ?? `KYC-${n.tokenId}`,
    description: n.description ?? "",
    createdAt: safeParseDate(n.createdAt),
    updatedAt: safeParseDate(n.updatedAt),
  }
}

// --- Composable ---
export function useKYC() {
  const { $apiBase } = useNuxtApp()
  const { account } = useWallet()
  const { addActivityLog } = useActivityLogs()

  // --- CRUD ---
  const getAllKycs = async (): Promise<KYC[]> => {
    try {
      const res = await fetch(`${$apiBase}/kyc`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseKYC) : []
    } catch (err) {
      console.error("Error fetching KYCs:", err)
      return []
    }
  }

  const getKycById = async (tokenId: string): Promise<KYC | null> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/${tokenId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ? parseKYC(data.data) : null
    } catch (err) {
      console.error(`Error fetching KYC ${tokenId}:`, err)
      return null
    }
  }

  const getKycsByOwner = async (owner: string): Promise<KYC[]> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/owner/${owner}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseKYC) : []
    } catch (err) {
      console.error(`Error fetching KYCs by owner ${owner}:`, err)
      return []
    }
  }

  const getKycLogs = async (tokenId: string): Promise<KYCLogs | null> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/${tokenId}/logs`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ?? null
    } catch (err) {
      console.error(`Error fetching KYC logs ${tokenId}:`, err)
      return null
    }
  }

  const createKyc = async (payload: Partial<KYC>) => {
    try {
      const res = await fetch(`${$apiBase}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create KYC")
      const data = await res.json()
      const kyc = parseKYC(data.data)

      // log activity
      await addActivityLog(kyc.owner || account.value as string, {
        type: "backend",
        action: "createKyc",
        extra: { tokenId: kyc.tokenId, name: kyc.name },
        tags: ["kyc", "create"],
      })

      return kyc
    } catch (err) {
      console.error("Error creating KYC:", err)
      throw err
    }
  }

  const updateKyc = async (tokenId: string, payload: Partial<KYC>) => {
    try {
      const res = await fetch(`${$apiBase}/kyc/${tokenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to update KYC")
      const data = await res.json()
      const kyc = parseKYC(data.data)

      // log activity
      await addActivityLog(kyc.owner || account.value as string, {
        type: "backend",
        action: "updateKyc",
        extra: { tokenId: kyc.tokenId, name: kyc.name },
        tags: ["kyc", "update"],
      })

      return kyc
    } catch (err) {
      console.error(`Error updating KYC ${tokenId}:`, err)
      throw err
    }
  }

  const deleteKyc = async (tokenId: string) => {
    try {
      const kyc = await getKycById(tokenId)
      const owner = kyc?.owner || account.value || "0x0000000000000000000000000000000000000000"

      const res = await fetch(`${$apiBase}/kyc/${tokenId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete KYC")
      const data = await res.json()

      // log activity
      await addActivityLog(owner, {
        type: "backend",
        action: "deleteKyc",
        extra: { tokenId },
        tags: ["kyc", "delete"],
      })

      return data
    } catch (err) {
      console.error(`Error deleting KYC ${tokenId}:`, err)
      throw err
    }
  }

  return {
    getAllKycs,
    getKycById,
    getKycsByOwner,
    getKycLogs,
    createKyc,
    updateKyc,
    deleteKyc,
  }
}
