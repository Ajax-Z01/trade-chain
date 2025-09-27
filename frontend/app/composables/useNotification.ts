import { useRuntimeConfig } from '#app'
import { ref, computed } from 'vue'

export function useNotification() {
  const notifications = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const config = useRuntimeConfig()
  const $apiBase = config.public.apiBase

  // --- Fetch all notifications ---
  const fetchAllNotifications = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/notification`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      notifications.value = data.data ?? []
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // --- Fetch notifications for a specific user ---
  const fetchNotificationsByUser = async (userId: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/notification/user/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      notifications.value = data.data ?? []
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // --- Fetch single notification ---
  const fetchNotificationById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/notification/${id}`)
      if (!res.ok) throw new Error('Failed to fetch notification')
      const data = await res.json()
      return data.data ?? null
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // --- Mark single notification as read ---
  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${$apiBase}/notification/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark as read')
      const idx = notifications.value.findIndex(n => n.id === id)
      if (idx !== -1) notifications.value[idx].read = true
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    }
  }

  // --- Delete notification ---
  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`${$apiBase}/notification/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete notification')
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    }
  }

  // --- Mark all as read ---
  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.value.filter(n => !n.read).map(n => markAsRead(n.id))
      )
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    }
  }

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  return {
    notifications,
    loading,
    error,
    fetchAllNotifications,
    fetchNotificationsByUser,
    fetchNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  }
}
