<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted, watch } from 'vue'
import { useDocumentDashboard } from '~/composables/useDocumentDashboard'

// Components
import DocumentTypeSelector from '~/components/document/DocumentTypeSelector.vue'
import FileUploadList from '~/components/document/FileUploadList.vue'
import AttachedDocumentsGrid from '~/components/document/AttachedDocumentsGrid.vue'
import DocumentViewer from '~/components/document/DocumentViewer.vue'

// Icons
import { FileUp } from 'lucide-vue-next'

// --- Setup ---
const route = useRoute()
const contractAddress = route.params.contract as string

// --- Composable Dashboard ---
const {
  currentContract,
  documents,
  selectedFiles,
  fileProgresses,
  docType,
  userRole,
  userIsMinter,
  loadingDocs,
  minting,
  openViewer,
  selectedDoc,
  selectedDocSrc,
  showViewer,
  handleAttachAndMint,
  canAttachAndMint,
  fetchDocuments,
  fetchApprovedMinters
} = useDocumentDashboard(contractAddress)

// --- Lifecycle ---
onMounted(async () => {
  await fetchApprovedMinters()
  await fetchDocuments()
})

// Watch contract changes (optional if user navigates programmatically)
watch(() => route.params.contract, async (newVal) => {
  if (newVal) {
    currentContract.value = newVal as string
    await fetchApprovedMinters()
    await fetchDocuments()
  }
})

// --- File handling (from composable state) ---
const onFilesChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  Array.from(files).forEach(f => {
    if (!selectedFiles.value.some(sf => sf.name === f.name && sf.size === f.size)) {
      selectedFiles.value.push(f)
      fileProgresses.value.push({ file: f, progress: 0, status: 'pending' })
    }
  })
  ;(e.target as HTMLInputElement).value = ''
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  fileProgresses.value.splice(index, 1)
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-900">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Document Dashboard
    </h2>

    <!-- Role & Contract info -->
    <div class="space-y-2 mb-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Role:</span>
        <span v-if="userRole==='importer'" class="px-2 py-1 rounded-full text-white text-xs bg-green-600">Importer</span>
        <span v-else-if="userRole==='exporter'" class="px-2 py-1 rounded-full text-white text-xs bg-blue-600">Exporter</span>
        <span v-else-if="userRole==='admin'" class="px-2 py-1 rounded-full text-white text-xs bg-indigo-600">Admin</span>
        <span v-if="userIsMinter" class="px-2 py-1 rounded-full text-white text-xs bg-purple-600">Approved Minter</span>
        <span v-if="!userIsMinter" class="px-2 py-1 rounded-full text-white text-xs bg-purple-600">Unapproved Minter</span>
        <span v-if="!userRole && !userIsMinter" class="text-sm text-gray-500 dark:text-gray-400">No role assigned</span>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <span class="font-semibold">Contract:</span> {{ currentContract }}
      </div>
    </div>

    <!-- Document Type -->
    <DocumentTypeSelector v-model="docType" />

    <!-- File Upload & Attach/Mint -->
    <div v-if="canAttachAndMint">
      <FileUploadList
        :files="selectedFiles"
        :file-progresses="fileProgresses"
        @remove="removeFile"
        @change="onFilesChange"
      />

      <div v-if="selectedFiles.length" class="my-4 flex justify-center">
        <button 
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50"
          :disabled="!selectedFiles.length || minting || !canAttachAndMint"
          @click="handleAttachAndMint"
        >
          {{ minting ? 'Minting...' : 'Attach & Mint Documents' }}
        </button>
      </div>
    </div>

    <!-- Documents Grid -->
    <AttachedDocumentsGrid
      :documents="documents"
      :loading="loadingDocs"
      @view="openViewer"
    />

    <!-- Viewer -->
    <DocumentViewer
      v-if="selectedDocSrc"
      v-model="showViewer"
      :src="selectedDocSrc"
      :name="selectedDoc?.name"
      :token-id="selectedDoc?.tokenId"
      :hash="selectedDoc?.fileHash"
      :status="selectedDoc?.status"
    />
  </div>
</template>
