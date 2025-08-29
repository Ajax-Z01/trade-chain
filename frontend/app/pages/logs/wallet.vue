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

    <!-- Loading State -->
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
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
    </div>

    <!-- Empty State -->
    <div v-else-if="logs.length === 0" class="text-center text-gray-500 py-10">
      No wallet logs found.
    </div>

    <!-- Logs List -->
    <ul v-else class="space-y-4">
      <li
        v-for="(log, i) in logs"
        :key="i"
        class="p-4 border rounded-xl shadow-sm bg-white"
      >
        <div class="flex justify-between items-center mb-2">
          <p class="font-semibold text-gray-800">
            {{ log.account }}
          </p>
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="log.onChainInfo?.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ log.onChainInfo?.status || 'unknown' }}
          </span>
        </div>

        <p><b>Action:</b> {{ log.action }}</p>
        <p v-if="log.extra?.amount"><b>Amount:</b> {{ log.extra.amount }}</p>
        <p v-if="log.txHash" class="truncate">
          <b>Tx Hash:</b> {{ log.txHash }}
        </p>

        <p class="text-sm text-gray-500 mt-2">
          {{ log.onChainInfo?.timestamp ? new Date(log.onChainInfo.timestamp).toLocaleString() : 'No timestamp' }}
        </p>
      </li>
    </ul>
  </div>
</template>
