<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useActivityLogs } from '~/composables/useActivityLogs'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, XCircle, FileText, FileImage, File, TruckIcon, UserPlus, UserMinus } from 'lucide-vue-next'

const account = ref('')
const { fetchActivityLogs, refreshActivityLogs, getActivityState } = useActivityLogs()

onMounted(() => {
  if (account.value) fetchActivityLogs(account.value, { limit: 20 })
})

const state = computed(() => getActivityState(account.value))

const getActionIcon = (action: string) => {
  switch(action) {
    case 'mintDocument': return FileText
    case 'sign': return CheckCircle2
    case 'deploy': return File
    case 'deposit': return FileImage
    case 'startShipping': return TruckIcon
    case 'complete': return CheckCircle2
    case 'cancel': return XCircle
    case 'addMinter': return UserPlus
    case 'removeMinter': return UserMinus
    default: return File
  }
}

const getStatusColor = (action: string, status?: string) => {
  if (status) {
    if(status === 'success') return 'bg-green-100 text-green-700'
    if(status === 'failed') return 'bg-red-100 text-red-700'
  }
  // color by action type
  switch(action) {
    case 'deposit': return 'bg-blue-100 text-blue-700'
    case 'startShipping': return 'bg-yellow-100 text-yellow-700'
    case 'complete': return 'bg-green-100 text-green-700'
    case 'cancel': return 'bg-red-100 text-red-700'
    case 'addMinter': return 'bg-purple-100 text-purple-700'
    case 'removeMinter': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold mb-6">Activity Logs</h1>

    <div class="mb-4">
      <label class="block font-semibold mb-2">Account:</label>
      <input
        v-model="account"
        type="text"
        placeholder="Enter account address"
        class="border rounded px-3 py-2 w-full"
        @change="refreshActivityLogs(account)"
      />
    </div>

    <div v-if="state.loading" class="text-gray-500 mb-2">Loading...</div>
    <div v-if="state.logs.length === 0 && !state.loading" class="text-gray-400">
      No activity logs found.
    </div>

    <div class="space-y-4">
      <div v-for="log in state.logs" :key="log.timestamp + log.txHash!" class="bg-white border rounded-xl shadow p-4 flex gap-4 items-start hover:shadow-lg transition">
        <!-- Icon -->
        <component :is="getActionIcon(log.action)" class="w-6 h-6 text-blue-500 mt-1" />

        <!-- Main content -->
        <div class="flex-1 space-y-1">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="font-semibold capitalize">{{ log.action }}</span>
              <span class="text-gray-500 text-sm" :title="new Date(log.timestamp).toLocaleString()">
                {{ formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) }}
              </span>
            </div>
            <span class="text-xs text-gray-400">{{ log.type }}</span>
          </div>

          <!-- Account & Contract -->
          <div class="text-sm text-gray-600 flex flex-wrap gap-2">
            <span>Account: <code class="bg-gray-100 px-1 rounded">{{ log.account }}</code></span>
            <span>Contract: <code class="bg-gray-100 px-1 rounded">{{ log.contractAddress }}</code></span>
          </div>

          <!-- Extra info -->
          <div v-if="log.extra" class="text-sm text-gray-700 mt-1 space-y-1">
            <template v-if="log.action==='mintDocument'">
              <div class="flex items-center gap-2">
                <span>File:</span>
                <span class="font-medium">{{ log.extra.fileName }}</span>
                <span class="px-2 py-0.5 rounded text-xs bg-gray-200">{{ log.extra.docType }}</span>
              </div>
            </template>
            <template v-else-if="log.action==='deploy'">
              <div>Importer: {{ log.extra.importer }}</div>
              <div>Exporter: {{ log.extra.exporter }}</div>
              <div>Required: {{ log.extra.requiredAmount }}</div>
            </template>
          </div>

          <!-- On-chain info -->
          <div v-if="log.onChainInfo" class="flex flex-wrap gap-2 mt-2">
            <span :class="getStatusColor(log.onChainInfo.status) + ' px-2 py-1 rounded text-xs font-medium'">
              {{ log.onChainInfo.status.toUpperCase() }}
            </span>
            <span class="text-xs text-gray-500">Block: {{ log.onChainInfo.blockNumber }}</span>
            <span class="text-xs text-gray-500">Confirmations: {{ log.onChainInfo.confirmations }}</span>
          </div>

          <!-- Tx hash -->
          <div v-if="log.txHash" class="text-xs text-blue-500 break-all mt-1">
            Tx: {{ log.txHash }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="!state.finished && !state.loading" class="mt-6 text-center">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        @click="fetchActivityLogs(account, { limit: 20 })"
      >
        Load More
      </button>
    </div>

    <div v-if="state.finished" class="mt-4 text-center text-gray-500">
      No more logs.
    </div>
  </div>
</template>

<style scoped>
/* smooth hover shadow for cards */
</style>
