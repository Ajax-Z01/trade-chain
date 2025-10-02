<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useDocuments } from '~/composables/useDocuments'
import { useStorage } from '~/composables/useStorage'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useContractActions } from '~/composables/useContractActions'
import type { Document as DocType } from '~/types/Document'
import DocumentViewer from '~/components/DocumentViewer.vue'
import { useToast } from '~/composables/useToast'

// Icons
import { Loader2, FileUp } from 'lucide-vue-next'

// Composables
const { addToast } = useToast()
const { account } = useWallet()
const { attachDocument, getDocumentsByContract } = useDocuments()
const { mintDocument, minting, addMinter, removeMinter, reviewDocument, signDocument, revokeDocument, isMinter } = useRegistryDocument()
const { uploadToLocal } = useStorage()
const { deployedContracts, fetchContractDetails, fetchDeployedContracts } = useContractActions()

// --- State ---
const currentContract = ref<string | null>(null)
const isImporter = ref(false)
const isExporter = ref(false)
const userIsMinter = ref(false)
const userRole = computed<'importer'|'exporter'|null>(() => {
  if (!account.value || !currentContract.value) return null
  if (isImporter.value) return 'importer'
  if (isExporter.value) return 'exporter'
  return null
})

const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')
const selectedFiles = ref<File[]>([])
const fileProgresses = ref<{ file: File, progress: number, status: string, tokenId?: number }[]>([])
const documents = ref<DocType[]>([])
const loadingDocs = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// --- Viewer ---
const showViewer = ref(false)
const selectedDocSrc = ref<string | null>(null)
const selectedDoc = ref<DocType | null>(null)
const openViewer = (doc: DocType) => {
  selectedDoc.value = doc
  selectedDocSrc.value = doc.uri
  showViewer.value = true
}

// --- Minter management ---
const minterAddress = ref<string>('')
const mintingMinter = ref(false)
const minterFeedback = ref<string | null>(null)

// --- Helpers ---
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

// Fetch contracts when wallet connected
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

// --- Watch contract & account ---
watch([currentContract, account], async ([contract, acc]) => {
  if (!contract || !acc) {
    documents.value = []
    isImporter.value = false
    isExporter.value = false
    userIsMinter.value = false
    return
  }

  documents.value = []
  loadingDocs.value = true

  try {
    const roles = await getContractRoles(contract)
    isImporter.value = acc === roles.importer
    isExporter.value = acc === roles.exporter
    userIsMinter.value = await isMinter(acc as `0x${string}`) || false

    documents.value = await getDocumentsByContract(contract)
  } catch (err: any) {
    addToast('error', err.message || 'Failed to fetch documents')
  } finally {
    loadingDocs.value = false
  }
}, { immediate: true })

// --- File handling ---
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

  success.value = null
  error.value = null

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const fp = fileProgresses.value[i]
    if (!fp) continue
    try {
      fp.status = 'minting'
      fp.progress = 10

      const { tokenId, metadataUrl, fileHash, txHash } = await mintDocument(account.value as `0x${string}`, fp.file, docType.value)
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
      }, account.value, txHash)

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

// --- Minter actions ---
const handleAddMinter = async () => {
  if (!minterAddress.value) return
  mintingMinter.value = true
  minterFeedback.value = null
  try {
    await addMinter(minterAddress.value as `0x${string}`)
    minterFeedback.value = `Added minter: ${minterAddress.value}`
    minterAddress.value = ''
    addToast('Minter added!', 'success')
  } catch (err: any) {
    console.error(err)
    minterFeedback.value = err.message || 'Add minter failed'
    addToast(`${minterFeedback.value}`, 'error')
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
    addToast('Minter removed!', 'success')
  } catch (err: any) {
    console.error(err)
    minterFeedback.value = err.message || 'Remove minter failed'
    addToast(`${minterFeedback.value}`, 'error')
  } finally {
    mintingMinter.value = false
  }
}

