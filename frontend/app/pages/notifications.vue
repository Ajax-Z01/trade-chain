<script setup lang="ts">
import { watch } from 'vue'
import { useNotification } from '~/composables/useNotification'
import { useWallet } from '~/composables/useWallets'

const { 
  notifications, 
  loading, 
  unreadCount, 
  fetchNotificationsByUser, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = useNotification()

const { account } = useWallet()

// Fetch notifications on mount
watch(account, (newAccount) => {
  if (newAccount) {
    fetchNotificationsByUser(newAccount)
  }
})

// Helper to format timestamp
const formatDate = (ts: number) => {
  const date = new Date(ts)
  return date.toLocaleString()
}

// Wrappers for logging (optional)
const markAsReadWithLog = async (id: string) => {
  await markAsRead(id)
}

const deleteNotificationWithLog = async (id: string) => {
  await deleteNotification(id)
}

const markAllAsReadWithLog = async () => {
  await markAllAsRead()
}
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
        @click="markAllAsReadWithLog"
        :disabled="!unreadCount"
      >
        Mark all as read
      </button>
    </div>

    <div v-if="loading" class="text-center py-4">Loading...</div>
    <div v-else-if="!notifications.length" class="text-center py-4">No notifications</div>

    <ul class="space-y-2">
      <li
        v-for="n in notifications"
        :key="n.id"
        :class="['p-3 rounded shadow flex justify-between items-center', n.read ? 'bg-gray-100' : 'bg-white border-l-4 border-blue-500']"
      >
        <div>
          <h3 class="font-semibold">{{ n.title }}</h3>
          <p class="text-sm text-gray-700">{{ n.message }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ formatDate(n.createdAt) }}</p>
        </div>
        <div class="flex space-x-2">
          <button
            v-if="!n.read"
            class="text-sm text-blue-500 hover:underline"
            @click="markAsReadWithLog(n.id)"
          >
            Mark as read
          </button>
          <button
            class="text-sm text-red-500 hover:underline"
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
/* opsional styling tambahan */
</style>
