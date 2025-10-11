<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  show: boolean
  company: any
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
}>()

const showModal = ref(false)

watch(() => props.show, async (val) => {
  if (val) {
    showModal.value = true
    await nextTick()
    document.body.style.overflow = 'hidden'
  } else {
    showModal.value = false
    document.body.style.overflow = ''
  }
})

const close = () => emit('update:show', false)
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="showModal" class="modal-backdrop" @click.self="close">
      <div class="modal bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <h2 class="text-2xl font-bold mb-4">Company Details</h2>

        <div class="modal-content grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div><strong>Name:</strong> {{ company?.name || '-' }}</div>
          <div><strong>Address:</strong> {{ company?.address || '-' }}</div>
          <div><strong>City:</strong> {{ company?.city || '-' }}</div>
          <div><strong>State / Province:</strong> {{ company?.stateOrProvince || '-' }}</div>
          <div><strong>Postal Code:</strong> {{ company?.postalCode || '-' }}</div>
          <div><strong>Country:</strong> {{ company?.country || '-' }}</div>
          <div><strong>Email:</strong> {{ company?.email || '-' }}</div>
          <div><strong>Phone:</strong> {{ company?.phone || '-' }}</div>
          <div><strong>Tax ID:</strong> {{ company?.taxId || '-' }}</div>
          <div><strong>Registration Number:</strong> {{ company?.registrationNumber || '-' }}</div>
          <div><strong>Business Type:</strong> {{ company?.businessType || '-' }}</div>
          <div>
            <strong>Website:</strong>
            <span v-if="company?.website">
              <a
:href="company.website" target="_blank"
                 class="text-blue-600 dark:text-blue-400 hover:underline break-all max-w-full inline-block">
                {{ company.website }}
              </a>
            </span>
            <span v-else>-</span>
          </div>
          <div><strong>Wallet Address:</strong> {{ company?.walletAddress || '-' }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" @click="close">Close</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.modal {
  padding: 2rem;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  transform-origin: center;
}

.modal-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary {
  background-color: #2563eb;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: #1e40af;
}
</style>
