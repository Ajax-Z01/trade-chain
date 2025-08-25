<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Rocket, Loader2, Check } from 'lucide-vue-next'
import { useContractActions } from '~/composables/useContractActions'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'

const { account } = useWallet()
const { addToast } = useToast()
const { deployedContracts, fetchDeployedContracts, deployContract, depositToContract, approveAsImporter, approveAsExporter, finalizeContract, getImporter } = useContractActions()

const exporterAddress = ref('')
const amount = ref('') // ETH
const selectedContract = ref<string | null>(null)
const latestContract = ref<string | null>(null) // 🔹 latest deployed contract

// Step state
const step = ref<'idle'|'deploying'|'depositing'|'approvingImporter'|'approvingExporter'|'finalizing'|'done'>('idle')

// Status flags per step
const stepStatus = ref({
  deploy: false,
  deposit: false,
  approveImporter: false,
  approveExporter: false,
  finalize: false
})

// Watch wallet connection
watch(account, (acc) => { if(acc) fetchDeployedContracts() }, { immediate: true })

// --- Handlers
const handleDeploy = async () => {
  if (!exporterAddress.value) { addToast('Exporter address required', 'error'); return }
  try {
    step.value = 'deploying'
    const contractAddress = await deployContract(exporterAddress.value)
    if (!contractAddress) throw new Error('Deploy returned undefined')
    
    selectedContract.value = contractAddress
    latestContract.value = contractAddress // set latest deployed
    stepStatus.value.deploy = true
    addToast(`Contract deployed at ${contractAddress}`, 'success')

    // --- 🔹 Cek siapa importer setelah deploy
    const importer = await getImporter(contractAddress as `0x${string}`)
    console.log('[DEBUG] Imported contract:', contractAddress, 'Importer:', importer)
    addToast(`Importer is ${importer}`, 'info')

    step.value = 'depositing'
  } catch(e:any) {
    addToast(e?.message || 'Deploy failed','error')
    step.value = 'idle'
  }
}

const handleDeposit = async () => {
  const contract = latestContract.value || selectedContract.value
  if (!contract || !amount.value) { addToast('Select contract and enter amount', 'error'); return }
  try {
    step.value = 'depositing'
    const weiAmount = BigInt(Math.floor(parseFloat(amount.value)*1e18))
    await depositToContract(contract as `0x${string}`, weiAmount)
    stepStatus.value.deposit = true
    addToast('ETH deposited successfully', 'success')
    step.value = 'approvingImporter'
  } catch(e:any) {
    addToast(e?.message || 'Deposit failed','error')
    step.value = 'depositing'
  }
}

const handleApproveImporter = async () => {
  const contract = latestContract.value || selectedContract.value
  if (!contract) return
  try {
    step.value = 'approvingImporter'
    await approveAsImporter(contract as `0x${string}`)
    stepStatus.value.approveImporter = true
    addToast('Approved as Importer', 'success')
    step.value = 'approvingExporter'
  } catch(e:any){
    addToast(e?.message || 'Approval failed', 'error')
    step.value = 'approvingImporter'
  }
}

const handleApproveExporter = async () => {
  const contract = latestContract.value || selectedContract.value
  if (!contract) return
  try {
    step.value = 'approvingExporter'
    await approveAsExporter(contract as `0x${string}`)
    stepStatus.value.approveExporter = true
    addToast('Approved as Exporter', 'success')
    step.value = 'finalizing'
  } catch(e:any){
    addToast(e?.message || 'Approval failed','error')
    step.value = 'approvingExporter'
  }
}

const handleFinalize = async () => {
  const contract = latestContract.value || selectedContract.value
  if (!contract) return
  try {
    step.value = 'finalizing'
    await finalizeContract(contract as `0x${string}`)
    stepStatus.value.finalize = true
    addToast('Contract finalized','success')
    step.value = 'done'
  } catch(e:any){
    addToast(e?.message || 'Finalize failed','error')
    step.value = 'finalizing'
  }
}
</script>

