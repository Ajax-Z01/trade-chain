import { ref, reactive } from 'vue'
import { useWallet } from './useWallets'
import { createPublicClient, http } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
import { Chain } from '../config/chain'
import { useToast } from './useToast'

const { addToast } = useToast()
export const deployedContracts = ref<`0x${string}`[]>([])
export const currentStage = ref<number>(0)

const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

const factoryAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi

export function useContractActions() {
  const { account, walletClient } = useWallet()

  // Step status now includes separate importer/exporter sign
  const stepStatus = reactive({
    deploy: false,
    deposit: false,
    sign: {
      importer: false,
      exporter: false,
    },
    shipping: false,
    completed: false,
    cancelled: false,
  })

  const postLog = async (data: any) => {
    const { $apiBase } = useNuxtApp()
    try {
      await fetch(`${$apiBase}/contract/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, verifyOnChain: true }),
      })
    } catch (err) {
      console.warn('Failed to post contract log:', err)
    }
  }

  const fetchContractDetails = async (contractAddress: string) => {
    const { $apiBase } = useNuxtApp()
    try {
      const res = await fetch(`${$apiBase}/contract/${contractAddress}/details`)
      if (!res.ok) throw new Error('Failed to fetch contract details')
      const data = await res.json()

      // Fetch on-chain stage
      const stage = (await getStage(contractAddress as `0x${string}`)) ?? 0
      const importerSigned = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: tradeAgreementAbi,
        functionName: 'importerSigned',
      })
      const exporterSigned = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: tradeAgreementAbi,
        functionName: 'exporterSigned',
      })

      // Map on-chain status to stepStatus
      stepStatus.deploy = data.history?.some((h: any) => h.action === 'deploy') || false
      stepStatus.deposit = data.history?.some((h: any) => h.action === 'deposit') || false
      stepStatus.sign.importer = Boolean(importerSigned)
      stepStatus.sign.exporter = Boolean(exporterSigned)
      stepStatus.shipping = stage >= 2
      stepStatus.completed = stage === 3
      stepStatus.cancelled = stage === 4

      return data
    } catch (err) {
      console.error('Get contract details error:', err)
      return null
    }
  }

  // ---------
  // Factory
  // ---------
  const fetchDeployedContracts = async () => {
    if (!account.value) return []
    try {
      const chainId = await publicClient.getChainId()
      if (chainId !== Chain.id) {
        addToast('Wrong network detected', 'warning')
        deployedContracts.value = []
        return []
      }

      const contracts = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbiFull,
        functionName: 'getDeployedContracts',
        args: [],
      })

      deployedContracts.value = contracts as `0x${string}`[]
      if (deployedContracts.value.length > 0) {
        addToast(`Found ${deployedContracts.value.length} deployed contract(s)`, 'success', 3000)
      } else {
        addToast('No deployed contracts found', 'info', 3000)
      }
      return deployedContracts.value
    } catch (err: any) {
      console.error('fetchDeployedContracts error:', err)
      addToast('Factory not deployed / wrong network', 'error', 4000)
      deployedContracts.value = []
      return []
    }
  }

  const deployContractWithDocs = async (
    importer: `0x${string}`,
    exporter: `0x${string}`,
    importerDocId: bigint,
    exporterDocId: bigint,
    requiredAmount: bigint
  ) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: factoryAddress,
      abi: factoryAbiFull,
      functionName: 'deployTradeAgreement',
      args: [importer, exporter, requiredAmount, importerDocId, exporterDocId],
      account: account.value as `0x${string}`,
      chain: Chain,
    })

    await fetchDeployedContracts()
    const newContractAddress = deployedContracts.value[deployedContracts.value.length - 1]

    await postLog({
      action: 'deploy',
      account: account.value,
      txHash,
      contractAddress: newContractAddress,
      extra: { exporter, importer, requiredAmount: requiredAmount.toString(), exporterTokenId: exporterDocId.toString(), importerTokenId: importerDocId.toString() },
    })

    return newContractAddress
  }

  // ---------
  // TradeAgreement v2
  // ---------
  const getStage = async (contractAddress: `0x${string}`) => {
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'currentStage',
        args: [],
      }) as number
    } catch (err) {
      console.error('Failed to get stage:', err)
    }
  }

  const depositToContract = async (contractAddress: `0x${string}`, amount: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'deposit',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
      value: amount,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

    await postLog({ action: 'deposit', account: account.value, txHash, contractAddress, extra: { amount: amount.toString() } })

    return receipt
  }

  const signAgreement = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'sign',
      args: [],
      account: account.value,
      chain: Chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({ action: 'sign', account: account.value, txHash, contractAddress })

    // update stepStatus after signing
    const importerSigned = await publicClient.readContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'importerSigned',
    })
    const exporterSigned = await publicClient.readContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'exporterSigned',
    })

    stepStatus.sign.importer = Boolean(importerSigned)
    stepStatus.sign.exporter = Boolean(exporterSigned)

    return receipt
  }

  const startShipping = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'startShipping',
      args: [],
      account: account.value,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({ action: 'startShipping', account: account.value, txHash, contractAddress })
    return receipt
  }

  const completeContract = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'complete',
      args: [],
      account: account.value,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({ action: 'complete', account: account.value, txHash, contractAddress })
    return receipt
  }

  const cancelContract = async (contractAddress: `0x${string}`, reason: string) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'cancel',
      args: [reason],
      account: account.value,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({ action: 'cancel', account: account.value, txHash, contractAddress, extra: { reason } })
    return receipt
  }
  
  const mapStageToStepStatus = async (contract: string) => {
    if (!contract) return

    const stage = (await getStage(contract as `0x${string}`)) ?? 0

    const importerSigned = await publicClient.readContract({
      address: contract as `0x${string}`,
      abi: tradeAgreementAbi,
      functionName: 'importerSigned',
    })
    const exporterSigned = await publicClient.readContract({
      address: contract as `0x${string}`,
      abi: tradeAgreementAbi,
      functionName: 'exporterSigned',
    })
    const totalDeposited = await publicClient.readContract({
      address: contract as `0x${string}`,
      abi: tradeAgreementAbi,
      functionName: 'totalDeposited',
    })
    const requiredAmount = await publicClient.readContract({
      address: contract as `0x${string}`,
      abi: tradeAgreementAbi,
      functionName: 'requiredAmount',
    })

    // ---- Mapping stepStatus ----
    stepStatus.deploy = stage >= 0
    stepStatus.sign.importer = Boolean(importerSigned)
    stepStatus.sign.exporter = Boolean(exporterSigned)
    stepStatus.deposit = BigInt(totalDeposited as unknown as string || '0') >= BigInt(requiredAmount as unknown as string || '0')
    stepStatus.shipping = stage >= 4
    stepStatus.completed = stage >= 5
    stepStatus.cancelled = stage === 6

    // update reactive currentStage sesuai on-chain
    currentStage.value = stage

    console.log('Mapping stage to stepStatus, current stage:', stage)
    console.log('stepStatus after mapping:', JSON.stringify(stepStatus))
  }

  return {
    deployedContracts,
    stepStatus,
    fetchContractDetails,
    fetchDeployedContracts,
    deployContractWithDocs,
    getStage,
    depositToContract,
    signAgreement,
    startShipping,
    completeContract,
    cancelContract,
    mapStageToStepStatus,
    currentStage,
  }
}
