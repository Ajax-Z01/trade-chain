<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCompany } from '~/composables/useCompany'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { 
  companies, 
  fetchCompanies, 
  createCompany, 
  updateCompany, 
  deleteCompany, 
  loading 
} = useCompany()

const { addToast } = useToast()

const showModal = ref(false)
const editingCompany = ref<any | null>(null)
const form = ref({
  name: '',
  address: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
  email: '',
  phone: '',
  taxId: '',
  registrationNumber: '',
  businessType: '',
  website: '',
  walletAddress: '',
})

onMounted(() => {
  fetchCompanies()
})

const openCreateModal = () => {
  editingCompany.value = null
  for (const key in form.value) {
    form.value[key as keyof typeof form.value] = ''
  }
  showModal.value = true
}

const openEditModal = (company: any) => {
  editingCompany.value = company
  Object.assign(form.value, company)
  showModal.value = true
}

const submitForm = async () => {
  try {
    if (editingCompany.value) {
      await updateCompany(editingCompany.value.id, form.value)
      addToast('Company updated successfully', 'success')
    } else {
      await createCompany(form.value)
      addToast('Company created successfully', 'success')
    }
    showModal.value = false
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
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Company Management</h1>
      <button @click="openCreateModal" class="btn btn-primary flex items-center gap-2">
        <Plus :size="16" /> Create Company
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-10">
      <Loader2 class="animate-spin" :size="32" />
    </div>

    <!-- Empty state -->
    <div v-else-if="companies.length === 0" class="text-center py-10 text-gray-500">
      No companies found.
    </div>

    <!-- Table -->
    <table v-else class="w-full table-auto border-collapse border border-gray-200">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-4 py-2">Name</th>
          <th class="border px-4 py-2">Country</th>
          <th class="border px-4 py-2">Email</th>
          <th class="border px-4 py-2">Phone</th>
          <th class="border px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in companies" :key="c.id">
          <td class="border px-4 py-2">{{ c.name }}</td>
          <td class="border px-4 py-2">{{ c.country }}</td>
          <td class="border px-4 py-2">{{ c.email }}</td>
          <td class="border px-4 py-2">{{ c.phone || '-' }}</td>
          <td class="border px-4 py-2 flex gap-2">
            <button @click="openEditModal(c)" class="btn btn-sm btn-warning flex items-center gap-1">
              <Edit :size="14" /> Edit
            </button>
            <button @click="removeCompany(c.id)" class="btn btn-sm btn-danger flex items-center gap-1">
              <Trash2 :size="14" /> Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div class="bg-white p-6 rounded-lg w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">{{ editingCompany ? 'Edit Company' : 'Create Company' }}</h2>
        <div class="grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto">
          <input v-model="form.name" placeholder="Name" class="input" />
          <input v-model="form.address" placeholder="Address" class="input" />
          <input v-model="form.city" placeholder="City" class="input" />
          <input v-model="form.stateOrProvince" placeholder="State / Province" class="input" />
          <input v-model="form.postalCode" placeholder="Postal Code" class="input" />
          <input v-model="form.country" placeholder="Country" class="input" />
          <input v-model="form.email" placeholder="Email" class="input" />
          <input v-model="form.phone" placeholder="Phone" class="input" />
          <input v-model="form.taxId" placeholder="Tax ID" class="input" />
          <input v-model="form.registrationNumber" placeholder="Registration Number" class="input" />
          <input v-model="form.businessType" placeholder="Business Type" class="input" />
          <input v-model="form.website" placeholder="Website" class="input" />
          <input v-model="form.walletAddress" placeholder="Wallet Address" class="input" />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitForm" class="btn btn-primary">{{ editingCompany ? 'Update' : 'Create' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  border: 1px solid #ccc;
  padding: 0.5rem;
  border-radius: 0.375rem;
  width: 100%;
}
.btn {
  @apply px-3 py-1 rounded-md font-medium;
}
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
.btn-secondary {
  @apply bg-gray-300 text-gray-800 hover:bg-gray-400;
}
.btn-warning {
  @apply bg-yellow-400 text-white hover:bg-yellow-500;
}
.btn-danger {
  @apply bg-red-500 text-white hover:bg-red-600;
}
.btn-sm {
  @apply text-sm px-2 py-1;
}
</style>
