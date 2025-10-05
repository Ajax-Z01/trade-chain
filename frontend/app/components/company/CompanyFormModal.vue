<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  show: boolean
  modelValue: any
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'submit', data: any): void
}>()

const showModal = ref(false)
const form = ref({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  form.value = { ...val }
})

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
const submit = () => emit('submit', { ...form.value })
</script>

<template>
  <transition name="fade">
    <div v-if="showModal" class="modal-backdrop" @click.self="close">
      <transition name="scale">
        <div class="modal bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
          <h2 class="text-2xl font-bold mb-4">{{ props.editing ? 'Edit Company' : 'Create Company' }}</h2>
          
          <div class="modal-content grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            <div class="form-group">
              <label>Name</label>
              <input v-model="form.name" placeholder="Company Name" class="input" />
            </div>
            <div class="form-group">
              <label>Address</label>
              <input v-model="form.address" placeholder="Street Address" class="input" />
            </div>
            <div class="form-group">
              <label>City</label>
              <input v-model="form.city" placeholder="City" class="input" />
            </div>
            <div class="form-group">
              <label>State / Province</label>
              <input v-model="form.stateOrProvince" placeholder="State / Province" class="input" />
            </div>
            <div class="form-group">
              <label>Postal Code</label>
              <input v-model="form.postalCode" placeholder="Postal Code" class="input" />
            </div>
            <div class="form-group">
              <label>Country</label>
              <input v-model="form.country" placeholder="Country" class="input" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="form.email" placeholder="Email" class="input" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.phone" placeholder="Phone" class="input" />
            </div>
            <div class="form-group">
              <label>Tax ID</label>
              <input v-model="form.taxId" placeholder="Tax ID" class="input" />
            </div>
            <div class="form-group">
              <label>Registration Number</label>
              <input v-model="form.registrationNumber" placeholder="Registration Number" class="input" />
            </div>
            <div class="form-group">
              <label>Business Type</label>
              <input v-model="form.businessType" placeholder="Business Type" class="input" />
            </div>
            <div class="form-group">
              <label>Website</label>
              <input
                v-model="form.website"
                placeholder="https://example.com"
                class="input"
                :title="form.website"
              />
            </div>
            <div class="form-group">
              <label>Wallet Address</label>
              <input v-model="form.walletAddress" placeholder="Wallet Address" class="input" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Cancel</button>
            <button class="btn-primary" @click="submit">{{ props.editing ? 'Update' : 'Create' }}</button>
          </div>
        </div>
      </transition>
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
  transition: all 0.2s ease-in-out;
}

.modal-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.input {
  border: 1px solid #ccc;
  padding: 0.5rem;
  border-radius: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  background-color: white;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}
.input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
.dark .input {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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
  transition: background-color 0.2s, transform 0.1s;
}
.btn-primary:hover { background-color: #1e40af; transform: scale(1.03); }

.btn-secondary {
  background-color: #e5e7eb;
  color: #1f2937;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}
.btn-secondary:hover { background-color: #9ca3af; transform: scale(1.03); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.scale-enter-active, .scale-leave-active { transition: transform 0.25s ease; }
.scale-enter-from { transform: scale(0.95); }
.scale-leave-to { transform: scale(0.95); }
</style>
