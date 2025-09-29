<script setup lang="ts">
import { watch, computed } from 'vue'
import { useNotification } from '~/composables/useNotification'
import { useWallet } from '~/composables/useWallets'

const { account } = useWallet()
const { 
  notifications, 
  unreadCount, 
  loading, 
  fetchNotificationsByUser, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = useNotification()

// Fetch notifications whenever wallet/account changes
watch(account, (acc) => {
  if (acc) fetchNotificationsByUser(acc)
}, { immediate: true })

// Sorted notifications terbaru dulu
const sortedNotifications = computed(() => [...notifications.value].sort((a,b) => b.createdAt - a.createdAt))

// Format timestamp
const formatDate = (ts: number) => new Date(ts).toLocaleString()

// Wrappers untuk tombol
const markAsReadWithLog = async (id: string) => await markAsRead(id)
const deleteNotificationWithLog = async (id: string) => await deleteNotification(id)
const markAllAsReadWithLog = async () => await markAllAsRead()
</script>

<template>
<div class="p-4 max-w-3xl mx-auto">
  <h1 class="text-2xl font-bold mb-4">
    Notifications
    <span v-if="unreadCount" class="ml-2 text-sm text-white bg-red-500 rounded-full px-2 py-1">
      {{ unreadCount }}
    </span>
  </h1>

  <div class="mb-4 flex justify-end">
    <button
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      :disabled="!unreadCount"
      @click="markAllAsReadWithLog"
    >
      Mark all as read
    </button>
  </div>

  <div v-if="loading" class="text-center py-4">Loading...</div>
  <div v-else-if="!notifications.length" class="text-center py-4">No notifications</div>

  <ul class="space-y-2">
    <li
      v-for="n in sortedNotifications"
      :key="n.id"
      :class="[
        'p-3 rounded-lg shadow-sm hover:shadow-md transition-all bg-white',
        !n.read ? 'border-l-4 border-blue-500' : ''
      ]"
    >
      <!-- Header: title + date -->
      <div class="flex justify-between items-start">
        <div class="min-w-0">
          <h3 class="font-semibold text-gray-800 text-sm truncate">{{ n.title }}</h3>
          <p class="text-gray-700 text-sm truncate mt-0.5">{{ n.message }}</p>
        </div>
        <p class="text-gray-400 text-xs ml-2 whitespace-nowrap">{{ formatDate(n.createdAt) }}</p>
      </div>

      <!-- User / address -->
      <p class="text-gray-500 text-xs mt-1 truncate italic">{{ n.executorId }}</p>

      <!-- Extra data -->
      <div v-if="n.extraData?.data" class="mt-1 text-gray-400 text-xs space-y-0.5">
        <div v-for="(value, key) in n.extraData.data" :key="key">
          {{ key }}: {{ value }}
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex space-x-2 mt-2">
        <button
          v-if="!n.read"
          class="text-blue-500 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
          @click="markAsReadWithLog(n.id)"
        >
          Mark read
        </button>
        <button
          class="text-red-500 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50"
          @click="deleteNotificationWithLog(n.id)"
        >
          Delete
        </button>
      </div>
    </li>
  </ul>
</div>
</template>

<style scoped>
li:hover {
  transform: translateY(-1px);
  transition: transform 0.1s ease;
}
</style>
