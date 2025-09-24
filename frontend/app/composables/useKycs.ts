import { useRuntimeConfig } from '#app'
import { useActivityLogs } from '~/composables/useActivityLogs'
import { useWallet } from '~/composables/useWallets'
import type { KYC, KYCLogs } from '~/types/Kyc'

// --- Parse raw KYC from backend ---
function parseKYC(n: any): KYC {
  return {
    tokenId: String(n.tokenId),
    owner: n.owner ?? '',
    fileHash: n.fileHash ?? '',
    metadataUrl: n.metadataUrl ?? '',
    documentUrl: n.documentUrl ?? null,
    name: n.name ?? `KYC-${n.tokenId}`,
    description: n.description ?? '',
    createdAt: n.createdAt ? Number(n.createdAt) : Date.now(),
    updatedAt: n.updatedAt ? Number(n.updatedAt) : Date.now(),
    history: Array.isArray(n.history)
      ? n.history.map((log: any) => ({
          action: log.action,
          txHash: log.txHash,
          account: log.account,
          timestamp: Number(log.timestamp),
          extra: log.extra ?? {},
        }))
      : [],
  }
}

// --- Composable ---
export function useKYC() {
  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase
  const { account } = useWallet()
  const { addActivityLog } = useActivityLogs()

  // --- Get all KYCs ---
  const getAllKycs = async (): Promise<KYC[]> => {
    try {
      const res = await fetch(`${$apiBase}/kyc`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseKYC) : []
    } catch (err) {
      console.error('[getAllKycs] Error:', err)
      return []
    }
  }

  // --- Get KYC by tokenId ---
  const getKycById = async (tokenId: string): Promise<KYC | null> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/${tokenId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ? parseKYC(data.data) : null
    } catch (err) {
      console.error(`[getKycById] Error ${tokenId}:`, err)
      return null
    }
  }

  // --- Get KYCs by owner ---
  const getKycsByOwner = async (owner: string): Promise<KYC[]> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/owner/${owner}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.data) ? data.data.map(parseKYC) : []
    } catch (err) {
      console.error(`[getKycsByOwner] Error ${owner}:`, err)
      return []
    }
  }

  // --- Get KYC Logs ---
  const getKycLogs = async (tokenId: string): Promise<KYCLogs | null> => {
    try {
      const res = await fetch(`${$apiBase}/kyc/${tokenId}/logs`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ?? null
    } catch (err) {
      console.error(`[getKycLogs] Error ${tokenId}:`, err)
      return null
    }
  }

  // --- Create KYC ---
  const createKyc = async (payload: Partial<KYC> & { action: string; executor: string }) => {
    const res = await fetch(`${$apiBase}/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to create KYC')
    const data = await res.json()
    const kyc = parseKYC(data.data)

    await addActivityLog(kyc.owner || (account.value as string), {
      type: 'backend',
      action: payload.action,
      extra: { tokenId: kyc.tokenId, name: kyc.name, executor: payload.executor },
      tags: ['kyc', 'create'],
    })

    return kyc
  }

  // --- Update KYC ---
  const updateKyc = async (
    tokenId: string,
    payload: Partial<KYC> & { action: string; executor: string }
  ) => {
    const res = await fetch(`${$apiBase}/kyc/${tokenId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to update KYC')
    const data = await res.json()
    const kyc = parseKYC(data.data)

    await addActivityLog(kyc.owner || (account.value as string), {
      type: 'backend',
      action: payload.action,
      extra: { tokenId: kyc.tokenId, name: kyc.name, executor: payload.executor },
      tags: ['kyc', 'update'],
    })

    return kyc
  }

  // --- Delete KYC ---
  const deleteKyc = async (tokenId: string, executor: string) => {
    const kyc = await getKycById(tokenId)
    const owner = kyc?.owner || (account.value as string)

    const res = await fetch(`${$apiBase}/kyc/${tokenId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteKYC', executor }),
    })
    if (!res.ok) throw new Error('Failed to delete KYC')
    const data = await res.json()

    await addActivityLog(owner, {
      type: 'backend',
      action: 'deleteKYC',
      extra: { tokenId, executor },
      tags: ['kyc', 'delete'],
    })

    return data
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
