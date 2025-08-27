import { ref, readonly } from 'vue'
import { Chain } from '~/config/chain'

const account = ref<string | null>(null)
const walletClient = ref<any>(null)
const listenersAttached = ref(false)

export async function connectWallet() {
  const { $apiBase } = useNuxtApp()
  
  if (!window.ethereum) throw new Error('MetaMask not installed')

  const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts[0] ?? null

  if (!walletClient.value) {
    const { createWalletClient, custom } = await import('viem')
    walletClient.value = createWalletClient({
      transport: custom(window.ethereum),
      chain: Chain
    })
  }

  if (!listenersAttached.value) {
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    listenersAttached.value = true
  }

  // Log login ke backend
  if (account.value) {
    try {
      await fetch(`${$apiBase}/wallet/log-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.value })
      })
    } catch (err) {
      console.warn('Failed to log wallet login', err)
    }
  }

  return account.value
}

export async function disconnectWallet() {
  const { $apiBase } = useNuxtApp()
  
  if (account.value) {
    try {
      await fetch(`${$apiBase}/wallet/log-disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: account.value })
      })
    } catch (err) {
      console.warn('Failed to log wallet disconnect', err)
    }
  }

  account.value = null
  walletClient.value = null
}

const handleAccountsChanged = (accounts: string[]) => {
  account.value = accounts[0] ?? null
}

export function useWallet() {
  return {
    account: readonly(account),
    walletClient,
    connectWallet,
    disconnectWallet,
  }
}
