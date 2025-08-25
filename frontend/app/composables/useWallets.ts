import { ref, readonly } from 'vue'

const account = ref<string | null>(null)
const walletClient = ref<any>(null)
const listenersAttached = ref(false)

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not installed')

  const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts[0] ?? null

  if (!walletClient.value) {
    const { createWalletClient, custom } = await import('viem')
    walletClient.value = createWalletClient({
      transport: custom(window.ethereum),
      chain: {
        id: 31337,
        name: 'Hardhat Local',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
        testnet: true,
      },
    })
  }

  if (!listenersAttached.value) {
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    listenersAttached.value = true
  }

  return account.value
}

export function disconnectWallet() {
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
