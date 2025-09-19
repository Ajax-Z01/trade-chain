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

// Animated counters
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
  <!-- Greeting / Hero -->
  <section
    class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0"
  >
    <div>
      <h2 class="text-2xl font-bold">Welcome to TradeChain Dashboard</h2>
      <p class="mt-1 text-indigo-100">Manage your wallets, contracts, and transactions efficiently.</p>
    </div>
    <div>
      <button
        class="bg-white text-indigo-600 px-4 py-2 rounded-lg shadow hover:bg-indigo-50 transition-all duration-200 flex items-center gap-2"
        :disabled="loading"
        @click="fetchDashboard"
        title="Refresh dashboard data"
      >
        <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
        {{ loading ? 'Refreshing...' : 'Refresh Data' }}
      </button>
    </div>
  </section>

  <!-- Overview Cards -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    <!-- Wallets Card -->
    <div
      class="bg-white rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
      :title="'Total connected wallets: ' + totalWallets"
    >
      <Wallet class="w-10 h-10 text-indigo-600" />
      <div>
        <h3 class="text-lg font-semibold">Wallets</h3>
        <p class="text-gray-500 text-sm">Total connected wallets</p>
        <div class="text-3xl font-bold text-indigo-600 mt-1">
          <span v-if="loading" class="animate-pulse">---</span>
          <span v-else>{{ animatedWallets }}</span>
        </div>
      </div>
    </div>

    <!-- Contracts Card -->
    <div
      class="bg-white rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
      :title="'Total deployed contracts: ' + totalContracts"
    >
      <FileText class="w-10 h-10 text-green-600" />
      <div>
        <h3 class="text-lg font-semibold">Contracts</h3>
        <p class="text-gray-500 text-sm">Total deployed contracts</p>
        <div class="text-3xl font-bold text-green-600 mt-1">
          <span v-if="loading" class="animate-pulse">---</span>
          <span v-else>{{ animatedContracts }}</span>
        </div>
      </div>
    </div>

    <!-- Recent Transactions Card -->
    <div
      class="bg-white rounded-xl shadow hover:shadow-lg transition p-5 flex items-center gap-4"
      :title="'Latest activity on your network: ' + totalRecentTxs"
    >
      <Activity class="w-10 h-10 text-orange-600" />
      <div>
        <h3 class="text-lg font-semibold">Recent Transactions</h3>
        <p class="text-gray-500 text-sm">Latest activity on your network</p>
        <div class="text-3xl font-bold text-orange-600 mt-1">
          <span v-if="loading" class="animate-pulse">---</span>
          <span v-else>{{ animatedTxs }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Wallet Balances Section -->
  <section class="bg-white rounded-xl shadow p-5 mt-6">
    <h3 class="text-lg font-semibold mb-4">Wallet Balances</h3>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="animate-pulse text-gray-400">Loading balances...</div>

    <!-- Empty State -->
    <div v-else-if="wallets.length === 0" class="text-gray-400 text-center p-5">
      No wallets connected yet.
    </div>

    <!-- Wallet Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full table-auto text-left border-collapse">
        <thead class="bg-gray-50">
          <tr class="border-b border-gray-200">
            <th class="p-3 text-gray-600">#</th>
            <th class="p-3 text-gray-600">Address</th>
            <th class="p-3 text-gray-600">Balance (ETH)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(wallet, i) in wallets"
            :key="wallet.address"
            class="border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <td class="p-3">{{ i + 1 }}</td>
            <td class="p-3 font-mono text-sm truncate" :title="wallet.address">{{ wallet.address }}</td>
            <td class="p-3 font-semibold">
              <span
                :class="wallet.balance > 0
                  ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm'
                  : 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm'"
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
