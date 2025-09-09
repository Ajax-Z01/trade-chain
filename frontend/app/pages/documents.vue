<script setup lang="ts">
import { ref } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useDocuments } from '~/composables/useDocuments'
import type { Document as DocType } from '~/types/Document'
import { useStorage } from '~/composables/useStorage'

// Lucide icons
import { Loader2, CheckCircle2, XCircle, FileUp, Search } from 'lucide-vue-next'

const { account } = useWallet()
const { attachDocument, getDocumentsByContract } = useDocuments()
const { mintDocument, minting, addMinter, removeMinter, isMinter } = useRegistryDocument()
const { uploadToLocal } = useStorage()

const minterAddress = ref<string>('')
const mintingMinter = ref(false)
const minterFeedback = ref<string | null>(null)

const selectedFiles = ref<File[]>([])
const contractAddress = ref('')
const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')

const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loadingDocs = ref(false)

const documents = ref<DocType[]>([])

// --- Per-file progress tracking
interface FileProgress {
  file: File
  progress: number // 0-100%
  status: 'pending' | 'minting' | 'uploading' | 'attaching' | 'success' | 'error'
  tokenId?: bigint
}
const fileProgresses = ref<FileProgress[]>([])

// --- Multi-file selection
const onFilesChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  selectedFiles.value = files ? Array.from(files) : []
  fileProgresses.value = selectedFiles.value.map(f => ({ file: f, progress: 0, status: 'pending' }))
}

// --- Fetch documents for contract
const fetchDocuments = async () => {
  if (!contractAddress.value) return
  loadingDocs.value = true
  try {
    documents.value = await getDocumentsByContract(contractAddress.value)
  } finally {
    loadingDocs.value = false
  }
}

// --- Attach & Mint Multi-File with progress
const handleAttachAndMint = async () => {
  if (!selectedFiles.value.length || !contractAddress.value || !account.value) {
    error.value = 'Please select files, enter contract address, and connect wallet'
    return
  }
  error.value = null
  success.value = null

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const fp = fileProgresses.value[i]
    if (!fp) continue
    try {
      fp.status = 'minting'
      fp.progress = 10

      const { tokenId, metadataUrl, fileHash } = await mintDocument(account.value as `0x${string}`, fp.file, docType.value)
      fp.progress = 50
      fp.status = 'uploading'

      const uploadedUrl = await uploadToLocal(fp.file)
      fp.progress = 75
      fp.status = 'attaching'

      const doc = await attachDocument(contractAddress.value, {
        tokenId: Number(tokenId),
        owner: account.value,
        fileHash,
        uri: uploadedUrl,
        docType: docType.value,
        linkedContracts: [contractAddress.value],
        createdAt: Date.now(),
        signer: account.value,
        name: fp.file.name,
        description: `Attached & minted document ${fp.file.name}`,
        metadataUrl,
      })

      documents.value.push(doc)
      fp.progress = 100
      fp.status = 'success'
      fp.tokenId = tokenId
    } catch (err) {
      console.error(`File ${fp.file.name} failed:`, err)
      fp.progress = 100
      fp.status = 'error'
    }
  }

  success.value = 'All files processed!'
  selectedFiles.value = []
}

