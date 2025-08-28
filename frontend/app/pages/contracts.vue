<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Rocket, Loader2, Check } from 'lucide-vue-next'
import { useContractActions } from '~/composables/useContractActions'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'

// Wallet & Toast
const { account } = useWallet()
const { addToast } = useToast()

// Contract actions composable
const {
  deployedContracts,
  fetchDeployedContracts,
  stepStatus,
  fetchContractStep,
  deployContract,
  depositToContract,
  approveAsImporter,
  approveAsExporter,
  finalizeContract,
  getImporter
} = useContractActions()

// Inputs
const exporterAddress = ref('')
const requiredAmount = ref('') // ETH
const backendExporter = ref('')
const backendRequiredAmount = ref('')
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

// Button-specific loading state
type StepKey = 'deploy' | 'deposit' | 'approveImporter' | 'approveExporter' | 'finalize'
const loadingButton = ref<StepKey | null>(null)

// Labels for UI
const labels: { key: StepKey; text: string }[] = [
  { key: 'deploy', text: 'Deploy Contract' },
  { key: 'deposit', text: 'Deposit ETH' },
  { key: 'approveImporter', text: 'Approve Importer' },
  { key: 'approveExporter', text: 'Approve Exporter' },
  { key: 'finalize', text: 'Finalize Contract' }
]

// Fetch deployed contracts when wallet connects
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

// Watch contract change to update step status
watch(selectedContract, async (contract) => {
  if (!contract) return
  exporterAddress.value = ''
  requiredAmount.value = ''

  try {
    const { $apiBase } = useNuxtApp()
    const res = await fetch(`${$apiBase}/contract/${contract}/details`)
    if (!res.ok) throw new Error('Failed to fetch contract details')
    const data = await res.json() as any

    const deployLog = data.history?.find((h: any) => h.action === 'deploy')
    if (deployLog) {
      backendExporter.value = deployLog.extra?.exporter || ''
      backendRequiredAmount.value = deployLog.extra?.requiredAmount
        ? (BigInt(deployLog.extra.requiredAmount) / 1_000_000_000_000_000_000n).toString()
        : ''
    }

    // --- Sync stepStatus dan step ---
    stepStatus.deploy = data.history?.some((h: any) => h.action === 'deploy') || false
    stepStatus.deposit = data.history?.some((h: any) => h.action === 'deposit') || false
    stepStatus.approveImporter = data.history?.some((h: any) => h.action === 'approveImporter') || false
    stepStatus.approveExporter = data.history?.some((h: any) => h.action === 'approveExporter') || false
    stepStatus.finalize = data.history?.some((h: any) => h.action === 'finalize') || false

    // Tentukan step aktif sesuai status
    if (!stepStatus.deploy) step.value = 'idle'
    else if (!stepStatus.deposit) step.value = 'depositing'
    else if (!stepStatus.approveImporter) step.value = 'approvingImporter'
    else if (!stepStatus.approveExporter) step.value = 'approvingExporter'
    else if (!stepStatus.finalize) step.value = 'finalizing'
    else step.value = 'done'

  } catch (err) {
    console.error('Failed to fetch contract data:', err)
    backendExporter.value = ''
    backendRequiredAmount.value = ''
    step.value = 'idle'
  }
}, { immediate: true })

// Optional: computed yang merge dengan input user
const exporterValue = computed({
  get: () => exporterAddress.value || backendExporter.value,
  set: (val: string) => exporterAddress.value = val
})

const requiredAmountValue = computed({
  get: () => requiredAmount.value || backendRequiredAmount.value,
  set: (val: string) => requiredAmount.value = val
})

// Flag apakah field diisi otomatis dari backend
const isAutoFilled = computed(() => !!backendExporter.value && !exporterAddress.value)

// --- Handlers ---
const handleDeploy = async () => {
  if (!account.value) { addToast('Connect wallet first', 'error'); return }
  if (!exporterAddress.value || !requiredAmount.value) {
    addToast('Exporter and required amount are required', 'error'); return
  }
  try {
    loadingButton.value = 'deploy'
    const weiAmount = BigInt(Math.floor(parseFloat(requiredAmount.value) * 1e18))
    const contractAddress = await deployContract(
      account.value as `0x${string}`,
      exporterAddress.value as `0x${string}`,
      weiAmount
    )
    selectedContract.value = contractAddress as string
    latestContract.value = contractAddress as string
    stepStatus.deploy = true
    addToast(`Contract deployed at ${contractAddress}`, 'success')

    const importer = await getImporter(contractAddress as `0x${string}`)
    addToast(`Importer is ${importer}`, 'info')
    step.value = 'depositing'
  } catch (e: any) {
    addToast(e?.message || 'Deploy failed', 'error')
  } finally {
    loadingButton.value = null
  }
}

