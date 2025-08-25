<template>
  <div class="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'px-4 py-2 rounded shadow text-white text-sm',
        toast.type === 'success' ? 'bg-green-600' : '',
        toast.type === 'error' ? 'bg-red-600' : '',
        toast.type === 'info' ? 'bg-blue-600' : '',
      ]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'
const { toasts } = useToast()
</script>
