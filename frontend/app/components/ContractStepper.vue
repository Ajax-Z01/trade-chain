<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { Check, FileText, Handshake, Package, Flag, XCircle } from "lucide-vue-next"
import { useToast } from "@/composables/useToast"

interface Props {
  currentStage: number
  userRole: 'importer' | 'exporter' | null
  importerSigned?: boolean
  exporterSigned?: boolean
  depositDone?: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: "update:stage", val: number): void }>()

const { addToast } = useToast()

// --- Stage mapping ---
const stages = [
  { key: 0, label: "Draft", icon: FileText },
  { key: 1, label: "Signed", icon: Handshake },
  { key: 2, label: "Deposited", icon: Check },
  { key: 3, label: "Shipping", icon: Package },
  { key: 4, label: "Completed", icon: Flag },
  { key: 5, label: "Cancelled", icon: XCircle },
]

// --- Status logic ---
const isCompleted = (idx: number) => {
  switch (idx) {
    case 0: return props.currentStage >= 0
    case 1: return props.importerSigned && props.exporterSigned
    case 2: return props.depositDone && props.currentStage >= 4
    case 3: return props.currentStage >= 5
    case 4: return props.currentStage === 6
    default: return false
  }
}

const highlightStage = () => {
  if (props.currentStage === 7) return -1 // Cancelled

  // Step Signed → highlight jika user belum tanda tangan
  if (props.currentStage === 0 || props.currentStage === 1) {
    if (props.userRole === "importer" && !props.importerSigned) return 1
    if (props.userRole === "exporter" && !props.exporterSigned) return 1
  }

  // Deposit
  if (props.currentStage === 3 && props.userRole === "importer" && !props.depositDone) return 2

  // Shipping
  if (props.currentStage === 4 && props.userRole === "exporter") return 3

  // Complete
  if (props.currentStage === 5 && props.userRole === "importer") return 4

  return -1
}

const isActionRequired = (idx: number) => highlightStage() === idx

// --- Real-time polling ---
const interval = ref<number>()
const fetchStage = async () => {
  // TODO: Replace dengan fetch API / event contract
  emit("update:stage", props.currentStage)
}

onMounted(() => {
  interval.value = window.setInterval(fetchStage, 8000)
})
onUnmounted(() => {
  if (interval.value) clearInterval(interval.value)
})

// --- Toast events ---
watch(
  () => props.currentStage,
  (newStage, oldStage) => {
    if (newStage !== oldStage) {
      const stageLabel = stages.find(s => s.key === newStage)?.label
      if (stageLabel) addToast(`Contract moved to ${stageLabel}`, "info")
    }
  }
)

watch(() => props.depositDone, (done) => {
  if (done) addToast("Deposit has been completed", "success")
})

watch(() => props.importerSigned && props.exporterSigned, (bothSigned) => {
  if (bothSigned) addToast("Both parties signed the contract", "success")
})

// --- Badge status ---
const statusBadge = computed(() => {
  switch (props.currentStage) {
    case -1: return "Ready to Deploy"
    case 0: return "Pending signatures"
    case 1: return "Waiting for exporter"
    case 2: return "Waiting for importer"
    case 3: return "Awaiting deposit"
    case 4: return "Ready to ship"
    case 5: return "Ready to complete"
    case 6: return "Completed"
    case 7: return "Cancelled"
    default: return "Unknown"
  }
})
</script>

<template>
  <div class="w-full" role="region" aria-label="Contract stepper">
    <div
      class="flex items-center justify-between gap-2"
      role="list"
      aria-label="Contract progress stepper"
    >
      <div
        v-for="(stage, idx) in stages"
        :key="stage.key"
        class="flex flex-col items-center flex-1 relative"
        role="listitem"
        :aria-label="stage.label"
        tabindex="0"
        @keyup.enter.prevent="highlightStage() === idx && addToast(`Action required: ${stage.label}`, 'warning')"
        @keyup.space.prevent="highlightStage() === idx && addToast(`Action required: ${stage.label}`, 'warning')"
      >
        <!-- Icon wrapper -->
        <div
          class="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 focus:outline-none"
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

          <!-- Signed indicators -->
          <template v-if="stage.key === 1">
            <span
              v-if="props.importerSigned"
              class="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border border-white"
              aria-label="Importer signed"
            />
            <span
              v-if="props.exporterSigned"
              class="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border border-white"
              aria-label="Exporter signed"
            />
            <Check
              v-if="props.importerSigned && props.exporterSigned"
              class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full text-green-600"
              aria-label="All parties signed"
            />
          </template>

          <!-- Check untuk stage setelah Deposit -->
          <Check
            v-if="isCompleted(idx) && idx > 1 && idx < 5"
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
    
    <!-- Badge -->
    <div class="flex justify-center mt-4">
      <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
        {{ statusBadge }}
      </span>
    </div>
  </div>
</template>
