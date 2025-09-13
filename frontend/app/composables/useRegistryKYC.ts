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

  const mintDocument = async (to: `0x${string}`, file: File): Promise<MintResult> => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    minting.value = true

    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const fileHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

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

      const latestBlock = Number(await publicClient.getBlockNumber())
      const blockNumber = Number(receipt.blockNumber)
      const confirmations = latestBlock - blockNumber + 1

      const eventLog = receipt.logs.find(log => log.address === registryAddress)
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
      }

      await addActivityLog(account.value, {
        type: 'onChain',
        action: 'mintKYC',
        account: account.value,
        txHash: txHash as `0x${string}`,
        contractAddress: registryAddress,
        extra: { fileName: file.name },
        onChainInfo: {
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber,
          confirmations,
        },
      })

      minting.value = false
      return { receipt, tokenId: decodedArgs.tokenId, metadataUrl: tokenURI, fileHash }
    } catch (err) {
      minting.value = false
      console.error('Minting error:', err)
      throw err
    }
  }

  const addMinter = async (newMinter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: registryAddress,
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
      account: account.value,
      txHash: txHash as `0x${string}`,
      contractAddress: registryAddress,
      extra: { newMinter },
      onChainInfo: {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber,
        confirmations,
      },
    })

    return receipt
  }

  const removeMinter = async (minter: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: registryAddress,
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
      account: account.value,
      txHash: txHash as `0x${string}`,
      contractAddress: registryAddress,
      extra: { minter },
      onChainInfo: {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber,
        confirmations,
      },
    })

    return receipt
  }

  const isMinter = async (address: `0x${string}`): Promise<boolean> => {
    try {
      const result = await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: 'approvedMinters',
        args: [address],
      })
      return result as boolean
    } catch (err) {
      console.error('Failed to check minter status:', err)
      return false
    }
  }

  const quickCheckNFT = async (tokenId: bigint) => {
    try {
      const owner = await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: 'ownerOf',
        args: [tokenId],
      })
      const tokenURI = await publicClient.readContract({
        address: registryAddress,
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

  return { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, isMinter, quickCheckNFT }
}
