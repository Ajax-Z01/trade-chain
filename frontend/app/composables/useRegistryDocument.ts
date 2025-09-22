import { ref } from 'vue'
import { createPublicClient, http, decodeEventLog } from 'viem'
import documentRegistryArtifact from '../../../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json'
import { Chain } from '../config/chain'
import { useWallet } from '~/composables/useWallets'
import { useActivityLogs } from '~/composables/useActivityLogs'
import { useStorage } from '~/composables/useStorage'
import type { MintResult } from '~/types/Mint'

const { abi } = documentRegistryArtifact
const documentRegistryAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0' as `0x${string}`

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useRegistryDocument() {
  const { account, walletClient } = useWallet()
  const { addActivityLog } = useActivityLogs()
  const { uploadToLocal } = useStorage()
  const minting = ref(false)

  // ---------------- Core Functions ----------------
  const getTokenIdByHash = async (fileHash: string) => {
    try {
      return await publicClient.readContract({
        address: documentRegistryAddress,
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
        address: documentRegistryAddress,
        abi,
        functionName: 'getStatus',
        args: [tokenId],
      }) as number
    } catch (err) {
      console.error('Failed to get document status:', err)
      return null
    }
  }

  const mintDocument = async (to: `0x${string}`, file: File, docType: string): Promise<MintResult> => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    minting.value = true
    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const fileHash = '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      const metadata = {
        name: file.name,
        description: `Verified document ${file.name}`,
        attributes: [
          { trait_type: 'Hash', value: fileHash },
          { trait_type: 'DocType', value: docType },
        ],
      }
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      const metadataFile = new File([metadataBlob], `${file.name}.json`, { type: 'application/json' })
      const metadataUrl = await uploadToLocal(metadataFile, account.value)

      const txHash = await walletClient.value.writeContract({
        address: documentRegistryAddress,
        abi,
        functionName: 'verifyAndMint',
        args: [to, fileHash, metadataUrl, docType],
        account: account.value as `0x${string}`,
        chain: Chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

      await addActivityLog(account.value, {
        type: 'onChain',
        action: 'mintDocument',
        txHash,
        contractAddress: documentRegistryAddress,
        extra: { fileName: file.name, docType },
        onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 },
        tags: ['Document', 'mint'],
      })

      const eventLog = receipt.logs.find(log => log.address === documentRegistryAddress)
      if (!eventLog) throw new Error('No DocumentVerified event found')
      const decodedRaw = decodeEventLog({ abi, data: eventLog.data, topics: eventLog.topics }) as any
      const { tokenId } = decodedRaw.args

      minting.value = false
      return { receipt, tokenId, metadataUrl, fileHash }
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
      address: documentRegistryAddress,
      abi,
      functionName: 'reviewDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'reviewDocument', txHash, contractAddress: documentRegistryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'review'] })
    return receipt
  }

  const signDocument = async (tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'signDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'signDocument', txHash, contractAddress: documentRegistryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'sign'] })
    return receipt
  }

  const linkDocumentToContract = async (contractAddress: `0x${string}`, tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'linkDocumentToContract',
      args: [contractAddress, tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'linkDocument', txHash, contractAddress: documentRegistryAddress, extra: { tokenId, linkedTo: contractAddress }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'link'] })
    return receipt
  }

  const revokeDocument = async (tokenId: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'revokeDocument',
      args: [tokenId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'revokeDocument', txHash, contractAddress: documentRegistryAddress, extra: { tokenId }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'revoke'] })
    return receipt
  }

  // ---------------- Minter Management ----------------
  const addMinter = async (newMinter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({ address: documentRegistryAddress, abi, functionName: 'addMinter', args: [newMinter], account: account.value as `0x${string}`, chain: Chain })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'addMinter', txHash, contractAddress: documentRegistryAddress, extra: { newMinter }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'add', 'minter'] })
    return receipt
  }

  const removeMinter = async (minter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({ address: documentRegistryAddress, abi, functionName: 'removeMinter', args: [minter], account: account.value as `0x${string}`, chain: Chain })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await addActivityLog(account.value, { type: 'onChain', action: 'removeMinter', txHash, contractAddress: documentRegistryAddress, extra: { minter }, onChainInfo: { status: receipt.status === 'success' ? 'success' : 'failed', blockNumber: Number(receipt.blockNumber), confirmations: 1 }, tags: ['Document', 'remove', 'minter'] })
    return receipt
  }

  const isMinter = async (addr: `0x${string}`): Promise<boolean> => {
    try { return await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'isMinter', args: [addr] }) as boolean } 
    catch (err) { console.error('Failed to check minter status:', err); return false }
  }

  const quickCheckNFT = async (tokenId: bigint) => {
    try {
      const owner = await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'ownerOf', args: [tokenId] })
      const tokenURI = await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'tokenURI', args: [tokenId] })
      const docType = await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'getDocType', args: [tokenId] })
      const status = await getStatus(tokenId)
      return { owner, metadata: tokenURI, docType, status }
    } catch (err) { console.error('Quick check NFT failed:', err); return null }
  }

  return {
    mintDocument,
    getTokenIdByHash,
    getStatus,
    minting,
    reviewDocument,
    signDocument,
    linkDocumentToContract,
    revokeDocument,
    addMinter,
    removeMinter,
    isMinter,
    quickCheckNFT,
  }
}
