import { ref } from 'vue'
import { createWalletClient, custom } from 'viem'

const account = ref<string | null>(null)
let walletClient: ReturnType<typeof createWalletClient> | null = null

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not installed')

  // Minta akses akun
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts[0] as string

  // Buat wallet client Viem dari provider MetaMask
  walletClient = createWalletClient({
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

export function useWallet() {
  return {
    account,
    walletClient,
    connectWallet,
  }
}
