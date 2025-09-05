<script setup lang="ts">
import { CheckCircle2, XCircle, Info } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle2
    case 'error': return XCircle
    case 'info': return Info
    default: return Info
  }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
    <TransitionGroup
      name="toast"
      tag="div"
      class="flex flex-col gap-3"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white overflow-hidden"
        :class="toast.type === 'success' ? 'bg-green-600' :
                toast.type === 'error' ? 'bg-red-600' :
                toast.type === 'info' ? 'bg-blue-600' :
                toast.type === 'warning' ? 'bg-yellow-600' :
                'bg-gray-700'"
      >
        <!-- Icon -->
        <component
          :is="getIcon(toast.type)"
          class="w-5 h-5 flex-shrink-0"
        />

        <!-- Message -->
        <span class="flex-1">{{ toast.message }}</span>

        <!-- Close button -->
        <button
          class="ml-2 text-white/70 hover:text-white"
          @click="removeToast(toast.id)"
        >
          ✕
        </button>

        <!-- Progress bar -->
        <div
          class="absolute bottom-0 left-0 h-1 bg-white/50"
          :style="{ width: toast.progress + '%' }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
