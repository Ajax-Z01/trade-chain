<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Rocket, Loader2, Check, X } from 'lucide-vue-next'
import { useContractActions } from '~/composables/useContractActions'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'
import { useTx } from '~/composables/useTx'
import { getNftsByOwner } from '~/composables/useNfts'
import ContractStepper from '~/components/ContractStepper.vue'

// Composables
const { account } = useWallet()
const { addToast } = useToast()
const { withTx } = useTx()

// Contract actions
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

// Inputs
const exporterAddress = ref('')
const requiredAmount = ref('')
const backendExporter = ref('')
const backendRequiredAmount = ref('')
const selectedContract = ref<string | null>(null)
const latestContract = ref<string | null>(null)
const paymentToken = ref<'ETH' | 'MUSDC'>('ETH')
const backendToken = ref<'ETH' | 'MUSDC' | null>(null)

const paymentTokenValue = computed({
  get: () => backendToken.value || paymentToken.value || 'ETH',
  set: (val: 'ETH' | 'MUSDC') => paymentToken.value = val
})

const isTokenAutoFilled = computed(() => !!backendToken.value)

const tokenAddress = computed(() => {
  if (paymentTokenValue.value === 'ETH') return '0x0000000000000000000000000000000000000000'
  const usdcAddr = import.meta.env.VITE_MOCK_USDC_ADDRESS
  if (!usdcAddr) throw new Error('USDC address not set in .env')
  return usdcAddr
})

const currentContract = computed(() => latestContract.value || selectedContract.value)
const signCompleted = computed(() => stepStatus.sign.importer && stepStatus.sign.exporter)
const isAutoFilled = computed(() => !!backendExporter.value && !exporterAddress.value)

const exporterValue = computed({
  get: () => exporterAddress.value || backendExporter.value,
  set: (val: string) => exporterAddress.value = val
})

const requiredAmountValue = computed({
  get: () => {
    let amountStr: string = requiredAmount.value || ''
    
    if (!amountStr && backendRequiredAmount.value) {
      const amount = BigInt(backendRequiredAmount.value)
      if (paymentTokenValue.value === 'ETH') {
        amountStr = (Number(amount) / 1e18).toFixed(4)
      } else if (paymentTokenValue.value === 'MUSDC') {
        amountStr = (Number(amount) / 1e6).toFixed(4)
      }
    }

    amountStr = String(amountStr)
    return amountStr.replace(/\.?0+$/, '')
  },
  set: (val: string) => {
    requiredAmount.value = val
  }
})

const userRole = computed<'importer' | 'exporter' | null>(() => {
  if (!account.value || !currentContract.value) return null
  if (isImporter.value) return 'importer'
  if (isExporter.value) return 'exporter'
  return null
})

// Buttons
const canDeploy = computed(() => !stepStatus.deploy && !loadingButton.value)
const canSign = computed(() => {
  if (!stepStatus.deploy || loadingButton.value === 'sign') return false
  if (userRole.value === 'importer' && !stepStatus.sign.importer) return true
  if (userRole.value === 'exporter' && !stepStatus.sign.exporter) return true
  return false
})
const canDeposit = computed(() => isImporter.value && stepStatus.deploy && !stepStatus.deposit &&  signCompleted.value && !loadingButton.value)
const canStartShipping = computed(() => isExporter.value && stepStatus.deposit && !stepStatus.shipping && !loadingButton.value)
const canComplete = computed(() => isImporter.value && stepStatus.shipping && !stepStatus.completed && !loadingButton.value)
const canCancel = computed(() => stepStatus.deploy && !stepStatus.completed && !stepStatus.cancelled && !loadingButton.value)

// Helpers
const getFirstTokenIdByOwner = async (owner: `0x${string}`): Promise<bigint | null> => {
  const nfts = await getNftsByOwner(owner)
  return nfts.length ? BigInt(nfts[0]!.tokenId) : null
}

// Roles
const isImporter = ref(false)
const isExporter = ref(false)

const getContractRoles = async (contract: string) => {
  try {
    const data = await fetchContractDetails(contract as `0x${string}`)
    const deployLog = data.history?.find((h: any) => h.action === 'deploy')
    return {
      importer: deployLog?.extra?.importer || '',
      exporter: deployLog?.extra?.exporter || ''
    }
  } catch {
    return { importer: '', exporter: '' }
  }
}

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
  exporterAddress.value = ''
  requiredAmount.value = ''
  backendExporter.value = ''
  backendRequiredAmount.value = ''
  backendToken.value = null

  try {
    const data = await fetchContractDetails(contract as `0x${string}`)
    const deployLog = data.history?.find((h: any) => h.action === 'deploy')
    if (deployLog) {
      backendExporter.value = deployLog.extra?.exporter || ''
      backendRequiredAmount.value = deployLog.extra?.requiredAmount
        ? (BigInt(deployLog.extra.requiredAmount)).toString()
        : ''
      
      const tokenAddr = deployLog.extra?.token
      if (tokenAddr === '0x0000000000000000000000000000000000000000') {
        backendToken.value = 'ETH'
      } else if (tokenAddr === import.meta.env.VITE_MOCK_USDC_ADDRESS) {
        backendToken.value = 'MUSDC'
      }
    }

    await mapStageToStepStatus(contract as `0x${string}`)
  } catch (err) {
    console.error('Failed to fetch contract data:', err)
  }
}, { immediate: true })

// Loading
const loadingButton = ref<'deploy'|'deposit'|'sign'|'shipping'|'completed'|'cancel'|null>(null)

