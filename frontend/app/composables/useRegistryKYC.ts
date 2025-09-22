import { ref } from 'vue'
import { createPublicClient, http, decodeEventLog } from 'viem'
import registryKYCArtifact from '../../../artifacts/contracts/KYCRegistry.sol/KYCRegistry.json'
import { Chain } from '../config/chain'
import { useWallet } from '~/composables/useWallets'
import { useActivityLogs } from './useActivityLogs'
import type { MintResult } from '~/types/Mint'

const registryAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3' as `0x${string}`
const { abi } = registryKYCArtifact

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useRegistry() {
  const { account, walletClient } = useWallet()
  const { addActivityLog } = useActivityLogs()
  const minting = ref(false)

  // ---------------- Core Functions ----------------
  const getTokenIdByHash = async (fileHash: string) => {
    try {
      return await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: 'getTokenIdByHash',
        args: [fileHash],
      }) as bigint
    } catch (err) {
      console.error('Failed to get tokenId by hash:', err)
      return 0n
    }
  }

  const getStatus = async (tokenId: bigint) => {
    try {
      return await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: 'getStatus',
        args: [tokenId],
      }) as number
    } catch (err) {
      console.error('Failed to get document status:', err)
      return null
    }
  }

  const mintDocument = async (to: `0x${string}`, file: File): Promise<MintResult> => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    minting.value = true
    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const fileHash = '0x' + Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const imageUrl = 'https://res.cloudinary.com/ajaxtreon/image/upload/v1756638229/hueegaotkhngaoof6edu.png'
      const metadata = {
        name: file.name,
        description: `Verified document ${file.name}`,
        image: imageUrl,
        attributes: [{ trait_type: "Hash", value: fileHash }],
      }
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`

      const txHash = await walletClient.value.writeContract({
        address: registryAddress,
        abi,
        functionName: 'verifyAndMint',
        args: [to, fileHash, tokenURI],
        account: account.value as `0x${string}`,
        chain: Chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

      // Decode event
      const eventLog = receipt.logs.find(log => log.address === registryAddress)
      if (!eventLog) throw new Error('No DocumentVerified event found')
      const decodedRaw = decodeEventLog({ abi, data: eventLog.data, topics: eventLog.topics }) as any
      const { tokenId } = decodedRaw.args

      await addActivityLog(account.value, {
        type: 'onChain',
        action: 'mintKYC',
        txHash: txHash as `0x${string}`,
        contractAddress: registryAddress,
        extra: { fileName: file.name },
        onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 },
        tags: ['KYC', 'mint'],
      })

      minting.value = false
      return { receipt, tokenId, metadataUrl: tokenURI, fileHash, txHash }
    } catch (err) {
      minting.value = false
      console.error('Minting error:', err)
      throw err
    }
  }

  // ---------------- Lifecycle Functions ----------------
  const reviewDocument = async (tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: registryAddress,
      abi,
      functionName: 'reviewDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'reviewDocument', txHash, contractAddress: registryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['KYC', 'review'] })
    return receipt
  }

  const signDocument = async (tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: registryAddress,
      abi,
      functionName: 'signDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'signDocument', txHash, contractAddress: registryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['KYC', 'sign'] })
    return receipt
  }

  const revokeDocument = async (tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: registryAddress,
      abi,
      functionName: 'revokeDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'revokeDocument', txHash, contractAddress: registryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['KYC', 'revoke'] })
    return receipt
  }

  // ---------------- Minter Management ----------------
  const addMinter = async (newMinter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({ address: registryAddress, abi, functionName: 'addMinter', args: [newMinter], account: account.value as `0x${string}`, chain: Chain })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'addMinter', txHash, contractAddress: registryAddress, extra: { newMinter }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['KYC', 'add', 'minter'] })
    return receipt
  }

  const removeMinter = async (minter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({ address: registryAddress, abi, functionName: 'removeMinter', args: [minter], account: account.value as `0x${string}`, chain: Chain })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'removeMinter', txHash, contractAddress: registryAddress, extra: { minter }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['KYC', 'remove', 'minter'] })
    return receipt
  }

  const isMinter = async (addr: `0x${string}`) => {
    try { return await publicClient.readContract({ address: registryAddress, abi, functionName: 'isMinter', args: [addr] }) as boolean } 
    catch (err) { console.error('Failed to check minter status:', err); return false }
  }

  const quickCheckNFT = async (tokenId: bigint) => {
    try {
      const owner = await publicClient.readContract({ address: registryAddress, abi, functionName: 'ownerOf', args: [tokenId] })
      const tokenURI = await publicClient.readContract({ address: registryAddress, abi, functionName: 'tokenURI', args: [tokenId] })
      return { owner, metadata: tokenURI }
    } catch (err) { console.error('Quick check NFT failed:', err); return null }
  }

  return { mintDocument, getTokenIdByHash, getStatus, minting, reviewDocument, signDocument, revokeDocument, addMinter, removeMinter, isMinter, quickCheckNFT }
}
