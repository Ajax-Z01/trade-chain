<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { NuxtLink } from '#components'
import Button from '~/components/ui/Button.vue'
import { useWallet } from '~/composables/useWallets'
import { useNotification } from '~/composables/useNotification'
import { Menu, X, Bell } from 'lucide-vue-next'

const { account, connectWallet } = useWallet()
const mobileOpen = ref(false)
const notifOpen = ref(false)

// --- Notification composable: init with current account ---
const { 
  notifications, 
  unreadCount, 
  fetchNotificationsByUser, 
  markAsRead 
} = useNotification(account.value ?? '')

// Fetch & init WebSocket when account changes
watch(account, (acc) => {
  if (acc) {
    fetchNotificationsByUser(acc)
  }
})

// Handlers
const toggleMobile = () => mobileOpen.value = !mobileOpen.value
const toggleNotif = () => notifOpen.value = !notifOpen.value
const handleConnect = async () => { try { await connectWallet() } catch(e) { console.error(e) } }

const latestNotifs = computed(() => notifications.value.slice(0,5))

const formatDate = (ts: number) => new Date(ts).toLocaleString()
const markNotifAsRead = async (id: string) => await markAsRead(id)
</script>

<template>
  <header class="bg-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto flex items-center justify-between p-4 md:px-6">
      <!-- Logo -->
      <div class="flex items-center gap-4">
        <h1 class="text-xl md:text-2xl font-bold text-indigo-600">TradeChain Dashboard</h1>
      </div>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-4 font-medium text-gray-700">
        <NuxtLink v-for="link in [
          {to:'/', label:'Home'}, 
          {to:'/wallets', label:'Wallets'}, 
          {to:'/contracts', label:'Contracts'},
          {to:'/logs', label:'Logs'},
          {to:'/documents', label:'Document'},
          {to:'/kyc', label:'KYC'},
          {to:'/faucet', label:'Faucet'},
          {to:'/company', label:'Company'}
        ]" 
        :key="link.to" 
        :to="link.to"
        class="px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition">
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Right: Wallet & Notifications -->
      <div class="flex items-center gap-4">
        <!-- Notification -->
        <div class="relative">
          <button @click="toggleNotif" class="relative p-2 rounded hover:bg-gray-100 transition">
            <Bell class="w-6 h-6 text-gray-700"/>
            <span v-if="unreadCount" class="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1">{{ unreadCount }}</span>
          </button>

          <!-- Notification Dropdown -->
          <transition name="fade">
            <div v-if="notifOpen" class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-lg rounded-lg z-50">
              <div class="p-3 font-semibold border-b border-gray-100">Notifications</div>

              <ul class="max-h-64 overflow-y-auto">
                <li 
                  v-for="n in latestNotifs" 
                  :key="n.id"
                  class="flex flex-col p-2 hover:bg-indigo-50 transition rounded"
                  :class="{'bg-indigo-50': !n.read}"
                >
                  <div class="flex justify-between items-center">
                    <h3 class="font-medium text-gray-800 text-sm truncate">{{ n.title }}</h3>
                    <button 
                      v-if="!n.read" 
                      class="text-blue-500 text-xs ml-2 hover:underline"
                      @click="markNotifAsRead(n.id)"
                    >
                      Mark
                    </button>
                  </div>

                  <p class="text-gray-600 text-xs mt-0.5 truncate">{{ n.message }}</p>
                  <p class="text-gray-500 text-[10px] mt-0.5 truncate italic">by: {{ n.userId }}</p>
                  <p class="text-gray-400 text-[10px] mt-0.5">{{ formatDate(n.createdAt) }}</p>
                </li>
                <li v-if="!latestNotifs.length" class="p-2 text-center text-gray-400 text-sm">No notifications</li>
              </ul>

              <NuxtLink to="/notifications" class="block text-center p-2 text-blue-600 hover:bg-gray-100 border-t border-gray-100 rounded-b-lg text-sm">
                View All
              </NuxtLink>
            </div>
          </transition>
        </div>

        <!-- Wallet -->
        <div>
          <Button v-if="!account" @click="handleConnect">Connect Wallet</Button>
          <span v-else class="px-2 py-1 bg-gray-100 rounded text-sm truncate max-w-[160px] block">{{ account }}</span>
        </div>

        <!-- Mobile Hamburger -->
        <button class="md:hidden p-2 rounded hover:bg-gray-100 transition" @click="toggleMobile">
          <Menu v-if="!mobileOpen" class="w-6 h-6 text-gray-700"/>
          <X v-else class="w-6 h-6 text-gray-700"/>
        </button>
      </div>
    </div>

    <!-- Mobile Nav -->
    <transition name="fade">
      <nav v-if="mobileOpen" class="md:hidden bg-white border-t border-gray-200 shadow-inner">
        <ul class="flex flex-col p-4 gap-2">
          <li v-for="link in [
            {to:'/', label:'Home'}, 
            {to:'/wallets', label:'Wallets'}, 
            {to:'/contracts', label:'Contracts'},
            {to:'/logs', label:'Logs'},
            {to:'/documents', label:'Document'},
            {to:'/kyc', label:'KYC'},
            {to:'/faucet', label:'Faucet'},
            {to:'/company', label:'Company'}
          ]" :key="link.to">
            <NuxtLink :to="link.to" class="block px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition">
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </transition>
  </header>
</template> 

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all .2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