const handleReview = async (doc: DocType) => {
  if (!account.value || !doc.tokenId) return
  try {
    await reviewDocument(BigInt(doc.tokenId))
    doc.status = 'Reviewed'
    addToast(`Document ${doc.name} marked as Reviewed (on-chain)`, 'success')
  } catch (err: any) {
    addToast(err.message || 'Failed to review on-chain', 'error')
  }
}

const handleSign = async (doc: DocType) => {
  if (!account.value || !doc.tokenId) return
  try {
    await signDocument(BigInt(doc.tokenId))
    doc.status = 'Signed'
    addToast(`Document ${doc.name} signed (on-chain)`, 'success')
  } catch (err: any) {
    addToast(err.message || 'Failed to sign on-chain', 'error')
  }
}

const handleRevoke = async (doc: DocType) => {
  if (!account.value || !doc.tokenId) return
  try {
    await revokeDocument(BigInt(doc.tokenId))
    doc.status = 'Revoked'
    addToast(`Document ${doc.name} revoked (on-chain)`, 'success')
  } catch (err: any) {
    addToast(err.message || 'Failed to revoke on-chain', 'error')
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800">
    <!-- Header -->
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Attach & Mint Document
    </h2>

    <!-- Contract Selection & Doc Type -->
    <div class="space-y-3">
      <!-- Role Highlight -->
      <div v-if="userRole || userIsMinter" class="flex flex-wrap items-center gap-2 mb-3">
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Role:</span>

        <span v-if="userRole==='importer'" class="px-2 py-1 rounded-full text-white text-xs bg-green-600">
          Importer
        </span>

        <span v-else-if="userRole==='exporter'" class="px-2 py-1 rounded-full text-white text-xs bg-blue-600">
          Exporter
        </span>

        <span v-if="userIsMinter" class="px-2 py-1 rounded-full text-white text-xs bg-purple-600">
          Approved Minter
        </span>

        <span v-if="account && !userIsMinter" class="px-2 py-1 rounded-full text-white text-xs bg-red-600">
          Unapproved Minter
        </span>
      </div>

      <div v-else class="text-sm text-gray-500 mb-3 dark:text-gray-400">
        You have no role in the selected contract
      </div>

      <!-- Contract Selector -->
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Contract</label>
      <select
        v-model="currentContract"
        class="block w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-blue-400"
      >
        <option disabled value="">-- Select a contract --</option>
        <option v-for="addr in deployedContracts" :key="addr" :value="addr">{{ addr }}</option>
      </select>

      <!-- Document Type Selector -->
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Document Type</label>
      <select
        v-model="docType"
        class="block w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-blue-400"
      >
        <option value="Invoice">Invoice</option>
        <option value="B/L">B/L</option>
        <option value="COO">COO</option>
        <option value="PackingList">PackingList</option>
        <option value="Other">Other</option>
      </select>

      <!-- File Upload -->
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Files</label>
      <input
        type="file"
        multiple
        class="block w-full text-sm text-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-blue-400"
        @change="onFilesChange"
      />
    </div>

    <!-- File Progress -->
    <div v-for="(fp, i) in fileProgresses" :key="fp.file.name" class="space-y-1">
      <div class="flex justify-between items-center text-sm">
        <span class="truncate">{{ fp.file.name }}</span>
        <div class="flex items-center gap-2">
          <span v-if="fp.status==='success'" class="text-green-600">✅ Token ID: {{ fp.tokenId }}</span>
          <span v-else-if="fp.status==='error'" class="text-red-600">❌ Failed</span>
          <span v-else class="text-gray-500">{{ fp.status }}</span>
          <button class="text-red-500 hover:text-red-700" @click="removeFile(i)">✕</button>
        </div>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          :style="{ width: fp.progress + '%' }"
          :class="fp.status==='error' ? 'bg-red-500' : 'bg-blue-600'"
          class="h-2 rounded-full transition-all"
        ></div>
      </div>
    </div>

    <!-- Attach & Mint Button -->
    <button
      class="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      :disabled="!selectedFiles.length || minting || !userRole"
      @click="handleAttachAndMint"
    >
      <Loader2 v-if="minting" class="w-4 h-4 animate-spin" />
      <FileUp v-else class="w-4 h-4" />
      {{ minting ? 'Minting...' : 'Attach & Mint Documents' }}
    </button>

    <!-- Attached Documents -->
    <div class="mt-6">
      <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-lg">Attached Documents</h3>

      <!-- Loading Skeleton -->
      <div v-if="loadingDocs" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        <div v-for="n in 3" :key="n" class="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      <!-- Documents Grid -->
      <div v-else-if="documents.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="doc in documents"
          :key="doc.tokenId"
          class="border rounded-lg p-3 flex flex-col justify-between hover:shadow-md transition bg-white dark:bg-gray-800"
        >
          <!-- Thumbnail / Icon -->
          <div
            class="h-32 w-full mb-2 flex items-center justify-center border rounded bg-gray-50 dark:bg-gray-700 overflow-hidden cursor-pointer"
            @click="openViewer(doc)"
          >
            <img v-if="doc.uri.match(/\.(png|jpg|jpeg|webp)$/i)" :src="doc.uri" class="object-cover w-full h-full" />
            <span v-else class="text-gray-400 text-3xl">📄</span>
          </div>

          <!-- Info -->
          <div class="flex-1 flex flex-col gap-1">
            <p class="font-medium text-gray-800 dark:text-gray-100 truncate" :title="doc.name">{{ doc.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Type: {{ doc.docType }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">TokenID: {{ doc.tokenId }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="doc.fileHash">Hash: {{ doc.fileHash }}</p>
            <!-- Status Badge -->
            <p class="text-xs font-semibold">
              Status:
              <span
                :class="{
                  'px-2 py-1 rounded-full text-white text-xs': true,
                  'bg-gray-400': doc.status==='Draft',
                  'bg-blue-600': doc.status==='Reviewed',
                  'bg-green-600': doc.status==='Signed',
                  'bg-red-600': doc.status==='Revoked'
                }"
              >
                {{ doc.status }}
              </span>
            </p>
          </div>

          <!-- Actions -->
          <div class="mt-2 flex flex-col gap-1">
            <div class="flex gap-2">
              <button
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded-lg"
                @click="openViewer(doc)"
              >
                View
              </button>
              <a
                :href="doc.uri"
                target="_blank"
                class="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs py-1 rounded-lg text-center"
              >
                Download
              </a>
            </div>

            <!-- Lifecycle Buttons -->
            <div class="flex gap-2 mt-1">
              <button
                v-if="doc.status==='Draft'"
                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded-lg"
                @click="handleReview(doc)"
              >
                Review
              </button>
              <button
                v-if="doc.status==='Reviewed'"
                class="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1 rounded-lg"
                @click="handleSign(doc)"
              >
                Sign
              </button>
              <button
                v-if="doc.status!=='Revoked' && doc.status!=='Draft' && doc.status!=='Signed'"
                class="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 rounded-lg"
                @click="handleRevoke(doc)"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
        No documents attached yet.
      </div>

      <!-- Document Viewer Modal -->
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

    <!-- Minter Management -->
    <div class="border-t pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <FileUp class="w-5 h-5" /> Manage Approved Minters
      </h3>
      <div class="flex gap-2 flex-wrap">
        <input
          v-model="minterAddress"
          type="text"
          placeholder="0x..."
          class="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-blue-400"
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
      <div v-if="mintingMinter" class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-2">
        <Loader2 class="w-4 h-4 animate-spin" /> Processing...
      </div>
      <div v-if="minterFeedback" class="text-sm mt-2 text-gray-700 dark:text-gray-300">{{ minterFeedback }}</div>
    </div>
  </div>
</template>
