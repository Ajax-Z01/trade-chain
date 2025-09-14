<script setup lang="ts">
const props = defineProps<{
  show: boolean
  company: any
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
}>()

const close = () => emit('update:show', false)
</script>

<template>
  <div v-if="props.show" class="modal-backdrop">
    <div class="modal">
      <h2 class="text-xl font-bold mb-4">Company Details</h2>
      <div class="modal-content grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
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
        <div><strong>Website:</strong> {{ props.company?.website || '-' }}</div>
        <div><strong>Wallet Address:</strong> {{ props.company?.walletAddress || '-' }}</div>
      </div>
      <div class="modal-footer">
        <button @click="close" class="btn-primary">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.modal {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 600px;
}

.modal-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary {
  background-color: #2563eb;
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.btn-primary:hover { background-color: #1e40af; }
</style>
