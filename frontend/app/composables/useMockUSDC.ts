import { ref } from 'vue'
import { createPublicClient, http } from 'viem'
import { Chain } from '../config/chain'
import { useWallet } from '~/composables/useWallets'
import type { FaucetResult } from '~/types/FaucetResult'
import mockUSDCArtifact from '../../../artifacts/contracts/MockUSDC.sol/MintableUSDC.json'

const mockUSDCAddress = '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9' as `0x${string}`
const { abi } = mockUSDCArtifact

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useMockUSDC() {
  const { account, walletClient } = useWallet()
  const minting = ref(false)

  const mint = async (to: `0x${string}`, amount: number): Promise<FaucetResult> => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    minting.value = true

    try {
      // Ambil decimals USDC
      const decimals = await publicClient.readContract({
        address: mockUSDCAddress,
        abi: abi,
        functionName: 'decimals',
      })

      // konversi ke smallest unit
      const mintAmount = BigInt(Math.floor(amount * 10 ** Number(decimals)))

      // Kirim mint transaction
      const txHash = await walletClient.value.writeContract({
        address: mockUSDCAddress,
        abi: abi,
        functionName: 'mint',
        args: [to, mintAmount],
        account: account.value as `0x${string}`,
        chain: Chain,
      })

      // Tunggu konfirmasi
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

      // Ambil saldo baru
      const balance = await publicClient.readContract({
        address: mockUSDCAddress,
        abi: abi,
        functionName: 'balanceOf',
        args: [to],
      })

      minting.value = false
      return { receipt, balance: Number(balance) / 10 ** Number(decimals) }
    } catch (err) {
      minting.value = false
      console.error('Minting USDC failed:', err)
      throw err
    }
  }

  const getBalance = async (address: `0x${string}`) => {
    try {
      const decimals = await publicClient.readContract({
        address: mockUSDCAddress,
        abi: abi,
        functionName: 'decimals',
      })
      const balance = await publicClient.readContract({
        address: mockUSDCAddress,
        abi: abi,
        functionName: 'balanceOf',
        args: [address],
      })
      return Number(balance) / 10 ** Number(decimals)
    } catch (err) {
      console.error('Failed to get USDC balance:', err)
      return 0
    }
  }

  return { mint, getBalance, minting }
}
