import { useNuxtApp } from "#app"
import type { NFT } from "~/types/NFT"

// --- Safe parsers ---
function safeParseHex(value: unknown): `0x${string}` | null {
  if (typeof value === "string" && value.startsWith("0x")) return value as `0x${string}`
  return null
}

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

// --- Parse raw NFT from backend ---
function parseNFT(n: any): NFT {
  return {
    tokenId: n.tokenId,
    owner: safeParseHex(n.owner) ?? "",
    fileHash: n.fileHash,
    metadataUrl: n.metadataUrl,
    documentUrl: n.documentUrl ?? null,
    name: n.name ?? `NFT-${n.tokenId}`,
    description: n.description ?? "",
    createdAt: safeParseDate(n.createdAt) ?? Date.now(),
    updatedAt: safeParseDate(n.updatedAt) ?? Date.now(),
  }
}

// --- Composables ---
export async function getAllNfts(): Promise<NFT[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data.map(parseNFT) : []
  } catch (err) {
    console.error("Error fetching NFTs:", err)
    return []
  }
}

export async function getNftById(tokenId: string): Promise<NFT | null> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft/${tokenId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.data ? parseNFT(data.data) : null
  } catch (err) {
    console.error(`Error fetching NFT ${tokenId}:`, err)
    return null
  }
}

export async function getNftsByOwner(owner: string): Promise<NFT[]> {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft/owner/${owner}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data.map(parseNFT) : []
  } catch (err) {
    console.error(`Error fetching NFTs by owner ${owner}:`, err)
    return []
  }
}

export async function createNft(payload: Partial<NFT>) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to create NFT")
    const data = await res.json()
    return data
  } catch (err) {
    console.error("Error creating NFT:", err)
    throw err
  }
}

export async function updateNft(tokenId: string, payload: Partial<NFT>) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft/${tokenId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Failed to update NFT")
    const data = await res.json()
    return data
  } catch (err) {
    console.error(`Error updating NFT ${tokenId}:`, err)
    throw err
  }
}

export async function deleteNft(tokenId: string) {
  const { $apiBase } = useNuxtApp()
  try {
    const res = await fetch(`${$apiBase}/nft/${tokenId}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete NFT")
    const data = await res.json()
    return data
  } catch (err) {
    console.error(`Error deleting NFT ${tokenId}:`, err)
    throw err
  }
}
