<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { getWalletLogs } from '~/composables/useLogs'

const logs = ref<any[]>([])
const loading = ref(false)

const { account } = useWallet()

async function fetchLogs() {
  loading.value = true
  logs.value = await getWalletLogs()
  loading.value = false
}

watch(account, () => {
  fetchLogs()
}, { immediate: true })
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Wallet Logs</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <svg
        class="animate-spin h-6 w-6 text-gray-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>

    <!-- Empty -->
    <div v-else-if="logs.length === 0" class="text-center text-gray-500 py-10">
      No wallet logs found.
    </div>

    <!-- Logs Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left border-b text-sm font-semibold text-gray-700">Date</th>
            <th class="px-4 py-2 text-left border-b text-sm font-semibold text-gray-700">Account</th>
            <th class="px-4 py-2 text-left border-b text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(log, i) in logs" 
            :key="i" 
            class="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition"
          >
            <td class="px-4 py-2 border-b text-sm text-gray-600">
              {{ new Date(log.timestamp).toLocaleString() }}
            </td>
            <td class="px-4 py-2 border-b text-sm font-mono truncate max-w-xs">
              {{ log.account }}
            </td>
            <td class="px-4 py-2 border-b">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="log.action === 'connect' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'"
              >
                {{ log.action }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
