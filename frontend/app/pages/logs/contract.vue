<script setup lang="ts">
import { ref } from 'vue'
import { getContractLogs, getContractLogsByAddress } from '~/composables/useLogs'

interface ContractState {
  isOpen: boolean
  history: any[]
  loading: boolean
}

const logs = ref<string[]>([])
const contractStates = ref<Record<string, ContractState>>({})
const loading = ref(true)

// helper untuk mendapatkan state pasti
const getContractState = (contract: string) => {
  if (!contractStates.value[contract]) {
    contractStates.value[contract] = { isOpen: false, history: [], loading: false }
  }
  return contractStates.value[contract]
}

// fetch semua kontrak
const fetchContracts = async () => {
  try {
    const res = await getContractLogs()
    logs.value = res.contracts || []
    logs.value.forEach(c => getContractState(c))
  } finally {
    loading.value = false
  }
}
fetchContracts()

// toggle kontrak dan fetch history jika perlu
const toggleContract = async (contract: string) => {
  const state = getContractState(contract)
  state.isOpen = !state.isOpen

  if (state.isOpen && state.history.length === 0) {
    state.loading = true
    try {
      const res = await getContractLogsByAddress(contract as `0x${string}`)
      state.history = res.history || []
    } finally {
      state.loading = false
    }
  }
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Contract Logs</h1>

    <div v-if="loading">Loading contracts...</div>
    <div v-else-if="logs.length === 0">No contracts found.</div>

    <ul v-else class="space-y-2">
      <li
        v-for="contract in logs"
        :key="contract"
        class="border rounded-lg shadow-sm overflow-hidden"
      >
        <button
          class="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
          @click="toggleContract(contract)"
        >
          <span><b>Contract:</b> {{ contract }}</span>
          <svg
            :class="{'rotate-90': getContractState(contract).isOpen}"
            class="w-4 h-4 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>

        <div v-show="getContractState(contract).isOpen" class="p-4 border-t bg-white">
          <div v-if="getContractState(contract).loading">Loading history...</div>
          <div v-else-if="getContractState(contract).history.length === 0">No history found.</div>
          <ul v-else class="space-y-2">
            <li
              v-for="(log, i) in getContractState(contract).history"
              :key="i"
              class="p-2 border rounded bg-gray-50"
            >
              <p><b>Action:</b> {{ log.action }}</p>
              <p><b>Tx Hash:</b> {{ log.txHash }}</p>
              <p><b>Status:</b> {{ log.onChainInfo?.status }}</p>
              <p class="text-sm text-gray-500">{{ new Date(log.timestamp).toLocaleString() }}</p>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
</template>
