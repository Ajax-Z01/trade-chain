import { ref, computed } from 'vue'
import { createPublicClient, http, formatEther, type BlockTag } from 'viem'
import { Chain as localChain } from '../config/chain'
import type { Wallet } from '~/types/Wallet'
import type { RecentTx } from '~/types/Transaction'

export const useDashboard = () => {
  // --- reactive state ---
  const wallets = ref<Wallet[]>([])
  const deployedContracts = ref<`0x${string}`[]>([])
  const recentTxs = ref<RecentTx[]>([])
  const loading = ref(false)

  // --- default wallets (EOA) ---
    const defaultWallets: `0x${string}`[] = [
    '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    '0x976ea74026e726554db657fa54763abd0c3a0aa9',
    '0x14dc79964da2c08b23698b3d3cc7ca32193d9955',
    '0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f',
    '0xa0ee7a142d267c1f36714e4a8f75612f20a79720',
    '0xbcd4042de499d14e55001ccbb24a551f3b954096',
  ]

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
      const latestBlock = await client.getBlock({ blockTag: 'latest' })
      if (!latestBlock?.number) throw new Error('Cannot fetch latest block number')

      const lastBlockNumber = latestBlock.number
      const allAddresses = new Set<`0x${string}`>()
      const contractsSet = new Set<`0x${string}`>()
      const allTxs: RecentTx[] = []

      for (let i = 0; i <= lastBlockNumber; i++) {
        const block = await client.getBlock({
          blockTag: i as unknown as BlockTag,
          includeTransactions: true,
        })
        if (!block) continue

        for (const tx of block.transactions) {
          allTxs.push({
            from: tx.from,
            to: (tx.to ?? '0x0') as `0x${string}`,
            value: Number(tx.value) / 1e18,
            hash: tx.hash,
          })

          allAddresses.add(tx.from)

          if (tx.to) {
            allAddresses.add(tx.to as `0x${string}`)
          } else {
            // Deployment contract
            const receipt = await client.getTransactionReceipt({ hash: tx.hash })
            if (receipt?.contractAddress) contractsSet.add(receipt.contractAddress as `0x${string}`)
          }
        }
      }

      const walletResults: Wallet[] = []
      for (const addr of defaultWallets) {
        const bal = await client.getBalance({ address: addr })
        walletResults.push({ address: addr, balance: Number(formatEther(bal)) })
      }

      wallets.value = walletResults
      deployedContracts.value = Array.from(contractsSet)
      recentTxs.value = allTxs.slice(-5)
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
