<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDashboard } from '~/composables/useDashboard'
import { Wallet, FileText, Activity, Loader2 } from 'lucide-vue-next'
import { countUp } from '~/utils/animations'

const {
  wallets,
  totalWallets,
  loading,
  totalContracts,
  totalRecentTxs,
  fetchDashboard,
} = useDashboard()

const animatedWallets = ref(0)
const animatedContracts = ref(0)
const animatedTxs = ref(0)

const animateTotals = () => {
  countUp(totalWallets.value, animatedWallets)
  countUp(totalContracts.value, animatedContracts)
  countUp(totalRecentTxs.value, animatedTxs)
}

onMounted(async () => {
  await fetchDashboard()
  animateTotals()
})
</script>

<template>
<section
  class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0"
>
  <div>
    <h2 class="text-2xl font-bold">Welcome to TradeChain Dashboard</h2>
    <p class="mt-1 text-indigo-100 dark:text-gray-300">Manage your wallets, contracts, and transactions efficiently.</p>
  </div>
  <div>
    <button
      class="bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg shadow hover:bg-indigo-50 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
      :disabled="loading"
      title="Refresh dashboard data"
      @click="fetchDashboard"
    >
      <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
      {{ loading ? 'Refreshing...' : 'Refresh Data' }}
    </button>
  </div>
</section>

<!-- Overview Cards -->
<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
    :title="'Total connected wallets: ' + totalWallets"
  >
    <Wallet class="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
    <div>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Wallets</h3>
      <p class="text-gray-500 dark:text-gray-300 text-sm">Total connected wallets</p>
      <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
        <span v-if="loading" class="animate-pulse">---</span>
        <span v-else>{{ animatedWallets }}</span>
      </div>
    </div>
  </div>

  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
    :title="'Total deployed contracts: ' + totalContracts"
  >
    <FileText class="w-10 h-10 text-green-600 dark:text-green-400" />
    <div>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Contracts</h3>
      <p class="text-gray-500 dark:text-gray-300 text-sm">Total deployed contracts</p>
      <div class="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
        <span v-if="loading" class="animate-pulse">---</span>
        <span v-else>{{ animatedContracts }}</span>
      </div>
    </div>
  </div>

  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
    :title="'Latest activity on your network: ' + totalRecentTxs"
  >
    <Activity class="w-10 h-10 text-orange-600 dark:text-orange-400" />
    <div>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Transactions</h3>
      <p class="text-gray-500 dark:text-gray-300 text-sm">Latest activity on your network</p>
      <div class="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
        <span v-if="loading" class="animate-pulse">---</span>
        <span v-else>{{ animatedTxs }}</span>
      </div>
    </div>
  </div>
</section>

<!-- Wallet Balances -->
<section class="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mt-6">
  <h3 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Wallet Balances</h3>

  <div v-if="loading" class="animate-pulse text-gray-400 dark:text-gray-500 py-6 text-center">Loading balances...</div>
  <div v-else-if="wallets.length === 0" class="text-gray-400 dark:text-gray-500 text-center p-5">
    No wallets connected yet.
  </div>

  <div v-else class="overflow-x-auto">
    <table class="w-full table-auto text-left border-collapse">
      <thead class="bg-gray-50 dark:bg-gray-700">
        <tr class="border-b border-gray-200 dark:border-gray-600">
          <th class="p-3 text-gray-600 dark:text-gray-300">#</th>
          <th class="p-3 text-gray-600 dark:text-gray-300">Address</th>
          <th class="p-3 text-gray-600 dark:text-gray-300">Balance (ETH)</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(wallet, i) in wallets"
          :key="wallet.address"
          class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <td class="p-3 dark:text-white">{{ i + 1 }}</td>
          <td class="p-3 font-mono text-sm truncate dark:text-white" :title="wallet.address">{{ wallet.address }}</td>
          <td class="p-3 font-semibold">
            <span
              :class="wallet.balance > 0
                ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 px-2 py-1 rounded-full text-sm'
                : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100 px-2 py-1 rounded-full text-sm'"
            >
              {{ wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
</template>

<style scoped>
tr {
  transition: background 0.2s ease;
}
</style>
