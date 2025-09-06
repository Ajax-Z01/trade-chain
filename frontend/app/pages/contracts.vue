<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Rocket, Loader2, Check, X } from 'lucide-vue-next'
import { useContractActions } from '~/composables/useContractActions'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'
import { useTx } from '~/composables/useTx'
import { getNftsByOwner } from '~/composables/useNfts'

// Composables
const { account } = useWallet()
const { addToast } = useToast()
const { withTx } = useTx()

// Contract actions
const {
  deployedContracts,
  fetchDeployedContracts,
  stepStatus,
  fetchContractDetails,
  deployContractWithDocs,
  getStage,
  depositToContract,
  signAgreement,
  startShipping,
  completeContract,
  cancelContract,
} = useContractActions()

// Inputs
const exporterAddress = ref('')
const requiredAmount = ref('')
const backendExporter = ref('')
const backendRequiredAmount = ref('')
const selectedContract = ref<string | null>(null)
const latestContract = ref<string | null>(null)

// Current contract
const currentContract = computed(() => latestContract.value || selectedContract.value)

// Stage enum for UI
const stageLabels = ['Draft', 'Signed', 'Shipping', 'Completed', 'Cancelled']
const currentStage = ref<number>(0)

// Button loading state
type StageKey = 'deploy' | 'deposit' | 'sign' | 'shipping' | 'completed' | 'cancel'
const loadingButton = ref<StageKey | null>(null)

// Fetch contracts on wallet connect
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

// Watch contract selection to update stepStatus & stage
watch(selectedContract, async (contract) => {
  if (!contract) return
  exporterAddress.value = ''
  requiredAmount.value = ''
  
  try {
    const data = await fetchContractDetails(contract)
    const deployLog = data.history?.find((h: any) => h.action === 'deploy')
    if (deployLog) {
      backendExporter.value = deployLog.extra?.exporter || ''
      backendRequiredAmount.value = deployLog.extra?.requiredAmount
        ? (BigInt(deployLog.extra.requiredAmount) / 1_000_000_000_000_000_000n).toString()
        : ''
    }

    // Sync on-chain stage
    const stage = await getStage(contract as `0x${string}`)
    currentStage.value = stage ?? 0
    const stageNumber = stage ?? 0

    // Map stage to stepStatus
    stepStatus.deploy = true
    stepStatus.deposit = data.history?.some((h:any)=>h.action==='deposit') || false
    stepStatus.sign = stageNumber >= 1
    stepStatus.shipping = stageNumber >= 2
    stepStatus.completed = stageNumber === 3
    stepStatus.cancelled = stageNumber === 4
  } catch (err) {
    console.error('Failed to fetch contract data:', err)
    backendExporter.value = ''
    backendRequiredAmount.value = ''
    currentStage.value = 0
  }
}, { immediate: true })

// Optional: computed merged with backend value
const exporterValue = computed({
  get: () => exporterAddress.value || backendExporter.value,
  set: (val: string) => exporterAddress.value = val
})

const requiredAmountValue = computed({
  get: () => requiredAmount.value || backendRequiredAmount.value,
  set: (val: string) => requiredAmount.value = val
})

const isAutoFilled = computed(() => !!backendExporter.value && !exporterAddress.value)

// Helpers
const getFirstTokenIdByOwner = async (owner: `0x${string}`): Promise<bigint | null> => {
  const nfts = await getNftsByOwner(owner)
  if (!nfts.length) return null
  return BigInt(nfts[0]!.tokenId)
}

// Handlers with loading state
const handleDeploy = async () => {
  if (!account.value) { addToast('Connect wallet first','error'); return }
  if (!exporterAddress.value || !requiredAmount.value) { addToast('Exporter and amount required','error'); return }

  loadingButton.value = 'deploy'
  await withTx(async () => {
    const weiAmount = BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
    const importerTokenId = await getFirstTokenIdByOwner(account.value as `0x${string}`)
    if (!importerTokenId) throw new Error('No NFT found for importer')
    const exporterTokenId = await getFirstTokenIdByOwner(exporterAddress.value as `0x${string}`)
    if (!exporterTokenId) throw new Error('No NFT found for exporter')

    const contractAddress = await deployContractWithDocs(
      account.value as `0x${string}`,
      exporterAddress.value as `0x${string}`,
      importerTokenId,
      exporterTokenId,
      weiAmount
    )

    selectedContract.value = latestContract.value = contractAddress as string
    stepStatus.deploy = true
    currentStage.value = 0
    addToast(`Contract deployed at ${contractAddress}`, 'success')
  }, { label: 'Deploy Contract' })
  loadingButton.value = null
}

const handleDeposit = async () => {
  if (!currentContract.value) { addToast('Select a contract first','error'); return }

  loadingButton.value = 'deposit'
  await withTx(async () => {
    const amount = requiredAmount.value || backendRequiredAmount.value
    if (!amount) throw new Error('Required amount missing')
    const weiAmount = BigInt(Math.floor(parseFloat(amount)*1e18))
    await depositToContract(currentContract.value as `0x${string}`, weiAmount)
    stepStatus.deposit = true
    addToast('ETH deposited', 'success')
  }, { label: 'Deposit ETH' })
  loadingButton.value = null
}

const handleSign = async () => {
  if (!currentContract.value) return
  loadingButton.value = 'sign'
  await withTx(async () => {
    await signAgreement(currentContract.value as `0x${string}`)
    stepStatus.sign = true
    currentStage.value = 1
    addToast('Agreement signed', 'success')
  }, { label: 'Sign Agreement' })
  loadingButton.value = null
}

