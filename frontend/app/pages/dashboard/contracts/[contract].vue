<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useContractLogs } from '~/composables/useContractLogs'
import { FileText, Loader2 } from 'lucide-vue-next'
import Button from '~/components/ui/Button.vue'

const route = useRoute()
const contractAddress = route.params.contract as string

const { contractStates, fetchContractLogs, getContractState } = useContractLogs()

const state = computed(() => {
  return contractStates[contractAddress] ?? getContractState(contractAddress)
})

onMounted(async () => {
  if (state.value.history.length === 0 && !state.value.loading) {
    await fetchContractLogs(contractAddress)
  }
})

// warna role untuk badge
const roleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'exporter': return 'bg-green-100 text-green-700'
    case 'importer': return 'bg-blue-100 text-blue-700'
    case 'bank': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// highlight action
const actionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case 'deploy': return 'bg-indigo-100 text-indigo-700'
    case 'sign': return 'bg-purple-100 text-purple-700'
    case 'deposit': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// format timestamp
const formatTimestamp = (ts: number) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date(ts))
}

// shorten account address
const shortAccount = (addr: string) => {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// refresh logs manual
const refreshLogs = async () => {
  state.value.history = []
  state.value.finished = false
  state.value.lastTimestamp = undefined
  await fetchContractLogs(contractAddress)
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 md:p-6">
    <h1 class="text-2xl font-bold mb-6">Contract Details</h1>

    <div v-if="!state" class="text-center py-10 text-gray-500">
      Contract not found.
    </div>

    <div v-else>
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold">{{ contractAddress }}</h2>
          <span :class="['inline-block px-2 py-0.5 text-xs font-medium rounded-full', roleColor(state.role ?? 'Guest')]">
            {{ state.role }}
          </span>
        </div>
        <p class="text-gray-500 mt-1 sm:mt-0">Status: {{ state.finished ? 'Finished' : 'Active' }}</p>
      </div>

      <!-- Loading -->
      <div v-if="state.loading" class="flex justify-center py-10">
        <Loader2 class="animate-spin w-6 h-6 text-gray-500" />
      </div>

      <!-- Logs -->
      <div v-else>
        <h3 class="text-lg font-semibold mb-2">Logs</h3>
        <ul class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="log in state.history" :key="log.txHash" class="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2">
            <div class="flex items-center gap-2 mb-1 sm:mb-0">
              <FileText class="w-4 h-4 text-indigo-500" />
              <span class="font-medium">{{ log.action }}</span>
            </div>
            <div class="text-sm text-gray-500 flex gap-4 flex-wrap">
              <span title="Full address">{{ shortAccount(log.account) }}</span>
              <span>{{ formatTimestamp(log.timestamp) }}</span>
            </div>
          </li>
        </ul>
        <p v-if="state.history.length === 0" class="text-gray-400 text-sm mt-2">No logs found.</p>
      </div>

      <!-- Refresh -->
      <div class="mt-6">
        <Button @click="refreshLogs" :disabled="state.loading">
          <span v-if="state.loading">Refreshing...</span>
          <span v-else>Refresh Logs</span>
        </Button>
      </div>
    </div>
  </div>
</template>
