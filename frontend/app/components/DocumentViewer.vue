<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { X, ZoomIn, ZoomOut, RotateCw, Download, Copy } from "lucide-vue-next"
import { useToast } from "~/composables/useToast"

// Props & Emits
interface Props {
  modelValue: boolean
  src: string
  name?: string
  tokenId?: number | string
  hash?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
}>()

// Toast composable
const { addToast } = useToast()

// --- State ---
const zoom = ref(1)
const rotation = ref(0)

// --- File type detection ---
const fileType = computed<"pdf" | "image" | "other">(() => {
  if (!props.src) return "other"
  const lower = props.src.toLowerCase()
  if (lower.endsWith(".pdf") || lower.includes("application/pdf")) return "pdf"
  if (/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(lower)) return "image"
  return "other"
})

// --- Reset when open ---
watch(() => props.modelValue, (open) => {
  if (open) {
    zoom.value = 1
    rotation.value = 0
  }
})

// --- Actions ---
const close = () => {
  emit("update:modelValue", false)
  addToast("Viewer closed", "info")
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.2, 3)
  addToast(`Zoomed in: ${zoom.value.toFixed(1)}x`, "info")
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.2, 0.5)
  addToast(`Zoomed out: ${zoom.value.toFixed(1)}x`, "info")
}

const rotate = () => {
  rotation.value = (rotation.value + 90) % 360
  addToast(`Rotated: ${rotation.value}°`, "info")
}

const download = () => {
  const link = document.createElement("a")
  link.href = props.src
  link.download = props.name || "document"
  link.click()
  addToast("File downloaded", "success")
}

// Copy to clipboard with toast
const copyToClipboard = (text: string | number | undefined, label?: string) => {
  if (!text) return
  navigator.clipboard.writeText(String(text))
  addToast(`${label || "Value"} copied to clipboard!`, "success")
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4"
  >
    <!-- Header -->
    <div class="w-full max-w-4xl flex justify-between items-center mb-3 text-white">
      <div class="flex flex-col gap-1">
        <span class="font-semibold">{{ props.name || "Document" }}</span>
        <span class="text-sm">
          TokenID: <span class="font-mono">{{ props.tokenId }}</span> |
          Hash: <span class="font-mono">{{ props.hash }}</span>
        </span>
      </div>
      <button class="p-2 bg-red-600 rounded-full hover:bg-red-700" @click="close">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Controls -->
    <div class="flex gap-2 mb-2">
      <button title="Zoom In" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="zoomIn">
        <ZoomIn class="w-5 h-5" />
      </button>
      <button title="Zoom Out" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="zoomOut">
        <ZoomOut class="w-5 h-5" />
      </button>
      <button title="Rotate 90°" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="rotate">
        <RotateCw class="w-5 h-5" />
      </button>
      <button title="Download File" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="download">
        <Download class="w-5 h-5" />
      </button>
      <button title="Copy TokenID" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="copyToClipboard(props.tokenId, 'TokenID')">
        <Copy class="w-5 h-5" />
      </button>
      <button title="Copy File Hash" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="copyToClipboard(props.hash, 'File Hash')">
        <Copy class="w-5 h-5" />
      </button>
      <button title="Copy File Name" class="p-2 bg-white rounded-full hover:bg-gray-200" @click="copyToClipboard(props.name, 'File Name')">
        <Copy class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 w-full max-w-4xl bg-white flex items-center justify-center overflow-auto rounded-md">
      <div
        class="transform transition-transform duration-200"
        :style="{ transform: `scale(${zoom}) rotate(${rotation}deg)` }"
      >
        <img
          v-if="fileType === 'image'"
          :src="src"
          alt="Document"
          class="max-w-full max-h-[80vh] object-contain"
        />
        <iframe
          v-else-if="fileType === 'pdf'"
          :src="src"
          class="w-full h-[80vh] border-none"
        ></iframe>
        <div v-else class="text-black p-4">Unsupported file type</div>
      </div>
    </div>
  </div>
</template>