// Handlers
const handleDeploy = async () => {
  if (!account.value) return addToast('Connect wallet first', 'error')
  if (!exporterAddress.value || !requiredAmount.value) return addToast('Exporter and amount required', 'error')
  
  console.log('Token address:', tokenAddress.value)

  loadingButton.value = 'deploy'
  await withTx(async () => {
    // hitung wei/musdc amount
    const weiAmount = paymentTokenValue.value === 'ETH'
      ? BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
      : BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e6))

    // dapatkan NFT tokenIds
    const importerTokenId = await getFirstTokenIdByOwner(account.value as `0x${string}`)
    if (!importerTokenId) throw new Error('No NFT found for importer')

    const exporterTokenId = await getFirstTokenIdByOwner(exporterAddress.value as `0x${string}`)
    if (!exporterTokenId) throw new Error('No NFT found for exporter')

    // deploy contract
    const contractAddress = await deployContractWithDocs(
      account.value as `0x${string}`,
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
  if (!isExporter.value) return addToast('Only exporter can start shipping','error')

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
  exporterAddress.value = ''
  requiredAmount.value = ''
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
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-800">TradeAgreement v2</h1>
      <div class="flex gap-2">
        <Button class="bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2 px-4 flex items-center gap-2 shadow" @click="handleNewContract">New Contract</Button>
        <Button @click="async()=>{ const res=await fetchDeployedContracts(); console.log(res) }">Refresh Data</Button>
      </div>
    </div>

    <!-- Stepper -->
    <ContractStepper
      :current-stage="currentStage"
      :user-role="userRole"
      :importer-signed="stepStatus.sign.importer"
      :exporter-signed="stepStatus.sign.exporter"
      :deposit-done="stepStatus.deposit"
    />

    <!-- Contract selection -->
    <div class="space-y-2 mt-6">
      <label class="block text-gray-700">Select Contract
        <select v-model="selectedContract" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none">
          <option disabled value="">-- Select Contract --</option>
          <option v-for="c in deployedContracts" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </div>

    <!-- Inputs -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded shadow mt-4">
      <!-- Exporter Address -->
      <div class="flex flex-col relative">
        <label class="text-sm font-medium text-gray-700 mb-1">Exporter Address
          <input v-model="exporterValue" placeholder="0x..." :disabled="isAutoFilled" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
          <span v-if="isAutoFilled" class="absolute right-2 top-1 text-xs text-gray-500 italic">auto-filled</span>
        </label>
      </div>

      <!-- Required Amount -->
      <div class="flex flex-col relative">
        <label class="text-sm font-medium text-gray-700 mb-1">Required Amount
          <div class="flex items-center">
            <input v-model="requiredAmountValue" type="number" step="0.0001" placeholder="0.5" :disabled="isAutoFilled" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
          </div>
          <span v-if="isAutoFilled" class="absolute right-2 top-1 text-xs text-gray-500 italic">auto-filled</span>
        </label>
      </div>

      <!-- Payment Token -->
      <div class="flex flex-col relative">
        <label class="text-sm font-medium text-gray-700 mb-1">Payment Token
          <div v-if="isTokenAutoFilled" class="p-3 border rounded bg-gray-100 text-gray-700">
            {{ paymentTokenValue }}
          </div>
          <span v-if="isAutoFilled" class="absolute right-2 top-1 text-xs text-gray-500 italic">auto-filled</span>
          <select
            v-else v-model="paymentTokenValue"
            class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none">
            <option value="ETH">ETH</option>
            <option value="MUSDC">MUSDC</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="space-y-3 mt-4">
      <!-- Step 1: Deploy -->
      <Button
        :disabled="loadingButton==='deploy' || stepStatus.deploy || !canDeploy" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3" @click="handleDeploy"
      >
        <Rocket class="w-5 h-5"/>
        <span v-if="loadingButton!=='deploy'">Deploy Contract</span>
        <Loader2 v-if="loadingButton==='deploy'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 2: Sign -->
      <Button
        :disabled="!stepStatus.deploy || loadingButton==='sign' || signCompleted || !canSign" class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3" @click="handleSign"
      >
        <span>Sign Agreement</span>
        <Loader2 v-if="loadingButton==='sign'" class="w-5 h-5 animate-spin"/>
        <Check v-if="signCompleted" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 3: Deposit (by Importer) -->
      <Button
        :disabled="!isImporter || loadingButton==='deposit' || stepStatus.deposit || !canDeposit" class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3" @click="handleDeposit"
      >
        <span>Deposit ETH</span>
        <Loader2 v-if="loadingButton==='deposit'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 4: Start Shipping (by Exporter) -->
      <Button
        :disabled="!isExporter || loadingButton==='shipping' || !stepStatus.deposit || stepStatus.shipping || !canStartShipping" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3" @click="handleStartShipping"
      >
        <span>Start Shipping</span>
        <Loader2 v-if="loadingButton==='shipping'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.shipping" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 5: Complete (by Importer) -->
      <Button
        :disabled="!stepStatus.shipping || loadingButton==='completed' || stepStatus.completed || !canComplete" class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3" @click="handleComplete"
      >
        <span>Complete Contract</span>
        <Loader2 v-if="loadingButton==='completed'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.completed" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Cancel (anytime before Completed) -->
      <Button
        :disabled="loadingButton==='cancel' || stepStatus.completed || stepStatus.cancelled || !canCancel" class="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded py-3" @click="handleCancel"
      >
        <span>Cancel Contract</span>
        <Loader2 v-if="loadingButton==='cancel'" class="w-5 h-5 animate-spin"/>
        <X v-if="stepStatus.cancelled" class="w-5 h-5 text-white"/>
      </Button>
    </div>
  </div>
</template>
