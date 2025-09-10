import { ref, readonly, onMounted, watch } from 'vue'
import { Chain } from '~/config/chain'
import { createPublicClient, http } from 'viem'
import { useMockUSDC } from '~/composables/useMockUSDC'

const account = ref<string | null>(null)
const walletClient = ref<any>(null)

const nativeBalance = ref<number | null>(null)
const usdcBalance = ref<number | null>(null) // store USDC balance

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

const { getBalance: getUSDCBalance } = useMockUSDC()

async function fetchBalances() {
  if (!account.value) return

  // Native ETH
  try {
    const bal = await publicClient.getBalance({ address: account.value as `0x${string}` })
    nativeBalance.value = Number(bal) / 1e18
  } catch (err) {
    console.warn('Failed to fetch native balance', err)
    nativeBalance.value = null
  }

  // USDC
  try {
    usdcBalance.value = await getUSDCBalance(account.value as `0x${string}`)
  } catch (err) {
    console.warn('Failed to fetch USDC balance', err)
    usdcBalance.value = null
  }
}

// --- Connect wallet
export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not installed')
  const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
  account.value = accounts[0] ?? null

  if (account.value) {
    await fetchBalances()
  }

  return account.value
}

// --- Disconnect wallet
export async function disconnectWallet() {
  account.value = null
  walletClient.value = null
  nativeBalance.value = null
  usdcBalance.value = null
}

export function useWallet() {
  onMounted(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        account.value = accounts[0] ?? null
        await fetchBalances()
      })
    }
  })

  // Watch account change to refresh balances
  watch(account, () => {
    fetchBalances()
  })

  return {
    account: readonly(account),
    walletClient,
    nativeBalance: readonly(nativeBalance),
    usdcBalance: readonly(usdcBalance),
    connectWallet,
    disconnectWallet,
    fetchBalances,
  }
}
