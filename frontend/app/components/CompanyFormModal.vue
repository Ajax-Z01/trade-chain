<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  modelValue: any
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'submit', data: any): void
}>()

const form = ref({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  form.value = { ...val }
})

const close = () => {
  emit('update:show', false)
}

const submit = () => {
  emit('submit', { ...form.value })
}
</script>

<template>
  <div v-if="props.show" class="modal-backdrop">
    <div class="modal">
      <h2 class="text-xl font-bold mb-4">{{ props.editing ? 'Edit Company' : 'Create Company' }}</h2>
      <div class="modal-content grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
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
      <div class="modal-footer">
        <button class="btn-secondary" @click="close">Cancel</button>
        <button class="btn-primary" @click="submit">{{ props.editing ? 'Update' : 'Create' }}</button>
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
  box-sizing: border-box;
}

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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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

.btn-secondary {
  background-color: #d1d5db;
  color: #1f2937;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.btn-secondary:hover { background-color: #9ca3af; }
</style>
