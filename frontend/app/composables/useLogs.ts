import { useWallet } from './useWallets'

export async function getWalletLogs() {
  const { $apiBase } = useNuxtApp()
  const { account } = useWallet()

  if (!account.value) return []
  
  try {
    const res = await fetch(`${$apiBase}/wallet/${account.value}/logs`)
    if (!res.ok) {
      console.warn('Failed to fetch wallet logs', res.status, res.statusText)
      return []
    }
    return await res.json()
  } catch (err) {
    console.error('Error fetching wallet logs:', err)
    return []
  }
}

export async function getContractLogs() {
  const { $apiBase } = useNuxtApp()
  
  try {
    const res = await fetch(`${$apiBase}/contract/`)
    if (!res.ok) {
      console.warn('Failed to fetch contract logs', res.status, res.statusText)
      return []
    }
    return await res.json()
  } catch (err) {
    console.error('Error fetching contract logs:', err)
    return []
  }
}

export async function getContractLogsByAddress(contractAddress: `0x${string}`) {
  const { $apiBase } = useNuxtApp()
  
  if (!contractAddress) {
    console.warn('No contract address provided')
    return []
  }

  try {
    const res = await fetch(`${$apiBase}/contract/${contractAddress}/details`)
    if (!res.ok) {
      console.warn('Failed to fetch contract logs by address', res.status, res.statusText)
      return []
    }
    return await res.json()
  } catch (err) {
    console.error(`Error fetching logs for contract ${contractAddress}:`, err)
    return []
  }
}
