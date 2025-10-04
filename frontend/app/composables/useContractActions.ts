import { ref, reactive } from 'vue'
import { createPublicClient, http } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
import mockUSDCArtifact from '../../../artifacts/contracts/MockUSDC.sol/MintableUSDC.json'
import { Chain } from '../config/chain'
import { useToast } from './useToast'
import { useActivityLogs } from './useActivityLogs'
import { useContractLogs } from './useContractLogs'
import type { ContractLogPayload } from '~/types/Contract'
import { useNuxtApp } from '#app'
import { useWallet } from './useWallets'

const deployedContracts = ref<`0x${string}`[]>([])
const currentStage = ref<number>(-1)

const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

const factoryAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi
const mockUSDCAbi = mockUSDCArtifact.abi

export function useContractActions() {
  const { account, walletClient } = useWallet()
  const { addToast } = useToast()
  const { addActivityLog } = useActivityLogs()
  const { addContractLog } = useContractLogs()

  const stepStatus = reactive({
    deploy: false,
    deposit: false,
    sign: { importer: false, exporter: false },
    shipping: false,
    completed: false,
    cancelled: false,
  })

  function requireAccount(): `0x${string}` {
    if (!account.value) throw new Error('Wallet not connected')
    return account.value as `0x${string}`
  }
  
  const extractOnChainInfo = (receipt: any) => ({
    status: String(receipt.status),
    blockNumber: Number(receipt.blockNumber),
    confirmations: Number(receipt.confirmations ?? 0),
  })

  const postLog = async (data: ContractLogPayload, receipt?: any, tags?: string[]) => {
    const acc = requireAccount()

    const onChainInfo = receipt
      ? extractOnChainInfo(receipt)
      : data.onChainInfo
        ? {
            status: String(data.onChainInfo.status),
            blockNumber: data.onChainInfo.blockNumber ?? 0,
            confirmations: data.onChainInfo.confirmations ?? 0,
          }
        : undefined

    try {
      // Simpan contractLog (sub-collection)
      await addContractLog(acc, { ...data, account: acc, onChainInfo })

      // Simpan ke activityLog (aggregated + history)
      await addActivityLog(acc, {
        type: 'onChain',
        action: data.action,
        txHash: data.txHash,
        contractAddress: data.contractAddress,
        extra: data.extra,
        onChainInfo,
        tags
      })
    } catch (err) {
      console.warn('Failed to post logs:', err)
    }
  }

  // -----------------------
  // Factory / deployed contracts
  // -----------------------
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
      })
      deployedContracts.value = contracts as `0x${string}`[]
      addToast(
        deployedContracts.value.length
          ? `Found ${deployedContracts.value.length} deployed contract(s)`
          : 'No deployed contracts found',
        deployedContracts.value.length ? 'success' : 'info',
        3000
      )
      return deployedContracts.value
    } catch (err) {
      console.error(err)
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
    requiredAmount: bigint,
    token: `0x${string}`
  ) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: factoryAddress,
      abi: factoryAbiFull,
      functionName: 'deployTradeAgreement',
      args: [importer, exporter, requiredAmount, importerDocId, exporterDocId, token],
      account: account.value,
      chain: Chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await fetchDeployedContracts()
    const newContractAddress = deployedContracts.value[deployedContracts.value.length - 1]

    await postLog(
      {
        action: 'deploy',
        account: account.value,
        txHash,
        contractAddress: newContractAddress,
        extra: { importer, exporter, requiredAmount: requiredAmount.toString(), importerDocId: importerDocId.toString(), exporterDocId: exporterDocId.toString(), token },
      },
      receipt,
      ['deploy', 'tradeAgreement', 'contract', 'importer']
    )

    return newContractAddress
  }

  // -----------------------
  // TradeAgreement helpers
  // -----------------------
  const getStage = async (contractAddress: `0x${string}`): Promise<number> => {
    try {
      return (await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'currentStage',
      })) as number
    } catch (err) {
      console.error('Failed to get stage:', err)
      return 0
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

      stepStatus.deploy = stage >= 0
      stepStatus.sign.importer = Boolean(importerSigned)
      stepStatus.sign.exporter = Boolean(exporterSigned)
      stepStatus.deposit = stage >= 4
      stepStatus.shipping = stage >= 5
      stepStatus.completed = stage >= 6
      stepStatus.cancelled = stage === 7

      return data
    } catch (err) {
      console.error('Get contract details error:', err)
      return null
    }
  }

  const depositToContract = async (contractAddress: `0x${string}`, amount: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const token = await publicClient.readContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'token',
    }) as `0x${string}`

    let txHash: `0x${string}`
    if (token === '0x0000000000000000000000000000000000000000') {
      txHash = await walletClient.value.writeContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'deposit',
        args: [amount],
        account: account.value,
        chain: Chain,
        value: amount,
      })
    } else {
      const approveTx = await walletClient.value.writeContract({
        address: token,
        abi: mockUSDCAbi,
        functionName: 'approve',
        args: [contractAddress, amount],
        account: account.value,
        chain: Chain,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx as `0x${string}` })

      txHash = await walletClient.value.writeContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'deposit',
        args: [amount],
        account: account.value,
        chain: Chain,
      })
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await postLog(
      { action: 'deposit', account: account.value, txHash, contractAddress, extra: { amount: amount.toString(), token } },
      receipt,
      ['deposit', 'tradeAgreement', 'contract', 'importer']
    )
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
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await postLog({ action: 'sign', account: account.value, txHash, contractAddress }, receipt, ['sign', 'tradeAgreement', 'contract', 'importer', 'exporter'])

    const importerSigned = Boolean(await publicClient.readContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'importerSigned',
    }))
    const exporterSigned = Boolean(await publicClient.readContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'exporterSigned',
    }))
    stepStatus.sign.importer = importerSigned
    stepStatus.sign.exporter = exporterSigned

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
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await postLog({ action: 'startShipping', account: account.value, txHash, contractAddress }, receipt, ['shipping', 'tradeAgreement', 'contract', 'exporter'])
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
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await postLog({ action: 'complete', account: account.value, txHash, contractAddress }, receipt, ['complete', 'tradeAgreement', 'contract', 'importer'])
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
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    await postLog(
      { action: 'cancel', account: account.value, txHash, contractAddress, extra: { reason } },
      receipt,
      ['cancel', 'tradeAgreement', 'contract', 'importer', 'exporter']
    )
    return receipt
  }

  const mapStageToStepStatus = async (contractAddress: `0x${string}`) => {
    const stage = await getStage(contractAddress)
    if (stage === undefined) return

    const importerSigned = Boolean(await publicClient.readContract({ address: contractAddress, abi: tradeAgreementAbi, functionName: 'importerSigned' }))
    const exporterSigned = Boolean(await publicClient.readContract({ address: contractAddress, abi: tradeAgreementAbi, functionName: 'exporterSigned' }))

    stepStatus.deploy = stage >= 0
    stepStatus.sign.importer = importerSigned
    stepStatus.sign.exporter = exporterSigned
    stepStatus.deposit = stage >= 4
    stepStatus.shipping = stage >= 5
    stepStatus.completed = stage >= 6
    stepStatus.cancelled = stage === 7

    currentStage.value = stage
  }

  return {
    deployedContracts,
    stepStatus,
    currentStage,
    fetchDeployedContracts,
    fetchContractDetails,
    deployContractWithDocs,
    getStage,
    depositToContract,
    signAgreement,
    startShipping,
    completeContract,
    cancelContract,
    mapStageToStepStatus,
  }
}
