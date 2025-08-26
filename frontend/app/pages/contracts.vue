<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Rocket, Loader2, Check } from 'lucide-vue-next'
import { useContractActions } from '~/composables/useContractActions'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'

const { account } = useWallet()
const { addToast } = useToast()
const {
  deployedContracts,
  fetchDeployedContracts,
  deployContract,
  depositToContract,
  approveAsImporter,
  approveAsExporter,
  finalizeContract,
  getImporter
} = useContractActions()

// Inputs
const exporterAddress = ref('')
const requiredAmount = ref('') // ETH (on deploy)
const depositAmount = ref('') // ETH (on deposit)
const selectedContract = ref<string | null>(null)
const latestContract = ref<string | null>(null)

// Current active contract
const currentContract = computed(() => latestContract.value || selectedContract.value)

// Step state
type Step =
  | 'idle'
  | 'deploying'
  | 'depositing'
  | 'approvingImporter'
  | 'approvingExporter'
  | 'finalizing'
  | 'done'
const step = ref<Step>('idle')

// Key untuk status step
type StepKey = 'deploy' | 'deposit' | 'approveImporter' | 'approveExporter' | 'finalize'

// Status flags per step (pakai reactive supaya bisa diakses langsung)
const stepStatus = reactive<Record<StepKey, boolean>>({
  deploy: false,
  deposit: false,
  approveImporter: false,
  approveExporter: false,
  finalize: false
})

// Labels typed
const labels: { key: StepKey; text: string }[] = [
  { key: 'deploy', text: 'Deploy Contract' },
  { key: 'deposit', text: 'Deposit ETH' },
  { key: 'approveImporter', text: 'Approve Importer' },
  { key: 'approveExporter', text: 'Approve Exporter' },
  { key: 'finalize', text: 'Finalize Contract' }
]

// Fetch contracts when wallet connect
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

// --- Handlers
const handleDeploy = async () => {
  if (!account.value) { addToast('Connect wallet first', 'error'); return }
  if (!exporterAddress.value || !requiredAmount.value) {
    addToast('Exporter and required amount are required', 'error')
    return
  }
  try {
    step.value = 'deploying'
    const weiAmount = BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
    const contractAddress = await deployContract(
      account.value as `0x${string}`,
      exporterAddress.value as `0x${string}`,
      weiAmount
    )
    if (!contractAddress) throw new Error('Deploy returned undefined')

    selectedContract.value = contractAddress
    latestContract.value = contractAddress
    stepStatus.deploy = true
    addToast(`Contract deployed at ${contractAddress}`, 'success')

    const importer = await getImporter(contractAddress as `0x${string}`)
    console.log('[DEBUG] Contract deployed:', contractAddress, 'Importer:', importer)
    addToast(`Importer is ${importer}`, 'info')

    step.value = 'depositing'
  } catch (e: any) {
    addToast(e?.message || 'Deploy failed', 'error')
    step.value = 'idle'
  }
}

const handleDeposit = async () => {
  if (!currentContract.value) {
    addToast('Select a contract first', 'error')
    return
  }
  try {
    step.value = 'depositing'
    const weiAmount = BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
    await depositToContract(currentContract.value as `0x${string}`, weiAmount)
    stepStatus.deposit = true
    addToast('ETH deposited successfully', 'success')
    step.value = 'approvingImporter'
  } catch (e: any) {
    addToast(e?.message || 'Deposit failed', 'error')
    step.value = 'depositing'
  }
}

const handleApproveImporter = async () => {
  if (!currentContract.value) return
  try {
    step.value = 'approvingImporter'
    await approveAsImporter(currentContract.value as `0x${string}`)
    stepStatus.approveImporter = true
    addToast('Approved as Importer', 'success')
    step.value = 'approvingExporter'
  } catch (e: any) {
    addToast(e?.message || 'Approval failed', 'error')
    step.value = 'approvingImporter'
  }
}

const handleApproveExporter = async () => {
  if (!currentContract.value) return
  try {
    step.value = 'approvingExporter'
    await approveAsExporter(currentContract.value as `0x${string}`)
    stepStatus.approveExporter = true
    addToast('Approved as Exporter', 'success')
    step.value = 'finalizing'
  } catch (e: any) {
    addToast(e?.message || 'Approval failed', 'error')
    step.value = 'approvingExporter'
  }
}

const handleFinalize = async () => {
  if (!currentContract.value) return
  try {
    step.value = 'finalizing'
    await finalizeContract(currentContract.value as `0x${string}`)
    stepStatus.finalize = true
    addToast('Contract finalized', 'success')
    step.value = 'done'
  } catch (e: any) {
    addToast(e?.message || 'Finalize failed', 'error')
    step.value = 'finalizing'
  }
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto space-y-6">
    <h1 class="text-2xl font-semibold text-gray-800">Contract Full Flow</h1>

    <!-- Contract Dropdown -->
    <div>
      <label class="block text-gray-700 mb-1">Select Existing Contract</label>
      <select v-model="selectedContract" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none">
        <option disabled value="">-- Select Contract --</option>
        <option v-for="c in deployedContracts" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Deploy Inputs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input v-model="exporterAddress" placeholder="Exporter address (0x...)" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
      <input v-model="requiredAmount" placeholder="Required Amount (ETH)" type="number" step="0.0001" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
    </div>

    <!-- Step Status -->
    <div class="space-y-2 mt-4">
      <div class="flex items-center gap-2" v-for="label in labels" :key="label.key">
        <Check v-if="stepStatus[label.key]" class="w-5 h-5 text-green-400"/>
        <Loader2 v-else-if="step === label.key + 'ing'" class="w-5 h-5 animate-spin"/>
        <span :class="{'text-gray-400': !stepStatus[label.key] && step !== label.key + 'ing'}">{{ label.text }}</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="space-y-3 mt-4">
      <Button @click="handleDeploy" :disabled="step !== 'idle'" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3">
        <Rocket class="w-5 h-5"/>
        <span v-if="step === 'idle'">Deploy</span>
        <span v-else-if="step === 'deploying'">Deploying...</span>
        <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleDeposit" :disabled="step !== 'depositing'" class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3">
        <span v-if="step === 'depositing'">Deposit ETH</span>
        <span v-else-if="stepStatus.deposit">Deposited</span>
        <Loader2 v-if="step==='depositing'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleApproveImporter" :disabled="step !== 'approvingImporter'" class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3">
        <span v-if="step === 'approvingImporter'">Approve Importer</span>
        <span v-else-if="stepStatus.approveImporter">Approved</span>
        <Loader2 v-if="step==='approvingImporter'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.approveImporter" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleApproveExporter" :disabled="step !== 'approvingExporter'" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3">
        <span v-if="step === 'approvingExporter'">Approve Exporter</span>
        <span v-else-if="stepStatus.approveExporter">Approved</span>
        <Loader2 v-if="step==='approvingExporter'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.approveExporter" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleFinalize" :disabled="step !== 'finalizing'" class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3">
        <span v-if="step === 'finalizing'">Finalize Contract</span>
        <span v-else-if="stepStatus.finalize">Finalized</span>
        <Loader2 v-if="step==='finalizing'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.finalize" class="w-5 h-5 text-green-400"/>
      </Button>
    </div>
  </div>
</template>
