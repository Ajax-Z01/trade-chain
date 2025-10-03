<script setup lang="ts">
import { ref } from 'vue'
import { Loader2, Plus, Minus, Users } from 'lucide-vue-next'

// Props dari parent
const props = defineProps<{
  isAdmin: boolean
  minterAddress: string
  addingMinter: boolean
  removingMinter: boolean
  approvedMintersKYC: string[]
  loadingMintersKYC: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:minterAddress', value: string): void
  (e: 'addMinter'): void
  (e: 'removeMinter'): void
}>()

// Input handler
const onInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  emit('update:minterAddress', val)
}
</script>

<template>
  <div v-if="isAdmin" class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
    <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <Users class="w-5 h-5" /> Manage Minters
    </h3>

    <!-- Minter input -->
    <input
      :value="minterAddress"
      @input="onInput"
      type="text"
      placeholder="Enter minter address"
      class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
    />

    <!-- Action buttons -->
    <div class="flex gap-2 flex-wrap">
      <button
        class="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        :disabled="addingMinter || !minterAddress"
        @click="emit('addMinter')"
      >
        <Loader2 v-if="addingMinter" class="w-4 h-4 animate-spin" />
        <Plus v-else class="w-4 h-4" /> Add
      </button>

      <button
        class="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        :disabled="removingMinter || !minterAddress"
        @click="emit('removeMinter')"
      >
        <Loader2 v-if="removingMinter" class="w-4 h-4 animate-spin" />
        <Minus v-else class="w-4 h-4" /> Remove
      </button>
    </div>

    <!-- Approved Minters List -->
    <div class="mt-2">
      <p><strong>Approved Minters (KYC):</strong></p>
      <div class="flex flex-wrap gap-2 mt-1">
        <span
          v-for="addr in approvedMintersKYC"
          :key="addr"
          class="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
        >
          {{ addr }}
        </span>
        <span v-if="loadingMintersKYC" class="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  </div>
</template>
