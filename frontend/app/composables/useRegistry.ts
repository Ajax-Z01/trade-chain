import { ref } from 'vue'
import { createPublicClient, http } from 'viem'
import registryArtifact from '../../../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json'
import { Chain } from '../config/chain'

const registryAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3' as `0x${string}`
const { abi } = registryArtifact

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useRegistry() {
  const { account, walletClient } = useWallet()
  const minting = ref(false)

  const getTokenIdByHash = async (fileHash: string) => {
    try {
      const tokenId = await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: 'getTokenIdByHash',
        args: [fileHash],
      })
      return tokenId as bigint
    } catch (err) {
      console.error('Failed to get tokenId by hash:', err)
      return 0n
    }
  }

  const mintDocument = async (to: `0x${string}`, fileHash: string, tokenURI: string) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    minting.value = true
    try {
      const txHash = await walletClient.value.writeContract({
        address: registryAddress,
        abi,
        functionName: 'verifyAndMint',
        args: [to, fileHash, tokenURI],
        account: account.value as `0x${string}`,
        chain: Chain,
        value: 0n,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
      minting.value = false
      return receipt
    } catch (err) {
      minting.value = false
      console.error('Minting error:', err)
      throw err
    }
  }

  const addMinter = async (newMinter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    try {
      const txHash = await walletClient.value.writeContract({
        address: registryAddress,
        abi,
        functionName: 'addMinter',
        args: [newMinter],
        account: account.value as `0x${string}`,
        chain: Chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
      return receipt
    } catch (err) {
      console.error('Add minter error:', err)
      throw err
    }
  }

  const removeMinter = async (minter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    try {
      const txHash = await walletClient.value.writeContract({
        address: registryAddress,
        abi,
        functionName: 'removeMinter',
        args: [minter],
        account: account.value as `0x${string}`,
        chain: Chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
      return receipt
    } catch (err) {
      console.error('Remove minter error:', err)
      throw err
    }
  }

  return { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter }
}
