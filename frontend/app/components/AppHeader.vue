<script setup lang="ts">
import { NuxtLink } from '#components'
import { useWallet } from '~/composables/useWallets'
import Button from '~/components/ui/Button.vue'

const { account, connectWallet } = useWallet()

const handleConnect = async () => {
  try {
    await connectWallet()
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-4">
      <h1 class="text-2xl font-bold text-indigo-600">TradeChain Dashboard</h1>
    </div>

    <nav>
      <ul class="flex gap-6 font-medium text-gray-700">
        <li>
          <NuxtLink
            to="/"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Home</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/wallets"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Wallets</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/contracts"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Contracts</NuxtLink
          >
        </li>
      </ul>
    </nav>

    <div class="ml-4">
      <Button v-if="!account" @click="handleConnect">Connect Wallet</Button>
      <span v-else class="px-2 py-1 bg-gray-100 rounded text-sm">{{ account }}</span>
    </div>
  </header>
</template>
