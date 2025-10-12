<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useUserCompany } from '~/composables/useUserCompany'
import type { UserCompany } from '~/types/UserCompany'
import UserCompanyModal from '~/components/usercompany/UserCompanyModal.vue'

const {
  userCompanies,
  loading,
  page,
  limit,
  searchText,
  filterRole,
  filterStatus,
  fetchUserCompanies,
  createUserCompany,
  updateUserCompany,
  deleteUserCompany,
} = useUserCompany()

const showModal = ref(false)
const editing = ref(false)
const selectedUC = ref<UserCompany | null>(null)

const openModal = (uc: UserCompany | null = null) => {
  selectedUC.value = uc
  editing.value = !!uc
  showModal.value = true
}

const handleSubmit = async (formData: Partial<UserCompany>) => {
  if (editing.value && formData.id) {
    await updateUserCompany(formData.id, {
      role: formData.role!,
      status: formData.status!,
    })
  } else {
    await createUserCompany({
      userAddress: formData.userAddress!,
      companyId: formData.companyId!,
      role: formData.role!,
      status: formData.status!,
      joinedAt: Date.now(),
    })
  }
  showModal.value = false
  fetchUserCompanies()
}

const confirmDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this relation?')) {
    await deleteUserCompany(id)
    fetchUserCompanies()
  }
}

const prevPage = () => { if (page.value > 1) page.value-- }
const nextPage = () => { page.value++ }
const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleString() : '-'

watch([searchText, filterRole, filterStatus, page], () => fetchUserCompanies())
onMounted(() => fetchUserCompanies())
</script>

<template>
  <div class="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">User-Company Management</h1>
      <button @click="openModal()" class="btn btn-primary">+ Add Relation</button>
    </div>

    <!-- Filters/Search -->
    <div class="flex flex-wrap gap-2 mb-4">
      <input v-model="searchText" type="text" placeholder="Search..." class="input input-bordered dark:bg-gray-800 dark:text-gray-100" />
      <select v-model="filterRole" class="select select-bordered dark:bg-gray-800 dark:text-gray-100">
        <option value="">All Roles</option>
        <option value="owner">Owner</option>
        <option value="staff">Staff</option>
      </select>
      <select v-model="filterStatus" class="select select-bordered dark:bg-gray-800 dark:text-gray-100">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
      </select>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
      <table class="table w-full text-left">
        <thead class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
          <tr>
            <th class="px-4 py-2">User Address</th>
            <th class="px-4 py-2">Company ID</th>
            <th class="px-4 py-2">Role</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Joined At</th>
            <th class="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="uc in userCompanies" :key="uc.id" class="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <td class="px-4 py-2 break-all">{{ uc.userAddress }}</td>
            <td class="px-4 py-2 break-all">{{ uc.companyId }}</td>
            <td class="px-4 py-2 capitalize">{{ uc.role }}</td>
            <td class="px-4 py-2 capitalize">{{ uc.status }}</td>
            <td class="px-4 py-2">{{ formatDate(uc.joinedAt) }}</td>
            <td class="px-4 py-2 space-x-2">
              <button @click="openModal(uc)" class="btn btn-sm btn-warning">Edit</button>
              <button @click="confirmDelete(uc.id)" class="btn btn-sm btn-error">Delete</button>
            </td>
          </tr>
          <tr v-if="!loading && userCompanies.length === 0">
            <td colspan="6" class="text-center py-6 text-gray-500 dark:text-gray-400">No relations found.</td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
    </div>

    <!-- Pagination -->
    <div class="flex justify-end mt-4 space-x-2 items-center">
      <button @click="prevPage" :disabled="page === 1" class="btn btn-sm">Prev</button>
      <span>Page {{ page }}</span>
      <button @click="nextPage" :disabled="userCompanies.length < limit" class="btn btn-sm">Next</button>
    </div>

    <!-- Modal Component -->
    <UserCompanyModal
      v-model:show="showModal"
      :model-value="selectedUC"
      :editing="editing"
      @submit="handleSubmit"
    />
  </div>
</template>
