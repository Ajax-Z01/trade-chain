import { ref, reactive } from 'vue'
import { useWallet } from './useWallets'
import { createPublicClient, http } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
import { Chain } from '../config/chain'

export const deployedContracts = ref<`0x${string}`[]>([])

const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

const factoryAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi

export function useContractActions() {
  const { account, walletClient } = useWallet()
  
  // reactive untuk status step contract
  const stepStatus = reactive({
    deploy: false,
    deposit: false,
    approveImporter: false,
    approveExporter: false,
    finalize: false,
  })

  // --- Helper untuk POST log ke backend ---
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

  const fetchDeployedContracts = async () => {
    const { $apiBase } = useNuxtApp()
    if (!account.value) return
    try {
      const contracts = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbiFull,
        functionName: 'getDeployedContracts',
        args: [],
      })
      deployedContracts.value = contracts as `0x${string}`[]

      // Optional log fetch
      await fetch(`${$apiBase}/contract`, { method: 'GET' })
    } catch (err) {
      console.error(err)
      deployedContracts.value = []
    }
  }
  
  // fetch step status dari backend
  const fetchContractStep = async (contractAddress: `0x${string}`) => {
    const { $apiBase } = useNuxtApp()
    try {
      const res = await fetch(`${$apiBase}/contract/${contractAddress}/step`)
      if (!res.ok) throw new Error('Failed to fetch contract step')
      const data = await res.json()
      // update reactive stepStatus
      Object.assign(stepStatus, data.stepStatus)
      return data
    } catch (err) {
      console.error('Fetch contract step error:', err)
    }
  }

  const deployContract = async (
    importer: `0x${string}`,
    exporter: `0x${string}`,
    requiredAmount: bigint
  ) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: factoryAddress,
      abi: factoryAbiFull,
      functionName: 'deployTradeAgreement',
      args: [importer, exporter, requiredAmount],
      account: account.value as `0x${string}`,
      chain: Chain,
      value: 0n,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    await fetchDeployedContracts()
    const newContractAddress = deployedContracts.value[deployedContracts.value.length - 1]

    await postLog({
      action: 'deploy',
      account: account.value,
      txHash,
      contractAddress: newContractAddress,
      exporter,
      requiredAmount: requiredAmount.toString(),
    })

    return newContractAddress
  }

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
      exporter: await getExporter(contractAddress),
      requiredAmount: await getRequiredAmount(contractAddress),
      amount: amount.toString(),
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
      exporter: await getExporter(contractAddress),
      requiredAmount: await getRequiredAmount(contractAddress),
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
      exporter: await getExporter(contractAddress),
      requiredAmount: await getRequiredAmount(contractAddress),
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
      exporter: await getExporter(contractAddress),
      requiredAmount: await getRequiredAmount(contractAddress),
    })

    return receipt
  }

  const getRequiredAmount = async (contractAddress: `0x${string}`) => {
    try {
      const amount = await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'getRequiredAmount',
        args: [],
      })
      return amount as bigint
    } catch (err) {
      console.error('Failed to read requiredAmount:', err)
    }
  }

  const getExporter = async (contractAddress: `0x${string}`) => {
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'getExporter',
        args: [],
      }) as `0x${string}`
    } catch (err) {
      console.error('Failed to read exporter:', err)
    }
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
    fetchContractStep,
    deployContract,
    depositToContract,
    approveAsImporter,
    approveAsExporter,
    finalizeContract,
    getRequiredAmount,
    getExporter,
    getImporter,
  }
}
