<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useDocuments } from '~/composables/useDocuments'
import { useStorage } from '~/composables/useStorage'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useContractActions } from '~/composables/useContractActions'
import { useContractRole } from '~/composables/useContractRole'
import { useDashboard } from '~/composables/useDashboard'
import type { Document as DocType } from '~/types/Document'
import DocumentViewer from '~/components/DocumentViewer.vue'
import { useToast } from '~/composables/useToast'

// Icons
import { FileUp } from 'lucide-vue-next'

// Composables
const { addToast } = useToast()
const { account } = useWallet()
const { attachDocument, getDocumentsByContract } = useDocuments()
const { mintDocument, minting, addMinter, removeMinter, reviewDocument, signDocument, revokeDocument, isMinter } = useRegistryDocument()
const { uploadToLocal } = useStorage()
const { deployedContracts, fetchContractDetails, fetchDeployedContracts } = useContractActions()
const { wallets, fetchDashboard } = useDashboard()

// --- State ---
const currentContract = ref<string | null>(null)
const userIsMinter = ref(false)
const addingMinter = ref(false)
const removingMinter = ref(false)
const minterAddress = ref<string>('')
const { 
  isAdmin, 
  isImporter, 
  isExporter, 
  userRole, 
  loadingMintersDoc, 
  fetchApprovedMintersDoc, 
  approvedMintersDoc ,
  getContractRoles
} = useContractRole(currentContract)

// --- Fetch approved minters ---
const fetchAllWalletsAsMinters = async () => {
  if (wallets.value.length === 0) return
  loadingMintersDoc.value = true
  try {
    await fetchApprovedMintersDoc(wallets.value.map(w => w.address))
  } finally {
    loadingMintersDoc.value = false
  }
}

onMounted(async () => {
  await fetchDashboard()
})

// --- Document state ---
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

// --- Refresh minters ---
const refreshMinters = async () => {
  if (!wallets.value.length) return
  loadingMintersDoc.value = true
  try {
    await fetchApprovedMintersDoc(wallets.value.map(w => w.address))
  } finally {
    loadingMintersDoc.value = false
  }
}

// --- Watchers ---
watch(account, (acc) => { if (acc) fetchDeployedContracts() }, { immediate: true })

watch([currentContract, account], async ([contract, acc]) => {
  if (!contract || !acc) {
    documents.value = []
    userIsMinter.value = false
    return
  }

  documents.value = []
  loadingDocs.value = true

  try {
    userIsMinter.value = await isMinter(acc as `0x${string}`) || false
    documents.value = await getDocumentsByContract(contract)
  } catch (err: any) {
    addToast('error', err.message || 'Failed to fetch documents')
  } finally {
    loadingDocs.value = false
  }
}, { immediate: true })

watch(wallets, async (w) => {
  if (w.length > 0) await fetchAllWalletsAsMinters()
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
  if (!minterAddress.value || !isAdmin.value) return
  addingMinter.value = true
  try {
    await addMinter(minterAddress.value as `0x${string}`)
    minterAddress.value = ''
    await refreshMinters()
  } finally {
    addingMinter.value = false
  }
}

const handleRemoveMinter = async () => {
  if (!minterAddress.value || !isAdmin.value) return
  removingMinter.value = true
  try {
    await removeMinter(minterAddress.value as `0x${string}`)
    minterAddress.value = ''
    await refreshMinters()
  } finally {
    removingMinter.value = false
  }
}

// --- Document lifecycle actions ---
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
  <div class="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-900">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Attach & Mint Document
    </h2>

    <ContractSelectorDocument
      v-model="currentContract"
      :user-role="userRole"
      :user-is-minter="userIsMinter"
      :deployed-contracts="deployedContracts"
    />

    <DocumentTypeSelector v-model="docType" />

    <div v-if="currentContract">
      <FileUploadList
        :files="selectedFiles"
        :file-progresses="fileProgresses"
        @remove="removeFile"
        @change="onFilesChange"
      />

      <div v-if="selectedFiles.length" class="my-4 flex justify-center">
        <button 
          @click="handleAttachAndMint" 
          :disabled="!selectedFiles.length || minting" 
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50"
        >
          {{ minting ? 'Minting...' : 'Attach & Mint Documents' }}
        </button>
      </div>

      <AttachedDocumentsGrid
        :documents="documents"
        @view="openViewer"
        @review="handleReview"
        @sign="handleSign"
        @revoke="handleRevoke"
      />
    </div>

    <DocumentViewer
      v-if="selectedDocSrc"
      v-model="showViewer"
      :src="selectedDocSrc"
      :name="selectedDoc?.name"
      :token-id="selectedDoc?.tokenId"
      :hash="selectedDoc?.fileHash"
      :status="selectedDoc?.status"
    />

    <MinterManagement
      v-model:minterAddress="minterAddress"
      :addingMinter="addingMinter"
      :removingMinter="removingMinter"
      :approvedMintersKYC="approvedMintersDoc"
      :loadingMintersKYC="loadingMintersDoc"
      :isAdmin="isAdmin"
      :onAddMinter="handleAddMinter"
      :onRemoveMinter="handleRemoveMinter"
    />
  </div>
</template>
