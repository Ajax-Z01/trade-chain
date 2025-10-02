<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCompany } from '~/composables/useCompany'
import { useWallet } from '~/composables/useWallets'
import { useToast } from '~/composables/useToast'
import { Plus, Edit, Trash2, Eye } from 'lucide-vue-next'

import CompanyFormModal from '~/components/CompanyFormModal.vue'
import CompanyDetailModal from '~/components/CompanyDetailModal.vue'

const { account } = useWallet()
const { companies, fetchCompanies, createCompany, updateCompany, deleteCompany, loading } = useCompany()
const { addToast } = useToast()

const showFormModal = ref(false)
const showDetailModal = ref(false)
const editingCompany = ref<any | null>(null)
const detailCompany = ref<any | null>(null)

watch(account, (newAccount) => {
  if (newAccount) fetchCompanies()
  else companies.value = []
}, { immediate: true })

const openCreateModal = () => {
  editingCompany.value = null
  showFormModal.value = true
}

const openEditModal = (company: any) => {
  editingCompany.value = company
  showFormModal.value = true
}

const openDetailModal = (company: any) => {
  detailCompany.value = company
  showDetailModal.value = true
}

const submitForm = async (data: any) => {
  try {
    if (!account.value) throw new Error('Wallet not connected')
    if (editingCompany.value) {
      await updateCompany(editingCompany.value.id, data)
      addToast('Company updated successfully', 'success')
    } else {
      await createCompany(data)
      addToast('Company created successfully', 'success')
    }
    showFormModal.value = false
    fetchCompanies()
  } catch (err: any) {
    addToast(err.message || 'Operation failed', 'error')
  }
}

const removeCompany = async (id: string) => {
  if (!confirm('Are you sure to delete this company?')) return
  try {
    const success = await deleteCompany(id)
    if (success) {
      addToast('Company deleted successfully', 'success')
      fetchCompanies()
    }
  } catch (err: any) {
    addToast(err.message || 'Delete failed', 'error')
  }
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100">Company Management</h1>
      <button class="btn-primary flex items-center gap-2" @click="openCreateModal">
        <Plus :size="16" /> Create Company
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 5" :key="n" class="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="companies.length === 0" class="text-center py-10 text-gray-500 dark:text-gray-400">
      No companies found.
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <table class="min-w-full table-auto border-collapse">
        <thead class="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Country</th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Business Type</th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, idx) in companies" :key="c.id"
            :class="idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'"
            class="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <td class="px-4 py-2 truncate">{{ c.name }}</td>
            <td class="px-4 py-2 truncate">{{ c.country }}</td>
            <td class="px-4 py-2 truncate">{{ c.email }}</td>
            <td class="px-4 py-2 truncate">{{ c.phone || '-' }}</td>
            <td class="px-4 py-2 truncate">{{ c.businessType || '-' }}</td>
            <td class="px-4 py-2 flex gap-2 flex-wrap">
              <button class="btn-info flex items-center gap-1" title="View Details" @click="openDetailModal(c)">
                <Eye :size="14" /> View
              </button>
              <button class="btn-warning flex items-center gap-1" title="Edit" @click="openEditModal(c)">
                <Edit :size="14" /> Edit
              </button>
              <button class="btn-danger flex items-center gap-1" title="Delete" @click="removeCompany(c.id)">
                <Trash2 :size="14" /> Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modals -->
    <CompanyFormModal
      :show="showFormModal"
      :model-value="editingCompany || {}"
      :editing="!!editingCompany"
      @update:show="val => showFormModal = val"
      @submit="submitForm"
    />
    <CompanyDetailModal
      :show="showDetailModal"
      :company="detailCompany"
      @update:show="val => showDetailModal = val"
    />
  </div>
</template>

<style scoped>
/* Buttons */
.btn-primary {
  background-color: #2563eb;
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
}
.btn-primary:hover { background-color: #1d4ed8; }

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}
.btn-warning:hover { background-color: #d97706; }

.btn-danger {
  background-color: #ef4444;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}
.btn-danger:hover { background-color: #dc2626; }

.btn-info {
  background-color: #3b82f6;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}
.btn-info:hover { background-color: #1d4ed8; }

/* Table */
table {
  border-radius: 0.5rem;
  overflow: hidden;
  min-width: 100%;
  border-collapse: collapse;
}

th, td {
  min-width: 120px;
  vertical-align: middle;
  padding: 0.5rem 1rem;
}

tbody tr:hover {
  cursor: pointer;
}
</style>
