import { ref } from 'vue'
import { createPublicClient, http, decodeEventLog } from 'viem'
import documentRegistryArtifact from '../../../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json'
import { Chain } from '../config/chain'
import { useWallet } from '~/composables/useWallets'
import { useActivityLogs } from '~/composables/useActivityLogs'
import type { MintResult } from '~/types/Mint'
import { useStorage } from '~/composables/useStorage'

const { uploadToLocal } = useStorage()
const { abi } = documentRegistryArtifact
const documentRegistryAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0' as `0x${string}`

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useRegistryDocument() {
  const { account, walletClient } = useWallet()
  const { addActivityLog } = useActivityLogs()
  const minting = ref(false)

  const getTokenIdByHash = async (fileHash: string) => {
    try {
      const tokenId = await publicClient.readContract({
        address: documentRegistryAddress,
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

  const mintDocument = async (to: `0x${string}`, file: File, docType: string): Promise<MintResult> => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    minting.value = true

    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const fileHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

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
      const latestBlock = Number(await publicClient.getBlockNumber())
      const blockNumber = Number(receipt.blockNumber)
      const confirmations = latestBlock - blockNumber + 1

      // --- Add activity log
      await addActivityLog(account.value, {
        type: 'onChain',
        action: 'mintDocument',
        txHash: txHash as `0x${string}`,
        contractAddress: documentRegistryAddress,
        extra: { fileName: file.name, docType },
        onChainInfo: {
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber,
          confirmations,
        },
        tags: ['Document', 'mint'],
      })

      const eventLog = receipt.logs.find(
        log => log.address === documentRegistryAddress
      )
      if (!eventLog) throw new Error('No DocumentVerified event found')

      const decodedRaw = decodeEventLog({ abi, data: eventLog.data, topics: eventLog.topics }) as unknown
      const decodedArgs = (decodedRaw as { args: any }).args as { owner: `0x${string}`, tokenId: bigint, fileHash: string, docType: string }

      minting.value = false
      return { receipt, tokenId: decodedArgs.tokenId, metadataUrl, fileHash }
    } catch (err) {
      minting.value = false
      console.error('Minting error:', err)
      throw err
    }
  }

  const addMinter = async (newMinter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'addMinter',
      args: [newMinter],
      account: account.value as `0x${string}`,
      chain: Chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    const latestBlock = Number(await publicClient.getBlockNumber())
    const blockNumber = Number(receipt.blockNumber)
    const confirmations = latestBlock - blockNumber + 1

    await addActivityLog(account.value, {
      type: 'onChain',
      action: 'addMinter',
      txHash: txHash as `0x${string}`,
      contractAddress: documentRegistryAddress,
      extra: { newMinter },
      onChainInfo: {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber,
        confirmations,
      },
      tags: ['Document', 'add', 'minter'],
    })

    return receipt
  }

  const removeMinter = async (minter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'removeMinter',
      args: [minter],
      account: account.value as `0x${string}`,
      chain: Chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    const latestBlock = Number(await publicClient.getBlockNumber())
    const blockNumber = Number(receipt.blockNumber)
    const confirmations = latestBlock - blockNumber + 1

    await addActivityLog(account.value, {
      type: 'onChain',
      action: 'removeMinter',
      txHash: txHash as `0x${string}`,
      contractAddress: documentRegistryAddress,
      extra: { minter },
      onChainInfo: {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber,
        confirmations,
      },
      tags: ['KYC', 'remove', 'minter'],
    })

    return receipt
  }

  const isMinter = async (addr: `0x${string}`): Promise<boolean> => {
    try {
      const result = await publicClient.readContract({
        address: documentRegistryAddress,
        abi,
        functionName: 'isMinter',
        args: [addr],
      })
      return result as boolean
    } catch (err) {
      console.error('Failed to check minter status:', err)
      return false
    }
  }

  const quickCheckNFT = async (tokenId: bigint) => {
    try {
      const owner = await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'ownerOf', args: [tokenId] })
      const tokenURI = await publicClient.readContract({ address: documentRegistryAddress, abi, functionName: 'tokenURI', args: [tokenId] })
      return { owner, metadata: tokenURI }
    } catch (err) {
      console.error('Quick check NFT failed:', err)
      return null
    }
  }

  return { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, isMinter, quickCheckNFT }
}
