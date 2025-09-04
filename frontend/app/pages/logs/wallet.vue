<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { getWalletLogs } from '~/composables/useLogs'
import { CheckCircle, XCircle, Loader2, Search } from 'lucide-vue-next'

const logs = ref<any[]>([])
const loading = ref(false)

const { account } = useWallet()

// Filter & Search
const actionFilter = ref<'all' | 'connect' | 'disconnect'>('all')
const searchQuery = ref('')

// Pagination / Lazy load
const visibleLogs = ref(20)
const loadMore = () => {
  visibleLogs.value += 20
}

// Fetch logs
async function fetchLogs() {
  loading.value = true
  logs.value = await getWalletLogs()
  loading.value = false
}

watch(account, () => {
  fetchLogs()
}, { immediate: true })

// Computed: filtered & searched logs
const filteredLogs = computed(() => {
  return logs.value
    .filter(log => (actionFilter.value === 'all' ? true : log.action === actionFilter.value))
    .filter(log => log.account.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// Format timestamp
const formatDate = (ts: number) => new Date(ts).toLocaleString()

// Highlight recent logs (last 24h)
const isRecent = (ts: number) => (Date.now() - ts) < 24 * 60 * 60 * 1000
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold text-gray-800">📜 Wallet Logs</h1>

    <!-- Controls: Filter + Search -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div class="flex gap-2">
        <button
          @click="actionFilter = 'all'"
          :class="actionFilter==='all'? 'bg-indigo-600 text-white':'bg-gray-200 text-gray-700'"
          class="px-3 py-1 rounded-lg transition"
        >All</button>
        <button
          @click="actionFilter = 'connect'"
          :class="actionFilter==='connect'? 'bg-green-600 text-white':'bg-gray-200 text-gray-700'"
          class="px-3 py-1 rounded-lg transition"
        >Connect</button>
        <button
          @click="actionFilter = 'disconnect'"
          :class="actionFilter==='disconnect'? 'bg-red-600 text-white':'bg-gray-200 text-gray-700'"
          class="px-3 py-1 rounded-lg transition"
        >Disconnect</button>
      </div>

      <div class="relative">
        <Search class="absolute w-4 h-4 left-2 top-2.5 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by account..."
          class="pl-8 pr-3 py-1 border rounded-lg text-sm focus:ring focus:ring-indigo-200"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-10">
      <Loader2 class="w-8 h-8 text-gray-400 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="filteredLogs.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
      <XCircle class="w-12 h-12 mb-2" />
      <p class="text-sm">No wallet logs found.</p>
    </div>

    <!-- Logs Table -->
    <div v-else class="overflow-x-auto bg-white rounded-xl shadow p-4">
      <table class="min-w-full table-auto border-collapse">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Account</th>
            <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(log, i) in filteredLogs.slice(0, visibleLogs)"
            :key="i"
            :class="[
              'transition hover:bg-indigo-50',
              i%2===0?'bg-white':'bg-gray-50',
              isRecent(log.timestamp)?'border-l-4 border-indigo-400':''
            ]"
          >
            <td class="px-4 py-2 text-sm text-gray-600">{{ formatDate(log.timestamp) }}</td>
            <td class="px-4 py-2 text-sm font-mono truncate max-w-xs">{{ log.account }}</td>
            <td class="px-4 py-2 text-sm">
              <span
                class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
                :class="log.action === 'connect' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                <CheckCircle v-if="log.action === 'connect'" class="w-3 h-3" />
                <XCircle v-else class="w-3 h-3" />
                {{ log.action }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Load more button -->
      <div v-if="visibleLogs < filteredLogs.length" class="flex justify-center mt-4">
        <button
          @click="loadMore"
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Load More
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
table {
  min-width: 100%;
}
</style>
