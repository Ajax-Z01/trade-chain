<script setup lang="ts">
import { ref } from 'vue'
import { useDocuments } from '~/composables/useDocuments'
import type { Document as DocType } from '~/types/Document'

// Lucide icons
import { Loader2, CheckCircle2, XCircle, Plus, FileUp, Search, Users } from 'lucide-vue-next'

const { attachDocument, getDocumentsByContract } = useDocuments()

const selectedFile = ref<File | null>(null)
const contractAddress = ref('') // isi alamat kontrak trade
const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')

const error = ref<string | null>(null)
const success = ref<string | null>(null)
const attaching = ref(false)

const documents = ref<DocType[]>([])

const onFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  selectedFile.value = files?.[0] ?? null
}

const fetchDocuments = async () => {
  if (!contractAddress.value) return
  documents.value = await getDocumentsByContract(contractAddress.value)
}

const handleAttachDocument = async () => {
  if (!selectedFile.value || !contractAddress.value) return
  error.value = null
  success.value = null
  attaching.value = true

  try {
    // --- 1. Hash file
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // --- 2. Upload & attach document to backend
    const doc = await attachDocument(contractAddress.value, {
      fileHash,
      uri: '', // isi dengan URL file dari cloud storage
      owner: '0x...', // optional, bisa ambil dari wallet
      docType: docType.value,
      linkedContracts: [contractAddress.value],
      createdAt: Date.now(),
      name: selectedFile.value.name,
      description: `Attached document ${selectedFile.value.name}`,
    })

    success.value = `Document attached! Token ID: ${doc.tokenId}`
    documents.value.push(doc)
    selectedFile.value = null
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Attach document failed'
  } finally {
    attaching.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-lg mx-auto space-y-6 bg-white rounded-xl shadow-lg">
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
      <FileUp class="w-6 h-6" /> Attach Document to Contract
    </h2>

    <!-- Upload & Attach -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">Contract Address</label>
      <input
        v-model="contractAddress"
        type="text"
        placeholder="0x..."
        class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
      />

      <label class="block text-sm font-medium text-gray-700">Document Type</label>
      <select v-model="docType" class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200">
        <option value="Invoice">Invoice</option>
        <option value="B/L">B/L</option>
        <option value="COO">COO</option>
        <option value="PackingList">PackingList</option>
        <option value="Other">Other</option>
      </select>

      <label class="block text-sm font-medium text-gray-700">Upload File</label>
      <input
        type="file"
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:ring focus:ring-blue-200"
        @change="onFileChange"
      />

      <button
        class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        :disabled="!selectedFile || attaching"
        @click="handleAttachDocument"
      >
        <Loader2 v-if="attaching" class="w-4 h-4 animate-spin" />
        <FileUp v-else class="w-4 h-4" />
        {{ attaching ? 'Attaching...' : 'Attach Document' }}
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
    <div v-if="documents.length" class="border-t pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 flex items-center gap-2">
        <FileUp class="w-5 h-5" /> Attached Documents
      </h3>
      <ul class="space-y-2">
        <li v-for="doc in documents" :key="doc.tokenId" class="p-2 border rounded bg-gray-50 flex justify-between items-center">
          <span>{{ doc.name }} ({{ doc.docType }})</span>
          <a :href="doc.uri" target="_blank" class="text-blue-600 underline">View</a>
        </li>
      </ul>
    </div>
  </div>
</template>
