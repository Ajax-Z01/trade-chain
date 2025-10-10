<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWallet } from '~/composables/useWallets'
import { useDocuments } from '~/composables/useDocuments'
import { useStorage } from '~/composables/useStorage'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useContractRole } from '~/composables/useContractRole'
import { useDashboard } from '~/composables/useDashboard'
import { useToast } from '~/composables/useToast'
import type { Document as DocType } from '~/types/Document'

// Components
import DocumentTypeSelector from '~/components/document/DocumentTypeSelector.vue'
import FileUploadList from '~/components/document/FileUploadList.vue'
import AttachedDocumentsGrid from '~/components/document/AttachedDocumentsGrid.vue'
import DocumentViewer from '~/components/document/DocumentViewer.vue'

// Icons
import { FileUp } from 'lucide-vue-next'

// --- Composables ---
const { addToast } = useToast()
const { account } = useWallet()
const { attachDocument, getDocumentsByContract } = useDocuments()
const { mintDocument, minting } = useRegistryDocument()
const { uploadToLocal } = useStorage()
const { wallets, fetchDashboard } = useDashboard()

// --- Route & Contract ---
const route = useRoute()
const contractAddress = route.params.contract as string
const currentContract = ref<string>(contractAddress)

// --- Role ---
const { 
  userRole, 
  isImporter, 
  isExporter, 
  loadingMintersDoc, 
  fetchApprovedMintersDoc, 
  approvedMintersDoc 
} = useContractRole(currentContract)

// --- Document State ---
const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')
const selectedFiles = ref<File[]>([])
const fileProgresses = ref<{ file: File, progress: number, status: string, tokenId?: number }[]>([])
const documents = ref<DocType[]>([])
const loadingDocs = ref(false)
const showViewer = ref(false)
const selectedDocSrc = ref<string | null>(null)
const selectedDoc = ref<DocType | null>(null)

// --- Approved Minter Handling ---
const mintersLoaded = ref(false)
const fetchMinters = async () => {
  if (!currentContract.value || !account.value) return
  loadingMintersDoc.value = true
  try {
    await fetchApprovedMintersDoc([account.value] as `0x${string}`[])
    mintersLoaded.value = true
  } catch (err: any) {
    addToast(err.message || 'Failed to fetch approved minters', 'error')
  } finally {
    loadingMintersDoc.value = false
  }
}

const userIsMinter = computed(() => {
  return mintersLoaded.value && account.value
    ? approvedMintersDoc.value.includes(account.value)
    : false
})

// --- Methods ---
const openViewer = (doc: DocType) => {
  selectedDoc.value = doc
  selectedDocSrc.value = doc.uri
  showViewer.value = true
}

// --- Fetch Documents ---
const fetchDocuments = async () => {
  if (!currentContract.value) return
  loadingDocs.value = true
  try {
    documents.value = await getDocumentsByContract(currentContract.value)
  } catch (err: any) {
    addToast(err.message || 'Failed to fetch documents', 'error')
  } finally {
    loadingDocs.value = false
  }
}

// --- On Mounted ---
onMounted(async () => {
  await fetchDashboard()
  await fetchDocuments()
  await fetchMinters()
})

// --- Watchers ---
watch([currentContract, account], async ([contract, acc]) => {
  if (!contract || !acc) {
    documents.value = []
    mintersLoaded.value = false
    return
  }
  await fetchDocuments()
  await fetchMinters()
})

watch(wallets, async (w) => {
  if (w.length > 0) {
    await fetchMinters()
  }
})

// --- File Handling ---
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

// --- Attach & Mint ---
const handleAttachAndMint = async () => {
  if (!selectedFiles.value.length || !currentContract.value || !account.value) {
    addToast('Select files, connect wallet, and choose a contract', 'error')
    return
  }
  if (!userRole.value) {
    addToast('You are not authorized for this contract', 'error')
    return
  }

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const fp = fileProgresses.value[i]
    if (!fp) continue
    try {
      fp.status = 'minting'
      fp.progress = 10

      const { tokenId, metadataUrl, fileHash } = await mintDocument(account.value as `0x${string}`, fp.file, docType.value)
      fp.progress = 50
      fp.status = 'uploading'

      const uploadedUrl = await uploadToLocal(fp.file, account.value)
      fp.progress = 75
      fp.status = 'attaching'

      const doc = await attachDocument(currentContract.value, {
        tokenId: Number(tokenId),
        owner: account.value,
        fileHash,
        uri: uploadedUrl,
        docType: docType.value,
        linkedContracts: [currentContract.value],
        createdAt: Date.now(),
        signer: account.value,
        name: fp.file.name,
        description: `Attached & minted document ${fp.file.name}`,
        metadataUrl
      }, account.value)

      documents.value.push(doc)
      fp.progress = 100
      fp.status = 'success'
      fp.tokenId = Number(tokenId)
    } catch (err: any) {
      console.error(err)
      fp.progress = 100
      fp.status = 'error'
      addToast(`Failed to mint ${fp.file.name}`, 'error')
    }
  }

  selectedFiles.value = []
  addToast('All files processed!', 'success')
}

const canAttachAndMint = computed(() => {
  return currentContract.value && account.value && (isImporter.value || isExporter.value)
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-900">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Attach & Mint Document
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
