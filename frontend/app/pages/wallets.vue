<script setup lang="ts">
import { ref } from 'vue'
import Button from '~/components/ui/Button.vue'
import { Wallet, PlugZap, Loader2, LogOut, Copy } from 'lucide-vue-next'
import { useWallet } from '~/composables/useWallets'
import { useBalance } from '~/composables/useBalance'

const { account, connectWallet, disconnectWallet } = useWallet()
const { nativeBalance, usdcBalance, loading } = useBalance()

const loadingConnect = ref(false)
const copied = ref(false)

// --- Connect / Disconnect
const handleConnect = async () => {
  try {
    loadingConnect.value = true
    await connectWallet()
  } catch (e) {
    console.error(e)
  } finally {
    loadingConnect.value = false
  }
}

const handleDisconnect = () => {
  disconnectWallet()
}

// --- Utils
const shortenAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

const copyAddress = async () => {
  if (account.value) {
    await navigator.clipboard.writeText(account.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <Wallet class="w-7 h-7 text-indigo-600" />
      <h1 class="text-2xl font-bold">Wallet</h1>
    </div>

    <div
      class="bg-white/80 backdrop-blur rounded-3xl border shadow-lg p-6 transition hover:shadow-2xl"
    >
      <!-- Connected State -->
      <div v-if="account" class="space-y-5">
        <!-- Account -->
        <div>
          <p class="text-gray-700 font-medium mb-1">Connected Account</p>
          <div
            class="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm"
          >
            <span :title="account">{{ shortenAddress(account) }}</span>
            <button
              class="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition"
              @click="copyAddress"
              :title="'Copy full address'"
            >
              <Copy class="w-4 h-4" />
              <span v-if="copied" class="text-xs text-green-600">Copied!</span>
            </button>
          </div>
        </div>

        <!-- Balances -->
        <div class="space-y-2">
          <!-- ETH -->
          <div class="flex items-center gap-2">
            <span class="text-gray-700 font-medium">ETH:</span>
            <span
              v-if="!loading && nativeBalance !== null"
              class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold"
            >
              {{ nativeBalance.toFixed(4) }}
            </span>
            <div v-else class="w-20 h-5 bg-gray-200 rounded-full animate-pulse"></div>
          </div>

          <!-- USDC -->
          <div class="flex items-center gap-2">
            <span class="text-gray-700 font-medium">USDC:</span>
            <span
              v-if="!loading && usdcBalance !== null"
              class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold"
            >
              {{ usdcBalance.toFixed(4) }}
            </span>
            <div v-else class="w-20 h-5 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>

        <!-- Disconnect -->
        <Button
          class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition"
          @click="handleDisconnect"
          title="Disconnect wallet"
        >
          <LogOut class="w-5 h-5" /> Disconnect
        </Button>
      </div>

      <!-- Not Connected State -->
      <div v-else class="space-y-4 text-center">
        <p class="text-gray-500">No wallet connected.</p>
        <Button
          class="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition"
          :disabled="loadingConnect"
          @click="handleConnect"
          title="Connect your wallet"
        >
          <PlugZap class="w-5 h-5" />
          <span v-if="!loadingConnect">Connect Wallet</span>
          <span v-else class="flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin" /> Connecting...
          </span>
        </Button>
      </div>
    </div>
  </div>
</template>
