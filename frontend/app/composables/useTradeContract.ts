import { ref, computed, watch } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'
import { useTx } from '~/composables/useTx'
import { useKYC } from '~/composables/useKycs'
import { useContractRole } from '~/composables/useContractRole'
import { useContractActions } from '~/composables/useContractActions'

export function useTradeContract() {
  // Composables
  const { account } = useWallet()
  const { addToast } = useToast()
  const { withTx } = useTx()
  const { getKycsByOwner } = useKYC()

  const {
    deployedContracts,
    fetchDeployedContracts,
    stepStatus,
    deployContractWithDocs,
    fetchContractDetails,
    depositToContract,
    signAgreement,
    startShipping,
    completeContract,
    cancelContract,
    mapStageToStepStatus,
    currentStage,
  } = useContractActions()

  // State
  const importerAddress = ref('')
  const exporterAddress = ref('')
  const requiredAmount = ref('')
  const backendImporter = ref('')
  const backendExporter = ref('')
  const backendRequiredAmount = ref('')
  const selectedContract = ref<string | null>(null)
  const latestContract = ref<string | null>(null)
  const paymentToken = ref<'ETH' | 'MUSDC'>('ETH')
  const backendToken = ref<'ETH' | 'MUSDC' | null>(null)
  const loadingButton = ref<'deploy'|'deposit'|'sign'|'shipping'|'completed'|'cancel'|null>(null)

  const { isAdmin, isImporter, isExporter, userRole, getContractRoles } = useContractRole(selectedContract)

  // Computed
  const paymentTokenValue = computed({
    get: () => backendToken.value || paymentToken.value || 'ETH',
    set: (val: 'ETH' | 'MUSDC') => paymentToken.value = val
  })

  const isTokenAutoFilled = computed(() => !!backendToken.value)
  const tokenAddress = computed(() => {
    if (paymentTokenValue.value === 'ETH') return '0x0000000000000000000000000000000000000000'
    const usdcAddr = import.meta.env.VITE_MOCK_USDC_ADDRESS
    if (!usdcAddr) throw new Error('MUSDC address not set in .env')
    return usdcAddr
  })

  const currentContract = computed(() => latestContract.value || selectedContract.value)
  const signCompleted = computed(() => stepStatus.sign.importer && stepStatus.sign.exporter)
  const isAutoFilled = computed(() =>
    !!backendExporter.value && !exporterAddress.value &&
    !!backendImporter.value && !importerAddress.value &&
    !!backendRequiredAmount.value && !requiredAmount.value
  )

  const importerValue = computed({
    get: () => importerAddress.value || backendImporter.value,
    set: (val: string) => importerAddress.value = val
  })

  const exporterValue = computed({
    get: () => exporterAddress.value || backendExporter.value,
    set: (val: string) => exporterAddress.value = val
  })

  const requiredAmountValue = computed({
    get: () => {
      let amountStr: string = requiredAmount.value || ''
      if (!amountStr && backendRequiredAmount.value) {
        const amount = BigInt(backendRequiredAmount.value)
        amountStr = paymentTokenValue.value === 'ETH'
          ? (Number(amount) / 1e18).toFixed(4)
          : (Number(amount) / 1e6).toFixed(4)
      }
      return amountStr.replace(/\.?0+$/, '')
    },
    set: (val: string) => { requiredAmount.value = val }
  })

  // Button states
  const canDeploy = computed(() => !stepStatus.deploy && !loadingButton.value)
  const canSign = computed(() => {
    if (!stepStatus.deploy || loadingButton.value === 'sign') return false
    if (userRole.value === 'importer' && !stepStatus.sign.importer) return true
    if (userRole.value === 'exporter' && !stepStatus.sign.exporter) return true
    return false
  })
  const canDeposit = computed(() => isImporter.value && stepStatus.deploy && !stepStatus.deposit && signCompleted.value && !loadingButton.value)
  const canStartShipping = computed(() => isExporter.value && stepStatus.deposit && !stepStatus.shipping && !loadingButton.value)
  const canComplete = computed(() => isImporter.value && stepStatus.shipping && !stepStatus.completed && !loadingButton.value)
  const canCancel = computed(() => stepStatus.deploy && !stepStatus.completed && !stepStatus.cancelled && !loadingButton.value)

  // Helpers
  const getFirstTokenIdByOwner = async (owner: `0x${string}`): Promise<bigint | null> => {
    const nfts = await getKycsByOwner(owner)
    return nfts.length ? BigInt(nfts[0]!.tokenId) : null
  }

  // Watches
  watch([selectedContract, account], async ([contract, acc]) => {
    if (!contract || !acc) return
    const roles = await getContractRoles(contract)
    isImporter.value = acc === roles.importer
    isExporter.value = acc === roles.exporter
  }, { immediate: true })

  watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

  watch(selectedContract, async (contract) => {
    if (!contract) return

    // reset
    importerAddress.value = ''
    exporterAddress.value = ''
    requiredAmount.value = ''
    backendImporter.value = ''
    backendExporter.value = ''
    backendRequiredAmount.value = ''
    backendToken.value = null

    try {
      const data = await fetchContractDetails(contract as `0x${string}`)
      const deployLog = data?.history?.find((h: any) => h.action === 'deploy')
      if (deployLog) {
        backendImporter.value = deployLog.extra?.importer || ''
        backendExporter.value = deployLog.extra?.exporter || ''
        backendRequiredAmount.value = deployLog.extra?.requiredAmount
          ? (BigInt(deployLog.extra.requiredAmount)).toString()
          : ''
        const tokenAddr = deployLog.extra?.token
        backendToken.value =
          tokenAddr === '0x0000000000000000000000000000000000000000' ? 'ETH'
          : tokenAddr === import.meta.env.VITE_MOCK_USDC_ADDRESS ? 'MUSDC'
          : null
      }
      await mapStageToStepStatus(contract as `0x${string}`)
    } catch (err) {
      console.error('Failed to fetch contract data:', err)
    }
  }, { immediate: true })

  // Handlers
  const handleDeploy = async () => {
    if (!account.value) return addToast('Connect wallet first', 'error')
    if (!importerAddress.value) return addToast('Importer address required', 'error')
    if (!exporterAddress.value) return addToast('Exporter address required', 'error')
    if (!requiredAmount.value) return addToast('Required amount required', 'error')

    loadingButton.value = 'deploy'
    await withTx(async () => {
      const weiAmount = paymentTokenValue.value === 'ETH'
        ? BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
        : BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e6))
      const importerTokenId = await getFirstTokenIdByOwner(importerAddress.value as `0x${string}`)
      if (!importerTokenId) throw new Error('No NFT found for importer')
      const exporterTokenId = await getFirstTokenIdByOwner(exporterAddress.value as `0x${string}`)
      if (!exporterTokenId) throw new Error('No NFT found for exporter')

      const contractAddress = await deployContractWithDocs(
        importerAddress.value as `0x${string}`,
        exporterAddress.value as `0x${string}`,
        importerTokenId,
        exporterTokenId,
        weiAmount,
        tokenAddress.value
      )

      selectedContract.value = latestContract.value = contractAddress as string
      stepStatus.deploy = true
      stepStatus.deposit = false
      stepStatus.sign = { importer: false, exporter: false }
      stepStatus.shipping = false
      stepStatus.completed = false
      stepStatus.cancelled = false
      currentStage.value = 0

      addToast(`Contract deployed at ${contractAddress}`, 'success')

      const roles = await getContractRoles(contractAddress as `0x${string}`)
      isImporter.value = account.value === roles.importer
      isExporter.value = account.value === roles.exporter
      await mapStageToStepStatus(contractAddress as `0x${string}`)
    }, { label: 'Deploy Contract' })
    loadingButton.value = null
  }

  const handleDeposit = async () => {
    if (!currentContract.value) return addToast('Select a contract first', 'error')
    if (!isImporter.value) return addToast('Only importer can deposit', 'error')

    loadingButton.value = 'deposit'
    await withTx(async () => {
      const amount = requiredAmount.value
        ? BigInt(Math.floor(parseFloat(requiredAmount.value) * (paymentTokenValue.value === 'ETH' ? 1e18 : 1e6)))
        : BigInt(backendRequiredAmount.value)
      if (!amount) throw new Error('Required amount missing')
      await depositToContract(currentContract.value as `0x${string}`, amount)
      stepStatus.deposit = true
      addToast('Deposit successful', 'success')
    }, { label: 'Deposit' })
    loadingButton.value = null
  }

  const handleSign = async () => {
    if (!currentContract.value || !account.value) return
    loadingButton.value = 'sign'
    await withTx(async () => {
      await signAgreement(currentContract.value as `0x${string}`)
      await mapStageToStepStatus(currentContract.value as `0x${string}`)
      addToast('Agreement signed', 'success')
    }, { label: 'Sign Agreement' })
    loadingButton.value = null
  }

  const handleStartShipping = async () => {
    if (!currentContract.value) return
    if (!isExporter.value) return addToast('Only exporter can start shipping', 'error')
    loadingButton.value = 'shipping'
    await withTx(async () => {
      await startShipping(currentContract.value as `0x${string}`)
      await mapStageToStepStatus(currentContract.value as `0x${string}`)
      addToast('Shipping started', 'success')
    }, { label: 'Start Shipping' })
    loadingButton.value = null
  }

  const handleComplete = async () => {
    if (!currentContract.value) return
    loadingButton.value = 'completed'
    await withTx(async () => {
      await completeContract(currentContract.value as `0x${string}`)
      await mapStageToStepStatus(currentContract.value as `0x${string}`)
      addToast('Contract completed', 'success')
    }, { label: 'Complete Contract' })
    loadingButton.value = null
  }

  const handleCancel = async () => {
    if (!currentContract.value) return
    const reason = prompt('Reason for cancellation:')
    if (!reason) return
    loadingButton.value = 'cancel'
    await withTx(async () => {
      await cancelContract(currentContract.value as `0x${string}`, reason)
      await mapStageToStepStatus(currentContract.value as `0x${string}`)
      addToast('Contract cancelled', 'info')
    }, { label: 'Cancel Contract' })
    loadingButton.value = null
  }

  const handleNewContract = () => {
    selectedContract.value = null
    latestContract.value = null
    importerAddress.value = ''
    exporterAddress.value = ''
    requiredAmount.value = ''
    backendImporter.value = ''
    backendExporter.value = ''
    backendRequiredAmount.value = ''
    backendToken.value = null
    stepStatus.deploy = false
    stepStatus.deposit = false
    stepStatus.sign = { importer: false, exporter: false }
    stepStatus.shipping = false
    stepStatus.completed = false
    stepStatus.cancelled = false
    loadingButton.value = null
    currentStage.value = -1
    addToast('Ready to create a new contract', 'info')
  }

  const handleRefreshContracts = async () => {
    try {
      const res = await fetchDeployedContracts()
      addToast(`Refreshed ${res.length || 0} contracts`, 'success')
      console.log('Refreshed contracts:', res)
    } catch (err: any) {
      console.error('Failed to refresh contracts:', err)
      addToast('Failed to refresh contracts', 'error')
    }
  }
  
    // Load contract data manually (for direct page access)
  const loadContractData = async (address: string) => {
    if (!address) return
    selectedContract.value = address

    // Reset dulu semua value backend & input
    importerAddress.value = ''
    exporterAddress.value = ''
    requiredAmount.value = ''
    backendImporter.value = ''
    backendExporter.value = ''
    backendRequiredAmount.value = ''
    backendToken.value = null

    try {
      const data = await fetchContractDetails(address as `0x${string}`)
      const deployLog = data?.history?.find((h: any) => h.action === 'deploy')
      if (deployLog) {
        backendImporter.value = deployLog.extra?.importer || ''
        backendExporter.value = deployLog.extra?.exporter || ''
        backendRequiredAmount.value = deployLog.extra?.requiredAmount
          ? (BigInt(deployLog.extra.requiredAmount)).toString()
          : ''
        const tokenAddr = deployLog.extra?.token
        backendToken.value =
          tokenAddr === '0x0000000000000000000000000000000000000000' ? 'ETH'
          : tokenAddr === import.meta.env.VITE_MOCK_USDC_ADDRESS ? 'MUSDC'
          : null
      }
      await mapStageToStepStatus(address as `0x${string}`)
    } catch (err) {
      console.error('Failed to load contract data:', err)
      addToast('Failed to load contract data', 'error')
    }
  }

  return {
    // state
    selectedContract,
    latestContract,
    importerAddress,
    exporterAddress,
    requiredAmount,
    paymentToken,
    backendImporter,
    backendExporter,
    backendRequiredAmount,
    backendToken,
    loadingButton,
    stepStatus,
    currentStage,
    deployedContracts,

    // computed
    paymentTokenValue,
    tokenAddress,
    currentContract,
    signCompleted,
    isAutoFilled,
    isTokenAutoFilled,
    importerValue,
    exporterValue,
    requiredAmountValue,
    canDeploy,
    canSign,
    canDeposit,
    canStartShipping,
    canComplete,
    canCancel,
    isAdmin,
    isImporter,
    isExporter,
    userRole,

    // handlers
    handleDeploy,
    handleDeposit,
    handleSign,
    handleStartShipping,
    handleComplete,
    handleCancel,
    handleNewContract,
    handleRefreshContracts,
    
    loadContractData
  }
}
