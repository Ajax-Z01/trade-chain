<script setup lang="ts">
import { ref, computed } from 'vue'
import { useActivityLogs } from '~/composables/useActivityLogs'
import { onMounted } from 'vue'

const account = ref('') // bisa diisi dengan wallet/account aktif
const { activityStates, fetchActivityLogs, refreshActivityLogs, getActivityState } = useActivityLogs()

// Fetch awal
onMounted(() => {
  if (account.value) fetchActivityLogs(account.value, { limit: 20 })
})

// computed untuk akses state log account
const state = computed(() => getActivityState(account.value))
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Activity Logs</h1>

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

    <ul>
      <li
        v-for="log in state.logs"
        :key="log.timestamp + log.action + log.txHash"
        class="border-b py-2 flex justify-between items-center"
      >
        <div>
          <span class="font-semibold">{{ log.action }}</span>
          <span class="text-gray-500 ml-2 text-sm">
            {{ new Date(log.timestamp).toLocaleString() }}
          </span>
          <div v-if="log.txHash" class="text-sm text-blue-500">
            Tx: {{ log.txHash }}
          </div>
        </div>
        <div class="text-gray-400 text-sm">{{ log.type }}</div>
      </li>
    </ul>

    <div v-if="!state.finished && !state.loading" class="mt-4 text-center">
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
/* optional styling */
</style>
