import { ref } from 'vue'
import { createPublicClient, http, decodeEventLog } from 'viem'
import documentRegistryArtifact from '../../../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json'
import { Chain } from '../config/chain'
import { useWallet } from '~/composables/useWallets'
import type { MintResult } from '~/types/Mint'
import { useStorage } from '~/composables/useStorage'

const { uploadToLocal } = useStorage()

const documentRegistryAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0' as `0x${string}`
const { abi } = documentRegistryArtifact

const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export function useRegistryDocument() {
  const { account, walletClient } = useWallet()
  const minting = ref(false)

  // --- Get tokenId by fileHash
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

  // --- Mint document NFT
  const mintDocument = async (to: `0x${string}`, file: File, docType: string): Promise<MintResult> => {
  if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
  minting.value = true

  try {
    // 1️⃣ Hash file
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 2️⃣ Prepare metadata
    const metadata = {
      name: file.name,
      description: `Verified document ${file.name}`,
      attributes: [
        { trait_type: 'Hash', value: fileHash },
        { trait_type: 'DocType', value: docType },
      ],
    }

    // 3️⃣ Upload metadata JSON → dapat URL
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    const metadataFile = new File([metadataBlob], `${file.name}.json`, { type: 'application/json' })
    const metadataUrl = await uploadToLocal(metadataFile)

    // 4️⃣ Mint NFT di blockchain pakai URL
    const txHash = await walletClient.value.writeContract({
      address: documentRegistryAddress,
      abi,
      functionName: 'verifyAndMint',
      args: [to, fileHash, metadataUrl, docType],
      account: account.value as `0x${string}`,
      chain: Chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

    // 5️⃣ Decode event
    const eventLog = receipt.logs.find(
      log => log.address.toLowerCase() === documentRegistryAddress.toLowerCase()
    )
    if (!eventLog) throw new Error('No DocumentVerified event found')

    const decodedRaw = decodeEventLog({
      abi,
      data: eventLog.data,
      topics: eventLog.topics,
    }) as unknown

    const decodedArgs = (decodedRaw as { args: any }).args as {
      owner: `0x${string}`
      tokenId: bigint
      fileHash: string
      docType: string
    }

    const tokenId = decodedArgs.tokenId
    minting.value = false
    return { receipt, tokenId, metadataUrl, fileHash }
  } catch (err) {
    minting.value = false
    console.error('Minting error:', err)
    throw err
  }
}

  // --- Quick check NFT
  const quickCheckNFT = async (tokenId: bigint) => {
    try {
      const owner = await publicClient.readContract({
        address: documentRegistryAddress,
        abi,
        functionName: 'ownerOf',
        args: [tokenId],
      })
      const tokenURI = await publicClient.readContract({
        address: documentRegistryAddress,
        abi,
        functionName: 'tokenURI',
        args: [tokenId],
      })
      return { owner, metadata: tokenURI }
    } catch (err) {
      console.error('Quick check NFT failed:', err)
      return null
    }
  }

  // --- Add minter (only owner)
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
    return publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
  }

  // --- Remove minter
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
    return publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
  }

  // --- Check if address is approved minter
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

  return {
    mintDocument,
    getTokenIdByHash,
    minting,
    addMinter,
    removeMinter,
    isMinter,
    quickCheckNFT,
  }
}