const handleAddMinter = async () => {
  if (!minterAddress.value) return
  mintingMinter.value = true
  minterFeedback.value = null
  try {
    await addMinter(minterAddress.value as `0x${string}`)
    minterFeedback.value = `Added minter: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    console.error(err)
    minterFeedback.value = err.message || 'Add minter failed'
  } finally {
    mintingMinter.value = false
  }
}

const handleRemoveMinter = async () => {
  if (!minterAddress.value) return
  mintingMinter.value = true
  minterFeedback.value = null
  try {
    await removeMinter(minterAddress.value as `0x${string}`)
    minterFeedback.value = `Removed minter: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    console.error(err)
    minterFeedback.value = err.message || 'Remove minter failed'
  } finally {
    mintingMinter.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-lg mx-auto space-y-6 bg-white rounded-xl shadow-lg">
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
      <FileUp class="w-6 h-6" /> Attach & Mint Document
    </h2>

    <!-- Upload & Attach -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">Contract Address</label>
      <input v-model="contractAddress" type="text" placeholder="0x..." class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200" />

      <label class="block text-sm font-medium text-gray-700">Document Type</label>
      <select v-model="docType" class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200">
        <option value="Invoice">Invoice</option>
        <option value="B/L">B/L</option>
        <option value="COO">COO</option>
        <option value="PackingList">PackingList</option>
        <option value="Other">Other</option>
      </select>

      <!-- Upload Files -->
      <label class="block text-sm font-medium text-gray-700">Upload Files</label>
      <input type="file" multiple class="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:ring focus:ring-blue-200" @change="onFilesChange" />

      <!-- File progress -->
      <div v-if="fileProgresses.length" class="space-y-2 mt-2">
        <div v-for="fp in fileProgresses" :key="fp.file.name" class="space-y-1">
          <div class="flex justify-between text-sm">
            <span>{{ fp.file.name }}</span>
            <span v-if="fp.status==='success'" class="text-green-600">✅ Token ID: {{ fp.tokenId }}</span>
            <span v-else-if="fp.status==='error'" class="text-red-600">❌ Failed</span>
            <span v-else class="text-gray-500">{{ fp.status }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div :style="{ width: fp.progress + '%' }" :class="fp.status==='error' ? 'bg-red-500' : 'bg-blue-600'" class="h-2 rounded-full transition-all"></div>
          </div>
        </div>
      </div>

      <button class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50" :disabled="!selectedFiles.length || minting" @click="handleAttachAndMint">
        <Loader2 v-if="minting" class="w-4 h-4 animate-spin" />
        <FileUp v-else class="w-4 h-4" />
        {{ minting ? 'Minting...' : 'Attach & Mint Documents' }}
      </button>
    </div>

    <!-- Feedback -->
    <div v-if="success" class="mt-4 p-3 flex items-center gap-2 border rounded bg-green-50 text-green-700">
      <CheckCircle2 class="w-5 h-5" /> {{ success }}
    </div>
    <div v-if="error" class="mt-4 p-3 flex items-center gap-2 border rounded bg-red-50 text-red-700">
      <XCircle class="w-5 h-5" /> {{ error }}
    </div>

    <!-- Document List -->
    <div class="border-t pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 flex items-center gap-2">
        <Search class="w-5 h-5" /> Attached Documents
      </h3>
      <div v-if="loadingDocs" class="text-sm text-gray-500">Loading documents...</div>
      <div v-else-if="!documents.length" class="text-sm text-gray-500">No documents attached yet.</div>
      <ul v-else class="space-y-2">
        <li v-for="doc in documents" :key="doc.tokenId" class="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
          <div>
            <p class="font-medium">{{ doc.name }}</p>
            <p class="text-xs text-gray-500">{{ doc.docType }}</p>
          </div>
          <a :href="doc.uri" target="_blank" class="text-blue-600 underline">View</a>
        </li>
      </ul>
    </div>
    
    <!-- Add this below Document List section -->
    <div class="border-t pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 flex items-center gap-2">
        <FileUp class="w-5 h-5" /> Manage Approved Minters
      </h3>

      <div class="flex gap-2">
        <input
          v-model="minterAddress"
          type="text"
          placeholder="0x..."
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
        />
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          :disabled="!minterAddress || mintingMinter"
          @click="handleAddMinter"
        >
          Add
        </button>
        <button
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          :disabled="!minterAddress || mintingMinter"
          @click="handleRemoveMinter"
        >
          Remove
        </button>
      </div>

      <div v-if="minterFeedback" class="text-sm mt-2 text-gray-700">{{ minterFeedback }}</div>
    </div>
  </div>
</template>
