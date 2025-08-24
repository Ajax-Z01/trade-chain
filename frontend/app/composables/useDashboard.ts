import { ref, computed } from 'vue'
import { createPublicClient, http, type Chain, formatEther, type BlockTag } from 'viem'

// --- Wallet type
interface Wallet {
  address: `0x${string}`
  balance: number
}

// --- Transaction type
interface RecentTx {
  from: `0x${string}`
  to: `0x${string}`
  value: number
  hash: string
}

export const useDashboard = () => {
  const wallets = ref<Wallet[]>([])
  const deployedContracts = ref<`0x${string}`[]>([])
  const recentTxs = ref<RecentTx[]>([])
  const loading = ref(false)

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

  const totalWallets = computed(() => wallets.value.length)
  const totalContracts = computed(() => deployedContracts.value.length)
  const totalRecentTxs = computed(() => recentTxs.value.length)

  const fetchDashboard = async () => {
    loading.value = true
    try {
      // Ambil block terakhir
      const latestBlock = await client.getBlock({ blockTag: 'latest' })
      if (!latestBlock?.number) throw new Error('Cannot fetch latest block number')

      const lastBlockNumber = latestBlock.number
      const allAddresses = new Set<`0x${string}`>()
      const contractsSet = new Set<`0x${string}`>()
      const allTxs: RecentTx[] = []

      // Scan semua block dari 0 sampai latest
      for (let i = 0; i <= lastBlockNumber; i++) {
        const block = await client.getBlock({
          blockTag: i as unknown as BlockTag,
          includeTransactions: true,
        })
        if (!block) continue

        for (const tx of block.transactions) {
          // Simpan transaksi
          allTxs.push({
            from: tx.from,
            to: (tx.to ?? '0x0') as `0x${string}`,
            value: Number(tx.value) / 1e18,
            hash: tx.hash,
          })

          // Simpan alamat pengirim
          allAddresses.add(tx.from)

          if (tx.to) {
            // Alamat tujuan normal
            allAddresses.add(tx.to as `0x${string}`)
          } else {
            // Deployment contract
            const receipt = await client.getTransactionReceipt({ hash: tx.hash })
            if (receipt?.contractAddress) {
              contractsSet.add(receipt.contractAddress as `0x${string}`)
              // jangan tambahkan ke wallet
            }
          }
        }
      }

      // Ambil wallet balances, hanya untuk EOA (bukan contract)
      const walletResults: Wallet[] = []
      for (const addr of allAddresses) {
        const code = await client.getBytecode({ address: addr })
        if (code && code !== '0x') {
          // Ini contract, masukin ke contractsSet tapi bukan wallet
          contractsSet.add(addr)
          continue
        }

        // Alamat EOA
        const bal = await client.getBalance({ address: addr })
        walletResults.push({ address: addr, balance: Number(formatEther(bal)) })
      }

      // Simpan ke reactive state
      wallets.value = walletResults
      deployedContracts.value = Array.from(contractsSet)
      recentTxs.value = allTxs.slice(-5) // 5 transaksi terakhir
    } catch (err) {
      console.error('Error fetching dashboard:', err)
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
