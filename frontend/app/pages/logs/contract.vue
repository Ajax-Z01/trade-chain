<script setup lang="ts">
import { useContractLogs } from '~/composables/useContractLogs'

const {
  logs,
  loading,
  getContractState,
  toggleContract,
} = useContractLogs()
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Contract Logs</h1>

    <div v-if="loading" class="text-gray-500">Loading contracts...</div>
    <div v-else-if="logs.length === 0" class="text-gray-500">No contracts found.</div>

    <div v-else class="space-y-4">
      <div
        v-for="contract in logs"
        :key="contract"
        class="border rounded-lg shadow-sm overflow-hidden"
      >
        <button
          class="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 focus:outline-none"
          @click="toggleContract(contract)"
        >
          <span class="font-medium">Contract: {{ contract }}</span>
          <svg
            :class="{'rotate-90': getContractState(contract).isOpen}"
            class="w-5 h-5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div v-show="getContractState(contract).isOpen" class="p-4 border-t bg-white">
          <div v-if="getContractState(contract).loading" class="text-gray-500">
            Loading history...
          </div>
          <div v-else-if="getContractState(contract).history.length === 0" class="text-gray-500">
            No history found.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full border-collapse border border-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="border px-3 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                  <th class="border px-3 py-2 text-left text-sm font-medium text-gray-700">Account</th>
                  <th class="border px-3 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                  <th class="border px-3 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th class="border px-3 py-2 text-left text-sm font-medium text-gray-700">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(log, i) in getContractState(contract).history"
                  :key="i"
                  class="bg-white even:bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
                >
                  <td class="border px-3 py-2 text-sm text-gray-700">
                    {{ new Date(log.timestamp).toLocaleString() }}
                  </td>
                  <td class="border px-3 py-2 text-sm text-gray-700 break-all">
                    {{ log.account }}
                  </td>
                  <td class="border px-3 py-2 text-sm text-gray-700">{{ log.action }}</td>
                  <td class="border px-3 py-2 text-sm">
                    <span
                      :class="{
                        'px-2 py-1 rounded text-white text-xs font-semibold':
                          true,
                        'bg-green-500': log.onChainInfo?.status === 'success',
                        'bg-yellow-500': log.onChainInfo?.status === 'pending',
                        'bg-red-500': log.onChainInfo?.status === 'failed'
                      }"
                    >
                      {{ log.onChainInfo?.status || '-' }}
                    </span>
                  </td>
                  <td class="border px-3 py-2 text-sm font-mono break-all">{{ log.txHash }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
