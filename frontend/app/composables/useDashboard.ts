// composables/useDashboard.ts
import { ref, computed } from 'vue'
import { createPublicClient, http, type Chain } from 'viem'

// --- Wallet type
interface Wallet {
  address: `0x${string}`
  balance: number
}

// --- Transaction type (event log)
interface RecentTx {
  from: `0x${string}`
  to: `0x${string}`
  value: number
  hash: string
}

export const useDashboard = () => {
  // --- State
  const wallets = ref<Wallet[]>([])
  const deployedContracts = ref<`0x${string}`[]>([])
  const recentTxs = ref<RecentTx[]>([])
  const loading = ref(false)

  // --- Addresses / contracts (dummy, bisa diubah live)
  const walletAddresses: `0x${string}`[] = [
    '0xf39Fd6e51aad88f6f4ce6aB8827279cffFb92266',
    '0xc113755CDBf5D3831B0784A6FD26EB098c601B36',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x8b054a90237e01Abb8D7333a873f5fc919790eA4',
  ]

  const contractAddresses: `0x${string}`[] = [
    '0x1234567890abcdef1234567890abcdef12345678', // ganti live
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ]

  // --- Hardhat local chain
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

  // --- Computed
  const totalWallets = computed(() => wallets.value.length)
  const totalContracts = computed(() => deployedContracts.value.length)
  const totalRecentTxs = computed(() => recentTxs.value.length)

  // --- Fetch wallets balances
  const fetchWallets = async () => {
    wallets.value = await Promise.all(
      walletAddresses.map(async (address) => {
        const balance = await client.getBalance({ address })
        return { address, balance: Number(balance) / 1e18 }
      })
    )
  }

  // --- Fetch deployed contracts
  const fetchContracts = async () => {
    // Jika pakai factory contract + event logs bisa diganti ini
    deployedContracts.value = contractAddresses
  }

  // --- Fetch recent transactions
  const fetchRecentTxs = async () => {
    const block = await client.getBlock({ blockTag: 'latest' })
    const txs: RecentTx[] = []

    for (const hash of block.transactions.slice(-5)) { // ambil 5 terakhir
        const tx = await client.getTransaction({ hash })
        if (tx) {
        txs.push({
            from: tx.from,
            to: tx.to ?? '0x0',
            value: Number(tx.value) / 1e18,
            hash: tx.hash,
        })
        }
    }

    recentTxs.value = txs
    }

  // --- Fetch all
  const fetchDashboard = async () => {
    loading.value = true
    try {
      await Promise.all([fetchWallets(), fetchContracts(), fetchRecentTxs()])
    } finally {
      loading.value = false
    }
  }

  return {
    wallets,
    deployedContracts,
    recentTxs,
    totalWallets,
    totalContracts,
    totalRecentTxs,
    loading,
    fetchDashboard,
  }
}
