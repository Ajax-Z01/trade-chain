<script setup lang="ts">
import { ref } from 'vue'
import { Loader2, User as UserIcon } from 'lucide-vue-next'
import { useUserStore } from '~/stores/userStore'
import { useToast } from '~/composables/useToast'

const userStore = useUserStore()
const { addToast } = useToast()

// ambil nama dari metadata user saat ini
const editingName = ref(userStore.currentUser?.metadata?.name || '')
const saving = ref(false)

const handleSave = async () => {
  if (!userStore.currentUser) return

  if (!editingName.value.trim()) {
    addToast('Name cannot be empty', 'error')
    return
  }

  saving.value = true
  const ok = await userStore.updateMe({
    metadata: {
      ...userStore.currentUser.metadata,
      name: editingName.value.trim(),
    },
  })
  saving.value = false

  if (ok) {
    addToast('Profile updated successfully', 'success')
  } else {
    addToast('Failed to update profile', 'error')
  }
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <UserIcon class="w-6 h-6" />
      Profile
    </h1>

    <div v-if="userStore.loading" class="flex justify-center py-10">
      <Loader2 class="w-6 h-6 animate-spin text-gray-500" />
    </div>

    <div v-else-if="userStore.currentUser" class="bg-white dark:bg-gray-900 rounded-xl shadow p-6 space-y-4">
      <!-- Address -->
      <div>
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Address</label>
        <input
          type="text"
          :value="userStore.currentUser.address"
          disabled
          class="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-sm"
        />
      </div>

      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name</label>
        <input
          v-model="editingName"
          type="text"
          class="w-full p-2 rounded border dark:bg-gray-800"
          placeholder="Your name"
        />
      </div>

      <!-- Role -->
      <div>
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
        <input
          type="text"
          :value="userStore.currentUser.role"
          disabled
          class="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize"
        />
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          :disabled="saving"
          class="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2 disabled:opacity-50"
          @click="handleSave"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <span v-else>Save</span>
        </button>
      </div>
    </div>

    <div v-else class="text-center text-gray-500 py-10">
      Failed to load profile.
    </div>
  </div>
</template>
