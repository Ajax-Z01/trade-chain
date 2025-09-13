import { ref, readonly, onMounted } from 'vue'
import { Chain } from '~/config/chain'
import { getAddress } from 'ethers'

const account = ref<string | null>(null)
const walletClient = ref<any>(null)
const listenersAttached = ref(false)

async function initWallet() {
  if (!window.ethereum) return

  try {
    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' })
    if (accounts.length > 0) {
      account.value = getAddress(accounts[0] as string)
      if (!walletClient.value) {
        const { createWalletClient, custom } = await import('viem')
        walletClient.value = createWalletClient({
          transport: custom(window.ethereum),
          chain: Chain
        })
      }
    }
    console.log("account", accounts)
  } catch (err) {
    console.warn('Failed to check wallet accounts', err)
  }

  if (!listenersAttached.value) {
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    listenersAttached.value = true
  }
}

export async function connectWallet() {
  const { $apiBase } = useNuxtApp()

  if (!window.ethereum) throw new Error('MetaMask not installed')

  const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts.length > 0 ? getAddress(accounts[0] as string) : null

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

  // log ke backend
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

// selalu pakai getAddress agar EIP-55
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
  }
}
