<script setup lang="ts">
import { ref } from 'vue'
import { useWallet } from '~/composables/useWallets'
import {
  deployContract,
  approveAsImporter,
  approveAsExporter,
  finalizeContract,
  deployedContracts,
} from '~/composables/useContractActions'
import { parseEther } from 'viem'

const { account, connectWallet } = useWallet()
const exporter = ref('')
const amountEth = ref('0') // input ETH sebagai string
const deployedAddress = ref<`0x${string}` | null>(null)
const loading = ref(false)

async function handleDeploy() {
  if (!exporter.value || !amountEth.value) return alert('Fill exporter and amount')
  loading.value = true
  try {
    const amountWei = parseEther(amountEth.value) // convert ETH -> wei
    const addr = await deployContract(exporter.value, amountWei)
    deployedAddress.value = addr as `0x${string}`
    alert('Contract deployed: ' + addr)
  } catch (err) {
    console.error(err)
    alert('Deploy failed')
  } finally {
    loading.value = false
  }
}

// fungsi approve dan finalize tetap sama
async function handleApproveImporter() {
  if (!deployedAddress.value) return alert('No contract deployed')
  loading.value = true
  try {
    await approveAsImporter(deployedAddress.value)
    alert('Approved as importer')
  } catch (err) {
    console.error(err)
    alert('Approve failed')
  } finally {
    loading.value = false
  }
}

async function handleApproveExporter() {
  if (!deployedAddress.value) return alert('No contract deployed')
  loading.value = true
  try {
    await approveAsExporter(deployedAddress.value)
    alert('Approved as exporter')
  } catch (err) {
    console.error(err)
    alert('Approve failed')
  } finally {
    loading.value = false
  }
}

async function handleFinalize() {
  if (!deployedAddress.value) return alert('No contract deployed')
  loading.value = true
  try {
    await finalizeContract(deployedAddress.value)
    alert('Contract finalized')
  } catch (err) {
    console.error(err)
    alert('Finalize failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div>
      <button @click="connectWallet" class="btn">Connect Wallet</button>
      <span v-if="account">Connected: {{ account }}</span>
    </div>

    <div class="space-x-2">
      <input v-model="exporter" placeholder="Exporter address" class="input" />
      <input v-model="amountEth" placeholder="Amount (ETH)" class="input" />
      <button @click="handleDeploy" :disabled="loading" class="btn">Deploy</button>
    </div>

    <div v-if="deployedAddress">
      <p>Deployed contract: {{ deployedAddress }}</p>
      <button @click="handleApproveImporter" :disabled="loading" class="btn">Approve Importer</button>
      <button @click="handleApproveExporter" :disabled="loading" class="btn">Approve Exporter</button>
      <button @click="handleFinalize" :disabled="loading" class="btn">Finalize</button>
    </div>

    <div v-if="deployedContracts.length">
      <h4>All deployed contracts:</h4>
      <ul>
        <li v-for="c in deployedContracts" :key="c">{{ c }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 0.25rem; }
.btn { padding: 0.5rem 1rem; background-color: #3b82f6; color: white; border-radius: 0.25rem; cursor: pointer; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
