import { useRuntimeConfig } from '#app'
import { ref, readonly, onMounted } from 'vue'
import { Chain } from '~/config/chain'
import { getAddress } from 'ethers'
import type { WalletLog } from '~/types/Wallet'

const account = ref<string | null>(null)
const walletClient = ref<any>(null)
const listenersAttached = ref(false)

let addActivityLog: ((account: string, log: any) => Promise<any>) | undefined

async function initActivityLogs() {
  if (!addActivityLog) {
    const composable = await import('~/composables/useActivityLogs')
    addActivityLog = composable.useActivityLogs().addActivityLog
  }
}

async function initWallet() {
  if (!window.ethereum) return
  await initActivityLogs()

  try {
    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' })
    if (accounts.length > 0) {
      account.value = getAddress(accounts[0] as string)
      if (!walletClient.value) {
        const { createWalletClient, custom } = await import('viem')
        walletClient.value = createWalletClient({
          transport: custom(window.ethereum),
          chain: Chain,
        })
      }
    }
  } catch (err) {
    console.warn('Failed to check wallet accounts', err)
  }

  if (!listenersAttached.value) {
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    listenersAttached.value = true
  }
}

export async function connectWallet() {
  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase
  await initActivityLogs()

  if (!window.ethereum) throw new Error('MetaMask not installed')

  const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts.length > 0 ? getAddress(accounts[0] as string) : null

  if (!walletClient.value) {
    const { createWalletClient, custom } = await import('viem')
    walletClient.value = createWalletClient({
      transport: custom(window.ethereum),
      chain: Chain,
    })
  }

  if (!listenersAttached.value) {
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    listenersAttached.value = true
  }

  if (account.value) {
    try {
      await addActivityLog?.(account.value, {
        type: 'backend',
        action: 'walletConnect',
        tags: ['wallet', 'connect'],
      })
    } catch (err) {
      console.warn('Failed to log wallet connect (activity)', err)
    }

    try {
      await fetch(`${$apiBase}/wallet/log-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.value }),
      })
    } catch (err) {
      console.warn('Failed to log wallet connect (wallet)', err)
    }
  }

  return account.value
}

export async function disconnectWallet() {
  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase
  await initActivityLogs()

  if (account.value) {
    try {
      await addActivityLog?.(account.value, {
        type: 'backend',
        action: 'walletDisconnect',
        tags: ['wallet', 'disconnect'],
      })
    } catch (err) {
      console.warn('Failed to log wallet disconnect (activity)', err)
    }

    try {
      await fetch(`${$apiBase}/wallet/log-disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.value }),
      })
    } catch (err) {
      console.warn('Failed to log wallet disconnect (wallet)', err)
    }
  }

  account.value = null
  walletClient.value = null
}

// Fetch all wallet logs for an account
export async function fetchAllWalletLogs(): Promise<WalletLog[]> {
  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase

  try {
    const res = await fetch(`${$apiBase}/wallet/logs`)
    const data: WalletLog[] = await res.json() || []

    return data
      .map((log, idx) => ({ ...log, timestamp: Number(log.timestamp), _idx: idx }))
      .sort((a, b) => b.timestamp - a.timestamp || b._idx - a._idx)
  } catch (err) {
    console.warn('Failed to fetch wallet logs', err)
    return []
  }
}

const handleAccountsChanged = (accounts: string[]) => {
  account.value = accounts.length > 0 ? getAddress(accounts[0] as string) : null
}

export function useWallet() {
  onMounted(() => {
    initWallet()
  })

  return {
    account: readonly(account),
    walletClient,
    connectWallet,
    disconnectWallet,
    fetchAllWalletLogs,
  }
}
