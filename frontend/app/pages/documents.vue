<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useDocuments } from '~/composables/useDocuments'
import { useStorage } from '~/composables/useStorage'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useContractActions } from '~/composables/useContractActions'
import type { Document as DocType } from '~/types/Document'

// Lucide icons
import { Loader2, FileUp } from 'lucide-vue-next'

// Composables
const { account } = useWallet()
const { attachDocument, getDocumentsByContract } = useDocuments()
const { mintDocument, minting, addMinter, removeMinter } = useRegistryDocument()
const { uploadToLocal } = useStorage()
const { deployedContracts, fetchContractDetails, fetchDeployedContracts } = useContractActions()

// State
const currentContract = ref<string | null>(null)   // gabungan contractAddress & selectedContract
const isImporter = ref(false)
const isExporter = ref(false)
const userRole = computed<'importer'|'exporter'|null>(() => {
  if (!account.value || !currentContract.value) return null
  if (isImporter.value) return 'importer'
  if (isExporter.value) return 'exporter'
  return null
})

const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')
const selectedFiles = ref<File[]>([])
const fileProgresses = ref<{ file: File, progress: number, status: string, tokenId?: bigint }[]>([])
const documents = ref<DocType[]>([])
const loadingDocs = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// --- Minter management
const minterAddress = ref<string>('')
const mintingMinter = ref(false)
const minterFeedback = ref<string | null>(null)

// --- Helpers
const getContractRoles = async (contract: string) => {
  try {
    const data = await fetchContractDetails(contract as `0x${string}`)
    const deployLog = data.history?.find((h: any) => h.action === 'deploy')
    return {
      importer: deployLog?.extra?.importer || '',
      exporter: deployLog?.extra?.exporter || ''
    }
  } catch {
    return { importer: '', exporter: '' }
  }
}

// Fetch contracts on wallet connect
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

// --- Watch contract & account to fetch roles & documents
watch([currentContract, account], async ([contract, acc]) => {
  if (!contract || !acc) {
    documents.value = []
    isImporter.value = false
    isExporter.value = false
    return
  }

  documents.value = []

  // fetch roles
  const roles = await getContractRoles(contract)
  isImporter.value = acc === roles.importer
  isExporter.value = acc === roles.exporter

  // fetch documents
  try {
    loadingDocs.value = true
    documents.value = await getDocumentsByContract(contract)
  } finally {
    loadingDocs.value = false
  }
}, { immediate: true })

// --- File handling
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

// --- Attach & Mint Multi-File
const handleAttachAndMint = async () => {
  if (!selectedFiles.value.length || !currentContract.value || !account.value) {
    error.value = 'Please select files, connect wallet, and choose contract'
    return
  }
  
  if (!userRole.value) {
    error.value = 'You are not authorized to attach or mint documents for this contract'
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
      })

      documents.value.push(doc)
      fp.progress = 100
      fp.status = 'success'
      fp.tokenId = tokenId
    } catch (err) {
      console.error(err)
      fp.progress = 100
      fp.status = 'error'
    }
  }

  success.value = 'All files processed!'
  selectedFiles.value = []
}

