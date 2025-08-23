import { ref } from 'vue'
import { createPublicClient, http, type Chain } from 'viem'

interface Wallet {
  address: string
  balance: number
}

export const useWallets = () => {
  const wallets = ref<Wallet[]>([])
  const loading = ref(false)

  const addresses = [
    '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  ]

  // Hardhat local chain config
  const localChain: Chain = {
    id: 31337,
    name: 'Hardhat Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
    testnet: true,
  }

  const client = createPublicClient({
    chain: localChain,
    transport: http(localChain.rpcUrls.default.http[0]),
  })

  const fetchWallets = async () => {
    loading.value = true
    try {
        wallets.value = await Promise.all(
        addresses.map(async (address) => {
            const balance = await client.getBalance({ address: address as `0x${string}` })
            return { address, balance: Number(balance) / 1e18 } // wei -> ETH
        })
        )
    } finally {
        loading.value = false
    }
    }

  return { wallets, loading, fetchWallets }
}
