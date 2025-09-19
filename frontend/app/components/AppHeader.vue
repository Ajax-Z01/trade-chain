<script setup lang="ts">
import { ref } from 'vue'
import { NuxtLink } from '#components'
import { useWallet } from '~/composables/useWallets'
import Button from '~/components/ui/Button.vue'
import { Menu, X } from 'lucide-vue-next'

const { account, connectWallet } = useWallet()
const mobileOpen = ref(false)

const handleConnect = async () => {
  try {
    await connectWallet()
  } catch (e) {
    console.error(e)
  }
}

const toggleMobile = () => {
  mobileOpen.value = !mobileOpen.value
}
</script>

<template>
  <header class="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
    <!-- Left -->
    <div class="flex items-center gap-4">
      <h1 class="text-xl md:text-2xl font-bold text-indigo-600">TradeChain Dashboard</h1>
    </div>

    <!-- Desktop Nav -->
    <nav class="hidden md:block">
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
        <li>
          <NuxtLink
            to="/logs/wallet"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Wallet Logs</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/logs/contract"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Contract Logs</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/logs/activity"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Activity Logs</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/logs/aggregatedactivity"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Aggregated Activity Logs</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/documents"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Document</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/kyc"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >KYC</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/faucet"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Faucet</NuxtLink
          >
        </li>
        <li>
          <NuxtLink
            to="/company"
            class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
            >Company</NuxtLink
          >
        </li>
      </ul>
    </nav>

    <!-- Wallet -->
    <div class="hidden md:block ml-4">
      <Button v-if="!account" @click="handleConnect">Connect Wallet</Button>
      <span v-else class="px-2 py-1 bg-gray-100 rounded text-sm truncate max-w-[160px] block">
        {{ account }}
      </span>
    </div>

    <!-- Mobile Hamburger -->
    <button
      class="md:hidden p-2 rounded hover:bg-gray-100 transition"
      @click="toggleMobile"
    >
      <Menu v-if="!mobileOpen" class="w-6 h-6 text-gray-700" />
      <X v-else class="w-6 h-6 text-gray-700" />
    </button>
  </header>

  <!-- Mobile Menu -->
  <transition name="fade">
    <div
      v-if="mobileOpen"
      class="md:hidden bg-white border-t shadow-md px-4 py-3 space-y-3"
    >
      <ul class="flex flex-col gap-3 font-medium text-gray-700">
        <li>
          <NuxtLink to="/" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Home</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/wallets" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Wallets</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/contracts" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Contracts</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/logs/wallet" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Wallet Logs</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/logs/contract" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Contract Logs</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/logs/activity" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Activity Logs</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/logs/aggregatedactivity" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Aggregated Activity Logs</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/documents" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Document</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/kyc" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">KYC</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/faucet" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Faucet</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/company" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition" @click="mobileOpen=false">Company</NuxtLink>
        </li>
      </ul>

      <!-- Wallet (Mobile) -->
      <div class="pt-3 border-t">
        <Button v-if="!account" class="w-full" @click="handleConnect">Connect Wallet</Button>
        <span v-else class="px-2 py-1 bg-gray-100 rounded text-sm block truncate">
          {{ account }}
        </span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
