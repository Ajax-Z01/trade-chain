<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '~/stores/userStore'
import { useToast } from '~/composables/useToast'
import { Edit, Trash2, Loader2 } from 'lucide-vue-next'
import type { User } from '~/types/User'

const userStore = useUserStore()
const { addToast } = useToast()

const editingUser = ref<User | null>(null)
const editedName = ref('')
const showEditModal = ref(false)

const saving = ref(false)
const deleting = ref<string | null>(null)

const openEditModal = (user: User) => {
  editingUser.value = { ...user }
  editedName.value = user.metadata?.name ?? ''
  showEditModal.value = true
}

const closeEditModal = () => {
  editingUser.value = null
  editedName.value = ''
  saving.value = false
  showEditModal.value = false
}

const handleDelete = async (address: string) => {
  if (!confirm('Are you sure you want to delete this user?')) return
  deleting.value = address
  const ok = await userStore.remove(address)
  if (ok) {
    addToast('User deleted successfully', 'success')
    if (editingUser.value?.address === address) {
      closeEditModal()
    }
    await userStore.fetchAll()
  } else {
    addToast('Failed to delete user', 'error')
  }
  deleting.value = null
}

const handleSave = async () => {
  if (!editingUser.value) return
  saving.value = true
  const updated = await userStore.update(editingUser.value.address, {
    metadata: { ...editingUser.value.metadata, name: editedName.value }
  })
  saving.value = false

  if (updated) {
    addToast('User updated successfully', 'success')
    await userStore.fetchAll()
    closeEditModal()
  } else {
    addToast('Failed to update user', 'error')
  }
}

onMounted(() => {
  userStore.fetchAll()
})
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">User Management</h1>

    <div v-if="loading" class="flex justify-center p-6">
      <Loader2 class="w-6 h-6 animate-spin text-gray-500" />
    </div>

    <div v-else>
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-800 text-left">
            <th class="p-2 border-b">Address</th>
            <th class="p-2 border-b">Name</th>
            <th class="p-2 border-b">Role</th>
            <th class="p-2 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.address"
            class="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="p-2 font-mono text-sm">{{ user.address }}</td>
            <td class="p-2">{{ user.metadata?.name || '-' }}</td>
            <td class="p-2 capitalize">{{ user.role }}</td>
            <td class="p-2 flex gap-2">
              <button 
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                @click="openEditModal(user)"
                :disabled="deleting === user.address"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button 
                class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800 disabled:opacity-50"
                @click="handleDelete(user.address)"
                :disabled="deleting === user.address"
              >
                <Loader2 v-if="deleting === user.address" class="w-4 h-4 animate-spin text-red-600" />
                <Trash2 v-else class="w-4 h-4 text-red-600" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="users.length === 0" class="text-center text-gray-500 py-8">
        No users found.
      </div>
    </div>

    <!-- Edit Modal -->
    <transition name="fade">
      <div 
        v-if="showEditModal && editingUser" 
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-md shadow-lg">
          <h2 class="text-xl font-semibold mb-4">Edit User</h2>
          <p class="mb-4 font-mono text-sm break-all">{{ editingUser.address }}</p>

          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Name</label>
            <input 
              v-model="editedName" 
              type="text" 
              class="w-full p-2 rounded border dark:bg-gray-800"
            />
          </div>

          <div class="flex justify-end gap-2">
            <button 
              @click="closeEditModal" 
              class="px-3 py-1 bg-gray-200 rounded"
              :disabled="saving"
            >
              Close
            </button>
            <button 
              @click="handleSave" 
              class="px-3 py-1 bg-indigo-600 text-white rounded flex items-center gap-2 disabled:opacity-50"
              :disabled="saving"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span v-else>Save</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
