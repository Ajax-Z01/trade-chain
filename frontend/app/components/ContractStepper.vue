<script setup lang="ts">
import { Check, FileText, Handshake, Package, Flag, XCircle } from "lucide-vue-next"

interface Props {
  currentStage: number              // stage dari kontrak (0..6)
  userRole: 'importer' | 'exporter' | null
  importerSigned?: boolean
  exporterSigned?: boolean
  depositDone?: boolean
}
const props = defineProps<Props>()

// Definisi step UI
const stages = [
  { key: 0, label: "Draft", icon: FileText },
  { key: 1, label: "Signed", icon: Handshake },   // indikator importer/exporter
  { key: 2, label: "Deposit", icon: Check },      // deposit sebelum shipping
  { key: 3, label: "Shipping", icon: Package },
  { key: 4, label: "Completed", icon: Flag },
  { key: 5, label: "Cancelled", icon: XCircle },
]

// Tentukan stage hijau (sudah selesai)
const isCompleted = (idx: number) => {
  switch (idx) {
    case 0: return true    // Draft selesai jika sudah masuk stage Signed
    case 1: return props.importerSigned && props.exporterSigned // Signed selesai jika kedua pihak tanda tangan
    case 2: return props.depositDone                 // Deposit selesai
    case 3: return props.currentStage > 3            // Shipping selesai jika currentStage > Shipping
    case 4: return props.currentStage === 5          // Completed
    default: return false
  }
}

// Tentukan stage yang menunggu action user → highlight kuning
const highlightStage = () => {
  if (props.currentStage === 6) return -1 // Cancelled
  // Deposit action
  if (props.currentStage === 3 && props.userRole === 'importer' && !props.depositDone) return 2
  // Shipping action
  if (props.currentStage === 3 && props.userRole === 'exporter') return 3
  // Highlight Signed jika belum tanda tangan
  if (props.currentStage === 0) {
    if (props.userRole === 'importer' && !props.importerSigned) return 1
    if (props.userRole === 'exporter' && !props.exporterSigned) return 1
  }
  return -1
}

// Ring biru untuk action yang diperlukan
const isActionRequired = (idx: number) => highlightStage() === idx
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div v-for="(stage, idx) in stages" :key="stage.key" class="flex flex-col items-center flex-1 relative">
      
      <!-- Icon wrapper -->
      <div
        class="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
        :class="[ 
          isCompleted(idx)
            ? 'bg-green-500 text-white'
            : highlightStage() === idx
              ? 'bg-yellow-400 text-white animate-pulse'
              : 'bg-gray-200 text-gray-500',
          isActionRequired(idx) ? 'ring-2 ring-blue-400 animate-pulse' : ''
        ]"
      >
        <component :is="stage.icon" class="w-5 h-5" />

        <!-- Partial sign indicators untuk step Signed -->
        <template v-if="stage.key === 1">
          <span
            v-if="props.importerSigned"
            class="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border border-white"
          />
          <span
            v-if="props.exporterSigned"
            class="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border border-white"
          />
          <Check
            v-if="props.importerSigned && props.exporterSigned"
            class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full text-green-600"
          />
        </template>

        <!-- Check untuk completed stages setelah Deposit -->
        <Check
          v-if="isCompleted(idx) && idx > 2 && idx < 5"
          class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full text-green-600"
        />
      </div>

      <!-- Label -->
      <span
        class="mt-2 text-xs font-medium text-center"
        :class="[ 
          isCompleted(idx)
            ? 'text-green-600'
            : highlightStage() === idx
              ? 'text-yellow-600'
              : 'text-gray-500'
        ]"
      >
        {{ stage.label }}
      </span>

      <!-- Connector line -->
      <div
        v-if="idx < stages.length - 1"
        class="h-0.5 w-full mt-2 transition-colors duration-300"
        :class="[isCompleted(idx) ? 'bg-green-500' : 'bg-gray-300']"
      />
    </div>
  </div>
</template>
