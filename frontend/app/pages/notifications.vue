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

watch(account, (acc) => {
  if (acc) fetchNotificationsByUser(acc)
}, { immediate: true })

const sortedNotifications = computed(() => [...notifications.value].sort((a,b) => b.createdAt - a.createdAt))

const formatDate = (ts: number) => new Date(ts).toLocaleString()

const markAsReadWithLog = async (id: string) => await markAsRead(id)
const deleteNotificationWithLog = async (id: string) => await deleteNotification(id)
const markAllAsReadWithLog = async () => await markAllAsRead()
</script>

<template>
<div class="p-4 max-w-3xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
    <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
      Notifications
      <span v-if="unreadCount" class="ml-2 text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
        {{ unreadCount }}
      </span>
    </h1>
    <button
      class="mt-2 sm:mt-0 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition hover:cursor-pointer"
      :disabled="!unreadCount"
      @click="markAllAsReadWithLog"
    >
      Mark all as read
    </button>
  </div>

  <div v-if="loading" class="text-center py-6 text-gray-500">Loading notifications...</div>
  <div v-else-if="!notifications.length" class="text-center py-6 text-gray-400">No notifications</div>

  <ul class="space-y-3">
    <li
      v-for="n in sortedNotifications"
      :key="n.id"
      :class="[
        'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all border-l-4',
        !n.read ? 'border-blue-500' : 'border-transparent'
      ]"
    >
      <!-- Header: title + date -->
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start">
        <div class="min-w-0">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{{ n.title }}</h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm mt-0.5 truncate">{{ n.message }}</p>
        </div>
        <p class="text-gray-400 dark:text-gray-400 text-xs mt-1 sm:mt-0 whitespace-nowrap">{{ formatDate(n.createdAt) }}</p>
      </div>

      <!-- Executor -->
      <p class="text-gray-500 dark:text-gray-400 text-xs mt-1 italic truncate">by: {{ n.executorId }}</p>

      <!-- Extra data -->
      <div v-if="n.extraData?.data" class="mt-2 text-gray-500 dark:text-gray-400 text-xs space-y-0.5">
        <div v-for="(value, key) in n.extraData.data" :key="key" class="flex justify-between">
          <span class="font-medium">{{ key }}:</span> <span>{{ value }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2 mt-3">
        <button
          v-if="!n.read"
          class="text-blue-500 text-xs px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition"
          @click="markAsReadWithLog(n.id)"
        >
          Mark as read
        </button>
        <button
          class="text-red-500 text-xs px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition"
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
li {
  transform: translateY(0);
  transition: all 0.2s ease;
}
li:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
</style>
