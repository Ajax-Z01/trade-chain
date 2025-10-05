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
    document.body.style.overflow = 'hidden' // disable background scroll
  } else {
    showModal.value = false
    document.body.style.overflow = '' // enable scroll
  }
})

const close = () => emit('update:show', false)
</script>

<template>
  <transition name="fade">
    <div v-if="showModal" class="modal-backdrop" @click.self="close">
      <transition name="scale">
        <div class="modal bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
          <h2 class="text-2xl font-bold mb-4">Company Details</h2>

          <div class="modal-content grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div><strong>Name:</strong> {{ props.company?.name || '-' }}</div>
            <div><strong>Address:</strong> {{ props.company?.address || '-' }}</div>
            <div><strong>City:</strong> {{ props.company?.city || '-' }}</div>
            <div><strong>State / Province:</strong> {{ props.company?.stateOrProvince || '-' }}</div>
            <div><strong>Postal Code:</strong> {{ props.company?.postalCode || '-' }}</div>
            <div><strong>Country:</strong> {{ props.company?.country || '-' }}</div>
            <div><strong>Email:</strong> {{ props.company?.email || '-' }}</div>
            <div><strong>Phone:</strong> {{ props.company?.phone || '-' }}</div>
            <div><strong>Tax ID:</strong> {{ props.company?.taxId || '-' }}</div>
            <div><strong>Registration Number:</strong> {{ props.company?.registrationNumber || '-' }}</div>
            <div><strong>Business Type:</strong> {{ props.company?.businessType || '-' }}</div>
            <div>
              <strong>Website:</strong>
              <span v-if="props.company?.website">
                <a
                  :href="props.company.website"
                  target="_blank"
                  class="text-blue-600 dark:text-blue-400 hover:underline break-all max-w-full inline-block"
                >
                  {{ props.company.website }}
                </a>
              </span>
              <span v-else>-</span>
            </div>
            <div><strong>Wallet Address:</strong> {{ props.company?.walletAddress || '-' }}</div>
          </div>

          <div class="modal-footer">
            <button class="btn-primary" @click="close">Close</button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

/* Modal */
.modal {
  padding: 2rem;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  transform-origin: center;
}

/* Content Grid */
.modal-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* Buttons */
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

/* Animations */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.scale-enter-active, .scale-leave-active {
  transition: transform 0.25s ease;
}
.scale-enter-from {
  transform: scale(0.95);
}
.scale-leave-to {
  transform: scale(0.95);
}
</style>
