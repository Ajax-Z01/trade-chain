<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboard } from '~/composables/useDashboard'

const {
  wallets,
  totalWallets,
  deployedContracts,
  recentTxs,
  loading,
  totalContracts,
  totalRecentTxs,
  fetchDashboard,
} = useDashboard()

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <!-- Greeting / Hero -->
  <section class="bg-indigo-600 text-white rounded-lg p-6 shadow-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
    <div>
      <h2 class="text-2xl font-bold">Welcome to TradeChain Dashboard</h2>
      <p class="mt-1 text-indigo-100">Manage your wallets, contracts, and transactions efficiently.</p>
    </div>
    <div>
      <button
        class="bg-white text-indigo-600 px-4 py-2 rounded shadow hover:bg-indigo-50 transition-all duration-200"
        @click="fetchDashboard"
        :disabled="loading"
      >
        {{ loading ? 'Refreshing...' : 'Refresh Data' }}
      </button>
    </div>
  </section>

  <!-- Overview Cards -->
  <section class="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <!-- Wallets Card -->
    <div class="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col gap-2">
      <h3 class="text-lg font-semibold">Wallets</h3>
      <p class="text-gray-500">Total connected wallets</p>
      <div class="text-3xl font-bold text-indigo-600">{{ totalWallets }}</div>
    </div>

    <!-- Contracts Card -->
    <div class="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col gap-2">
      <h3 class="text-lg font-semibold">Contracts</h3>
      <p class="text-gray-500">Total deployed contracts</p>
      <div class="text-3xl font-bold text-indigo-600">{{ totalContracts }}</div>
    </div>

    <!-- Recent Transactions Card -->
    <div class="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col gap-2">
      <h3 class="text-lg font-semibold">Recent Transactions</h3>
      <p class="text-gray-500">Latest activity on your network</p>
      <div class="text-3xl font-bold text-indigo-600">{{ totalRecentTxs }}</div>
    </div>
  </section>

  <!-- Wallet Balances Section -->
  <section class="bg-white rounded-lg shadow p-4">
    <h3 class="text-lg font-semibold mb-4">Wallet Balances</h3>
    <div class="overflow-x-auto">
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
            <td class="p-3 font-mono text-sm truncate">{{ wallet.address }}</td>
            <td class="p-3 font-semibold">
              <span :class="wallet.balance > 0 ? 'text-green-600' : 'text-red-500'">
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
  table {
    min-width: 100%;
  }
</style>