const handleStartShipping = async () => {
  if (!currentContract.value) return
  loadingButton.value = 'shipping'
  await withTx(async () => {
    await startShipping(currentContract.value as `0x${string}`)
    stepStatus.shipping = true
    currentStage.value = 2
    addToast('Shipping started', 'success')
  }, { label: 'Start Shipping' })
  loadingButton.value = null
}

const handleComplete = async () => {
  if (!currentContract.value) return
  loadingButton.value = 'completed'
  await withTx(async () => {
    await completeContract(currentContract.value as `0x${string}`)
    stepStatus.completed = true
    currentStage.value = 3
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
    stepStatus.cancelled = true
    currentStage.value = 4
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
  currentStage.value = 0
  Object.keys(stepStatus).forEach((key) => {
    stepStatus[key as keyof typeof stepStatus] = false
  })
  loadingButton.value = null
  addToast('Ready to create a new contract', 'info')
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-800">TradeAgreement v2</h1>
      <div class="flex gap-2">
        <Button @click="handleNewContract" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2 px-4 flex items-center gap-2 shadow">New Contract</Button>
        <Button @click="async()=>{ const res=await fetchDeployedContracts(); console.log(res) }">Refresh Data</Button>
      </div>
    </div>

    <!-- Stepper -->
    <div class="flex items-center justify-between gap-2 overflow-x-auto mt-4">
      <div v-for="(label,index) in stageLabels" :key="label" class="flex-1 min-w-[80px]">
        <div class="flex flex-col items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center mb-1 transition"
            :class="currentStage >= index ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'">
            <Check v-if="currentStage >= index" class="w-4 h-4"/>
            <span v-else>{{ index+1 }}</span>
          </div>
          <span class="text-xs text-center">{{ label }}</span>
        </div>
        <div v-if="index<stageLabels.length-1" class="h-1 bg-gray-300 mt-2"></div>
      </div>
    </div>

    <!-- Contract selection -->
    <div class="space-y-2 mt-6">
      <label class="block text-gray-700">Select Contract</label>
      <select v-model="selectedContract" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none">
        <option disabled value="">-- Select Contract --</option>
        <option v-for="c in deployedContracts" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Inputs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded shadow mt-4">
      <div class="flex flex-col relative">
        <label class="text-sm font-medium text-gray-700 mb-1">Exporter Address</label>
        <input v-model="exporterValue" placeholder="0x..." :disabled="isAutoFilled"
          class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
        <span v-if="isAutoFilled" class="absolute right-2 top-1 text-xs text-gray-500 italic">auto-filled</span>
      </div>
      <div class="flex flex-col relative">
        <label class="text-sm font-medium text-gray-700 mb-1">Required Amount</label>
        <div class="flex items-center">
          <input v-model="requiredAmountValue" type="number" step="0.0001" placeholder="0.5" :disabled="isAutoFilled"
            class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
          <span class="ml-2 text-gray-600">ETH</span>
        </div>
        <span v-if="isAutoFilled" class="absolute right-2 top-1 text-xs text-gray-500 italic">auto-filled</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="space-y-3 mt-4">

      <!-- Step 1: Deploy -->
      <Button
        :disabled="loadingButton==='deploy' || stepStatus.deploy"
        @click="handleDeploy"
        class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3"
      >
        <Rocket class="w-5 h-5"/>
        <span v-if="loadingButton!=='deploy'">Deploy Contract</span>
        <Loader2 v-if="loadingButton==='deploy'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 2: Sign -->
      <Button
        :disabled="!stepStatus.deploy || loadingButton==='sign' || stepStatus.sign"
        @click="handleSign"
        class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3"
      >
        <span>Sign Agreement</span>
        <Loader2 v-if="loadingButton==='sign'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.sign" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 3: Deposit (by Importer) -->
      <Button
        :disabled="!stepStatus.sign || loadingButton==='deposit' || stepStatus.deposit"
        @click="handleDeposit"
        class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3"
      >
        <span>Deposit ETH</span>
        <Loader2 v-if="loadingButton==='deposit'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 4: Start Shipping (by Exporter) -->
      <Button
        :disabled="!stepStatus.deposit || loadingButton==='shipping' || stepStatus.shipping"
        @click="handleStartShipping"
        class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3"
      >
        <span>Start Shipping</span>
        <Loader2 v-if="loadingButton==='shipping'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.shipping" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Step 5: Complete (by Importer) -->
      <Button
        :disabled="!stepStatus.shipping || loadingButton==='completed' || stepStatus.completed"
        @click="handleComplete"
        class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3"
      >
        <span>Complete Contract</span>
        <Loader2 v-if="loadingButton==='completed'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.completed" class="w-5 h-5 text-green-400"/>
      </Button>

      <!-- Cancel (anytime before Completed) -->
      <Button
        :disabled="loadingButton==='cancel' || stepStatus.completed || stepStatus.cancelled"
        @click="handleCancel"
        class="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded py-3"
      >
        <span>Cancel Contract</span>
        <Loader2 v-if="loadingButton==='cancel'" class="w-5 h-5 animate-spin"/>
        <X v-if="stepStatus.cancelled" class="w-5 h-5 text-white"/>
      </Button>

    </div>
  </div>
</template>