<template>
<div class="p-6 max-w-3xl mx-auto space-y-6">
  <h1 class="text-2xl font-semibold text-gray-800">Contract Full Flow</h1>

  <!-- Contract Dropdown -->
  <div class="mb-4">
    <label class="block text-gray-700 mb-1">Select Existing Contract</label>
    <select v-model="selectedContract" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none">
      <option disabled value="">-- Select Contract --</option>
      <option v-for="c in deployedContracts" :key="c" :value="c">{{ c }}</option>
    </select>
  </div>

  <!-- Inputs -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <input v-model="exporterAddress" placeholder="Exporter address (0x...)" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
    <input v-model="amount" placeholder="Amount (ETH)" type="number" step="0.0001" class="w-full p-3 border rounded focus:ring-2 focus:ring-indigo-400 outline-none"/>
  </div>

  <!-- Step Status -->
  <div class="space-y-2 mt-4">
    <div class="flex items-center gap-2">
      <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
      <Loader2 v-else-if="step==='deploying'" class="w-5 h-5 animate-spin"/>
      <span :class="{'text-gray-400': !stepStatus.deploy && step!=='deploying'}">Deploy Contract</span>
    </div>
    <div class="flex items-center gap-2">
      <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
      <Loader2 v-else-if="step==='depositing'" class="w-5 h-5 animate-spin"/>
      <span :class="{'text-gray-400': !stepStatus.deposit && step!=='depositing'}">Deposit ETH</span>
    </div>
    <div class="flex items-center gap-2">
      <Check v-if="stepStatus.approveImporter" class="w-5 h-5 text-green-400"/>
      <Loader2 v-else-if="step==='approvingImporter'" class="w-5 h-5 animate-spin"/>
      <span :class="{'text-gray-400': !stepStatus.approveImporter && step!=='approvingImporter'}">Approve Importer</span>
    </div>
    <div class="flex items-center gap-2">
      <Check v-if="stepStatus.approveExporter" class="w-5 h-5 text-green-400"/>
      <Loader2 v-else-if="step==='approvingExporter'" class="w-5 h-5 animate-spin"/>
      <span :class="{'text-gray-400': !stepStatus.approveExporter && step!=='approvingExporter'}">Approve Exporter</span>
    </div>
    <div class="flex items-center gap-2">
      <Check v-if="stepStatus.finalize" class="w-5 h-5 text-green-400"/>
      <Loader2 v-else-if="step==='finalizing'" class="w-5 h-5 animate-spin"/>
      <span :class="{'text-gray-400': !stepStatus.finalize && step!=='finalizing'}">Finalize Contract</span>
    </div>
  </div>

  <!-- Buttons per step -->
  <div class="space-y-3 mt-4">
    <!-- Deploy -->
    <Button @click="handleDeploy" :disabled="step !== 'idle'" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-3">
      <Rocket class="w-5 h-5"/>
      <span v-if="step === 'idle'">Deploy</span>
      <span v-else-if="step === 'deploying'">Deploying...</span>
      <Check v-if="stepStatus.deploy" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Deposit -->
    <Button @click="handleDeposit" :disabled="step !== 'depositing'" class="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded py-3">
      <span v-if="step === 'depositing'">Deposit ETH</span>
      <span v-else-if="stepStatus.deposit">Deposited</span>
      <Loader2 v-if="step==='depositing'" class="w-5 h-5 animate-spin"/>
      <Check v-if="stepStatus.deposit" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Approve Importer -->
    <Button @click="handleApproveImporter" :disabled="step !== 'approvingImporter'" class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded py-3">
      <span v-if="step === 'approvingImporter'">Approve Importer</span>
      <span v-else-if="stepStatus.approveImporter">Approved</span>
      <Loader2 v-if="step==='approvingImporter'" class="w-5 h-5 animate-spin"/>
      <Check v-if="stepStatus.approveImporter" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Approve Exporter -->
    <Button @click="handleApproveExporter" :disabled="step !== 'approvingExporter'" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded py-3">
      <span v-if="step === 'approvingExporter'">Approve Exporter</span>
      <span v-else-if="stepStatus.approveExporter">Approved</span>
      <Loader2 v-if="step==='approvingExporter'" class="w-5 h-5 animate-spin"/>
      <Check v-if="stepStatus.approveExporter" class="w-5 h-5 text-green-400"/>
    </Button>

    <!-- Finalize -->
    <Button @click="handleFinalize" :disabled="step !== 'finalizing'" class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded py-3">
      <span v-if="step === 'finalizing'">Finalize Contract</span>
      <span v-else-if="stepStatus.finalize">Finalized</span>
      <Loader2 v-if="step==='finalizing'" class="w-5 h-5 animate-spin"/>
      <Check v-if="stepStatus.finalize" class="w-5 h-5 text-green-400"/>
    </Button>
  </div>
</div>
</template>