const handleDeposit = async () => {
  if (!currentContract.value) { addToast('Select a contract first', 'error'); return }
  try {
    loadingButton.value = 'deposit'
    const amount = requiredAmount.value || backendRequiredAmount.value
    if (!amount) throw new Error('Required amount is missing')
    const weiAmount = BigInt(Math.floor(parseFloat(amount) * 1e18))
    await depositToContract(currentContract.value as `0x${string}`, weiAmount)
    stepStatus.deposit = true
    addToast('ETH deposited successfully', 'success')
    step.value = 'approvingImporter'
  } catch (e: any) {
    addToast(e?.message || 'Deposit failed', 'error')
  } finally {
    loadingButton.value = null
  }
}

const handleApproveImporter = async () => {
  if (!currentContract.value) return
  try {
    loadingButton.value = 'approveImporter'
    await approveAsImporter(currentContract.value as `0x${string}`)
    stepStatus.approveImporter = true
    addToast('Approved as Importer', 'success')
    step.value = 'approvingExporter'
  } catch (e: any) {
    addToast(e?.message || 'Approval failed', 'error')
  } finally {
    loadingButton.value = null
  }
}

const handleApproveExporter = async () => {
  if (!currentContract.value) return
  try {
    loadingButton.value = 'approveExporter'
    await approveAsExporter(currentContract.value as `0x${string}`)
    stepStatus.approveExporter = true
    addToast('Approved as Exporter', 'success')
    step.value = 'finalizing'
  } catch (e: any) {
    addToast(e?.message || 'Approval failed', 'error')
  } finally {
    loadingButton.value = null
  }
}

const handleFinalize = async () => {
  if (!currentContract.value) return
  try {
    loadingButton.value = 'finalize'
    await finalizeContract(currentContract.value as `0x${string}`)
    stepStatus.finalize = true
    addToast('Contract finalized', 'success')
    step.value = 'done'
  } catch (e: any) {
    addToast(e?.message || 'Finalize failed', 'error')
  } finally {
    loadingButton.value = null
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
      <input 
        v-model="exporterValue" 
        placeholder="Exporter address (0x...)" 
        :disabled="isAutoFilled"
        class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"
      />
      <input 
        v-model="requiredAmountValue" 
        placeholder="Required Amount (ETH)" 
        type="number" step="0.0001" 
        :disabled="isAutoFilled"
        class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"
      />
    </div>

    <!-- Step Status -->
    <div class="space-y-2 mt-4">
      <div class="flex items-center gap-2" v-for="label in labels" :key="label.key">
        <Check v-if="stepStatus[label.key]" class="w-5 h-5 text-green-400"/>
        <Loader2 v-else-if="loadingButton===label.key" class="w-5 h-5 animate-spin"/>
        <span :class="{'text-gray-400': !stepStatus[label.key] && loadingButton !== label.key}">{{ label.text }}</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="space-y-3 mt-4">
      <Button @click="handleDeploy" :disabled="step !== 'idle'" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3">
        <Rocket class="w-5 h-5"/>
        <span v-if="step === 'idle'">Deploy</span>
        <span v-else-if="loadingButton==='deploy'">Deploying...</span>
        <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleDeposit" :disabled="step !== 'depositing'" class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3">
        <span v-if="step === 'depositing' && loadingButton !== 'deposit'">Deposit ETH</span>
        <span v-else-if="loadingButton==='deposit'">Depositing...</span>
        <span v-else-if="stepStatus.deposit">Deposited</span>
        <Loader2 v-if="loadingButton==='deposit'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleApproveImporter" :disabled="step !== 'approvingImporter'" class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3">
        <span v-if="step === 'approvingImporter' && loadingButton !== 'approveImporter'">Approve Importer</span>
        <span v-else-if="loadingButton==='approveImporter'">Approving...</span>
        <span v-else-if="stepStatus.approveImporter">Approved</span>
        <Loader2 v-if="loadingButton==='approveImporter'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.approveImporter" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleApproveExporter" :disabled="step !== 'approvingExporter'" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3">
        <span v-if="step === 'approvingExporter' && loadingButton !== 'approveExporter'">Approve Exporter</span>
        <span v-else-if="loadingButton==='approveExporter'">Approving...</span>
        <span v-else-if="stepStatus.approveExporter">Approved</span>
        <Loader2 v-if="loadingButton==='approveExporter'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.approveExporter" class="w-5 h-5 text-green-400"/>
      </Button>

      <Button @click="handleFinalize" :disabled="step !== 'finalizing'" class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3">
        <span v-if="step === 'finalizing' && loadingButton !== 'finalize'">Finalize Contract</span>
        <span v-else-if="loadingButton==='finalize'">Finalizing...</span>
        <span v-else-if="stepStatus.finalize">Finalized</span>
        <Loader2 v-if="loadingButton==='finalize'" class="w-5 h-5 animate-spin"/>
        <Check v-if="stepStatus.finalize" class="w-5 h-5 text-green-400"/>
      </Button>
    </div>
  </div>
</template>
