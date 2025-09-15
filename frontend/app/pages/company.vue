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
  <div class="p-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Company Management</h1>
      <button class="btn-primary flex items-center gap-2" @click="openCreateModal">
        <Plus :size="16" /> Create Company
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-2 py-10">
      <div v-for="n in 5" :key="n" class="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="companies.length === 0" class="text-center py-10 text-gray-500">
      No companies found.
    </div>

    <!-- Table -->
    <table v-else class="w-full border-collapse">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-4 py-2">Name</th>
          <th class="border px-4 py-2">Country</th>
          <th class="border px-4 py-2">Email</th>
          <th class="border px-4 py-2">Phone</th>
          <th class="border px-4 py-2">Business Type</th>
          <th class="border px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(c, idx) in companies"
          :key="c.id"
          :class="idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
          class="hover:bg-gray-100 transition-colors"
        >
          <td class="border px-4 py-2">{{ c.name }}</td>
          <td class="border px-4 py-2">{{ c.country }}</td>
          <td class="border px-4 py-2">{{ c.email }}</td>
          <td class="border px-4 py-2">{{ c.phone || '-' }}</td>
          <td class="border px-4 py-2">{{ c.businessType || '-' }}</td>
          <td class="border px-4 py-2 flex gap-1">
            <button class="btn-info" title="View Details" @click="openDetailModal(c)">
              <Eye :size="14" />
            </button>
            <button class="btn-warning" title="Edit" @click="openEditModal(c)">
              <Edit :size="14" />
            </button>
            <button class="btn-danger" title="Delete" @click="removeCompany(c.id)">
              <Trash2 :size="14" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

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
.btn-primary {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.btn-primary:hover {
  background-color: #1e40af;
}
.btn-warning {
  background-color: #f59e0b;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
}
.btn-warning:hover {
  background-color: #d97706;
}
.btn-danger {
  background-color: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
}
.btn-danger:hover {
  background-color: #dc2626;
}
.btn-info {
  background-color: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
}
.btn-info:hover {
  background-color: #1d4ed8;
}
</style>
