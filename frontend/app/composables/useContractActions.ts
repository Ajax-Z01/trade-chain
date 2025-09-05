import { ref, reactive } from 'vue'
import { useWallet } from './useWallets'
import { createPublicClient, http } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
import { Chain } from '../config/chain'
import { useToast } from './useToast'

const { addToast } = useToast()
export const deployedContracts = ref<`0x${string}`[]>([])

const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

const factoryAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi

export function useContractActions() {
  const { account, walletClient } = useWallet()

  const stepStatus = reactive({
    deploy: false,
    deposit: false,
    approveImporter: false,
    approveExporter: false,
    finalize: false,
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
      return await res.json()
    } catch (err) {
      console.error('Get contract details error:', err)
    }
  }
  
  const fetchContractStep = async (contractAddress: `0x${string}`) => {
    const { $apiBase } = useNuxtApp()
    try {
      const res = await fetch(`${$apiBase}/contract/${contractAddress}/step`)
      if (!res.ok) throw new Error('Failed to fetch contract step')
      const data = await res.json()
      Object.assign(stepStatus, data.stepStatus)
      return data
    } catch (err) {
      console.error('Fetch contract step error:', err)
    }
  }
  
  // ----------------
  // Factory / TradeAgreement
  // ----------------
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
        addToast(
          `Found ${deployedContracts.value.length} deployed contract(s)`,
          'success',
          3000
        )
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
      extra: {
        exporter,
        importer,
        requiredAmount: requiredAmount.toString(),
        exporterTokenId: exporterDocId.toString(),
        importerTokenId: importerDocId.toString(),
      },
    })

    return newContractAddress
  }

  // ----------------
  // TradeAgreement steps
  // ----------------
  const depositToContract = async (contractAddress: `0x${string}`, amount: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: [{ type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] }],
      functionName: 'deposit',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
      value: amount,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

    await postLog({
      action: 'deposit',
      account: account.value,
      txHash,
      contractAddress,
      extra: { amount: amount.toString() },
    })

    return receipt
  }

  const approveAsImporter = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error("Wallet not connected")
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'approveAsImporter',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({
      action: 'approveImporter',
      account: account.value,
      txHash,
      contractAddress,
      extra: { approvedBy: account.value },
    })
    return receipt
  }

  const approveAsExporter = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'approveAsExporter',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({
      action: 'approveExporter',
      account: account.value,
      txHash,
      contractAddress,
      extra: { approvedBy: account.value },
    })
    return receipt
  }

  const finalizeContract = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'finalize',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await postLog({
      action: 'finalize',
      account: account.value,
      txHash,
      contractAddress,
      extra: { status: 'completed' },
    })
    return receipt
  }
  
  const getImporter = async (contractAddress: `0x${string}`) => {
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'importer',
        args: [],
      }) as `0x${string}`
    } catch (err) {
      console.error('Failed to read importer:', err)
    }
  }

  return {
    deployedContracts,
    fetchDeployedContracts,
    stepStatus,
    fetchContractDetails,
    fetchContractStep,
    deployContractWithDocs,
    depositToContract,
    approveAsImporter,
    approveAsExporter,
    finalizeContract,
    getImporter,
  }
}