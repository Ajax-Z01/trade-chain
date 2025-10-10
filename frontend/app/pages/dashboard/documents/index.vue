<script setup lang="ts">
import { onMounted } from 'vue'
import { NuxtLink } from '#components'
import { useContracts } from '~/composables/useContracts'
import { FileText, Loader2 } from 'lucide-vue-next'
import Button from '~/components/ui/Button.vue'

// Ambil composable
const { contracts, loading, fetchMyContracts, contractStates } = useContracts()

onMounted(() => {
  fetchMyContracts()
})

// Warna berdasarkan role
const roleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'exporter': return 'bg-green-100 text-green-700'
    case 'importer': return 'bg-blue-100 text-blue-700'
    case 'bank': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const getRole = (contract: string) => contractStates[contract]?.role ?? 'Guest'
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 md:p-6">
    <h1 class="text-2xl font-bold mb-6">My Contracts Lists</h1>

    <div v-if="loading" class="flex justify-center py-10">
      <Loader2 class="animate-spin w-6 h-6 text-gray-500" />
    </div>

    <div v-else-if="!contracts.length" class="text-center text-gray-500 py-10">
      No contracts found.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="contract in contracts.filter(c => contractStates[c]?.role)"
        :key="contract" 
        class="p-4 rounded-xl shadow border bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center gap-2 mb-2">
            <FileText class="w-5 h-5 text-indigo-500" />
            <h2 class="font-semibold text-gray-800 dark:text-gray-200 truncate">{{ contract }}</h2>
          </div>
          <span :class="['inline-block px-2 py-0.5 text-xs font-medium rounded-full', roleColor(getRole(contract))]">
            {{ getRole(contract) }}
          </span>
          <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Status: {{ contractStates[contract]?.finished ? 'Finished' : 'Active' }}
          </p>
        </div>
        <div class="mt-4">
          <NuxtLink :to="`/dashboard/documents/${contract}`">
            <Button class="w-full text-sm">View Documents</Button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