// --- Add / Remove Minter
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
    <!-- Header -->
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
      <FileUp class="w-6 h-6" /> Attach & Mint Document
    </h2>

    <!-- Contract Selection & Doc Type -->
    <div class="space-y-3">
      <!-- Role Highlight -->
      <div v-if="userRole" class="flex items-center gap-2 mb-3">
        <span class="text-sm font-semibold">Your Role:</span>
        <span
          v-if="userRole==='importer'"
          class="px-2 py-1 rounded-full text-white text-xs bg-green-600"
        >
          Importer
        </span>
        <span
          v-else-if="userRole==='exporter'"
          class="px-2 py-1 rounded-full text-white text-xs bg-blue-600"
        >
          Exporter
        </span>
      </div>
      <div v-else class="text-sm text-gray-500 mb-3">You have no role in the selected contract</div>

      <label class="block text-sm font-medium text-gray-700">Select Contract</label>
      <select
        v-model="currentContract"
        class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
      >
        <option disabled value="">-- Select a contract --</option>
        <option v-for="addr in deployedContracts" :key="addr" :value="addr">{{ addr }}</option>
      </select>

      <label class="block text-sm font-medium text-gray-700">Document Type</label>
      <select
        v-model="docType"
        class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
      >
        <option value="Invoice">Invoice</option>
        <option value="B/L">B/L</option>
        <option value="COO">COO</option>
        <option value="PackingList">PackingList</option>
        <option value="Other">Other</option>
      </select>

      <!-- Upload Files -->
      <label class="block text-sm font-medium text-gray-700">Upload Files</label>
      <input
        type="file"
        multiple
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:ring focus:ring-blue-200"
        @change="onFilesChange"
      />
    </div>

    <!-- File Progress -->
    <div v-for="(fp, i) in fileProgresses" :key="fp.file.name" class="space-y-1">
      <div class="flex justify-between items-center text-sm">
        <span>{{ fp.file.name }}</span>
        <div class="flex items-center gap-2">
          <span v-if="fp.status==='success'" class="text-green-600">✅ Token ID: {{ fp.tokenId }}</span>
          <span v-else-if="fp.status==='error'" class="text-red-600">❌ Failed</span>
          <span v-else class="text-gray-500">{{ fp.status }}</span>
          <button @click="removeFile(i)" class="text-red-500 hover:text-red-700">✕</button>
        </div>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          :style="{ width: fp.progress + '%' }"
          :class="fp.status==='error' ? 'bg-red-500' : 'bg-blue-600'"
          class="h-2 rounded-full transition-all"
        ></div>
      </div>
    </div>

    <!-- Attach & Mint Button -->
    <button
      class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      :disabled="!selectedFiles.length || minting || !userRole"
      @click="handleAttachAndMint"
    >
      <Loader2 v-if="minting" class="w-4 h-4 animate-spin" />
      <FileUp v-else class="w-4 h-4" />
      {{ minting ? 'Minting...' : 'Attach & Mint Documents' }}
    </button>

    <!-- Feedback -->
    <div v-if="success" class="mt-4 p-3 flex items-center gap-2 border rounded bg-green-50 text-green-700">
      <CheckCircle2 class="w-5 h-5" /> {{ success }}
    </div>
    <div v-if="error" class="mt-4 p-3 flex items-center gap-2 border rounded bg-red-50 text-red-700">
      <XCircle class="w-5 h-5" /> {{ error }}
    </div>

    <!-- Attached Documents -->
    <div class="mt-6">
      <h3 class="font-semibold text-gray-800 mb-2">Attached Documents</h3>
      <div v-if="loadingDocs" class="text-gray-500 text-sm">Loading documents...</div>
      <ul v-else-if="documents.length" class="space-y-2">
        <li
          v-for="doc in documents"
          :key="doc.tokenId"
          class="p-3 border rounded-lg bg-gray-50 flex items-center gap-4"
        >
          <div class="w-16 h-16 flex items-center justify-center border rounded bg-white overflow-hidden">
            <img v-if="doc.uri.match(/\.(png|jpg|jpeg|webp)$/i)" :src="doc.uri" alt="preview" class="object-cover w-full h-full" />
            <embed v-else-if="doc.uri.endsWith('.pdf')" :src="doc.uri" type="application/pdf" class="w-full h-full" />
            <FileUp v-else class="w-6 h-6 text-gray-400" />
          </div>
          <div class="flex-1">
            <p class="font-medium">{{ doc.name }}</p>
            <p class="text-xs text-gray-500">{{ doc.docType }}</p>
          </div>
          <a :href="doc.uri" target="_blank" class="text-blue-600 underline">View</a>
        </li>
      </ul>
      <div v-else class="text-gray-500 text-sm">No documents attached yet.</div>
    </div>

    <!-- Minter Management -->
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
