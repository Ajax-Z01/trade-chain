<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRegistryKYC } from '~/composables/useRegistryKYC'
import { useWallet } from '~/composables/useWallets'
import { useKYC } from '~/composables/useKycs'
import { useStorage } from '~/composables/useStorage'
import { useKycRole } from '~/composables/useKycRole'
import { useDashboard } from '~/composables/useDashboard'

// Lucide icons
import { FileUp } from 'lucide-vue-next'

const { walletClient, account } = useWallet()
const { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, quickCheckNFT, reviewDocument, signDocument, revokeDocument } = useRegistryKYC()
const { uploadToLocal } = useStorage()
const { createKyc } = useKYC()
const { wallets, fetchDashboard } = useDashboard()

const selectedFile = ref<File | null>(null)
const tokenId = ref<bigint | null>(null)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const minterAddress = ref('')
const addingMinter = ref(false)
const removingMinter = ref(false)
const nftInfo = ref<{ owner: string; metadata: any } | null>(null)
const processing = ref(false)

// --- CONTRACT ROLE ---
const {
  isAdmin,
  approvedMintersKYC,
  loadingMintersKYC,
  fetchApprovedMintersKYC,
} = useKycRole()

const fetchAllWalletsAsMinters = async () => {
  if (wallets.value.length === 0) return
  loadingMintersKYC.value = true
  try {
    await fetchApprovedMintersKYC(wallets.value.map((w) => w.address))
  } finally {
    loadingMintersKYC.value = false
  }
}

onMounted(async () => {
  await fetchDashboard()
})

watch(wallets, async (w) => {
  if (w.length > 0) await fetchAllWalletsAsMinters()
}, { immediate: true })

// --- FILE HANDLERS ---
const onFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  selectedFile.value = files?.[0] ?? null
}

const checkNFT = async () => {
  if (!tokenId.value) return
  const info = await quickCheckNFT(tokenId.value)
  if (info) {
    let metadata: any = info.metadata
    if (typeof metadata === 'string' && metadata.startsWith('data:application/json;base64,')) {
      const base64 = metadata.split(',')[1] ?? ''
      metadata = base64 ? JSON.parse(atob(base64)) : {}
    }
    nftInfo.value = { owner: info.owner as string, metadata }
  }
}

// --- MINTING & LIFECYCLE ---
const verifyAndMint = async () => {
  if (!selectedFile.value) return
  error.value = null
  success.value = null

  if (!account.value || !walletClient.value) {
    error.value = 'Wallet not connected'
    return
  }

  const allowed = approvedMintersKYC
  if (!allowed) {
    error.value = 'Wallet not authorized for minting'
    return
  }

  try {
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const existingId = await getTokenIdByHash(fileHash)
    if (existingId && existingId !== 0n) {
      tokenId.value = existingId
      error.value = `Document already minted! Token ID: ${existingId}`
      return
    }

    const metadataUrl = await uploadToLocal(selectedFile.value, account.value)
    const { tokenId: mintedId, txHash } = await mintDocument(account.value as `0x${string}`, selectedFile.value)
    tokenId.value = typeof mintedId === 'string' ? BigInt(mintedId) : mintedId

    await createKyc({
      tokenId: mintedId,
      owner: account.value,
      fileHash,
      metadataUrl,
      name: selectedFile.value.name,
      description: `Verified document ${selectedFile.value.name}`,
      txHash,
      action: 'mintKYC',
      executor: account.value,
      createdAt: Date.now(),
    })

    success.value = `Document minted and saved! Token ID: ${mintedId}`
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Minting failed'
  }
}

// --- LIFECYCLE ACTIONS ---
const handleReview = async () => {
  if (!tokenId.value) return
  processing.value = true
  try {
    await reviewDocument(tokenId.value)
    success.value = `Document reviewed (Token ID: ${tokenId.value})`
  } catch (err: any) {
    error.value = err.message || 'Review failed'
  } finally {
    processing.value = false
  }
}

const handleSign = async () => {
  if (!tokenId.value) return
  processing.value = true
  try {
    await signDocument(tokenId.value)
    success.value = `Document signed (Token ID: ${tokenId.value})`
  } catch (err: any) {
    error.value = err.message || 'Sign failed'
  } finally {
    processing.value = false
  }
}

const handleRevoke = async () => {
  if (!tokenId.value) return
  processing.value = true
  try {
    await revokeDocument(tokenId.value)
    success.value = `Document revoked (Token ID: ${tokenId.value})`
  } catch (err: any) {
    error.value = err.message || 'Revoke failed'
  } finally {
    processing.value = false
  }
}

// --- MINTER ACTIONS ---
const handleAddMinter = async () => {
  if (!minterAddress.value || !isAdmin.value) return
  addingMinter.value = true
  error.value = null
  success.value = null
  try {
    await addMinter(minterAddress.value as `0x${string}`)
    success.value = `Minter added: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    error.value = err.message || 'Add minter failed'
  } finally {
    addingMinter.value = false
  }
}

const handleRemoveMinter = async () => {
  if (!minterAddress.value || !isAdmin.value) return
  removingMinter.value = true
  error.value = null
  success.value = null
  try {
    await removeMinter(minterAddress.value as `0x${string}`)
    success.value = `Minter removed: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    error.value = err.message || 'Remove minter failed'
  } finally {
    removingMinter.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-lg mx-auto space-y-6 bg-white/90 dark:bg-gray-900 backdrop-blur-md rounded-xl shadow-lg">
    <!-- Header -->
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> KYC Document Verification & Minting
    </h2>

    <!-- Wallet Info -->
    <WalletInfo
      :account="account"
      :isAdmin="isAdmin"
      :approvedMintersKYC="approvedMintersKYC"
      :loadingMintersKYC="loadingMintersKYC"
    />
    
    <!-- File Upload & Minting -->
    <FileUploadMint
      :selectedFile="selectedFile"
      :minting="minting"
      :onFileChange="onFileChange"
      :verifyAndMint="verifyAndMint"
    />

    <!-- Manage Minters (only admin) -->
    <MinterManagement
      v-model:minterAddress="minterAddress"
      :addingMinter="addingMinter"
      :removingMinter="removingMinter"
      :approvedMintersKYC="approvedMintersKYC"
      :loadingMintersKYC="loadingMintersKYC"
      :isAdmin="isAdmin"
      @addMinter="handleAddMinter"
      @removeMinter="handleRemoveMinter"
    />

    <!-- Quick Check NFT -->
    <QuickCheckNFT
      :tokenId="tokenId"
      :nftInfo="nftInfo"
      :checkNFT="checkNFT"
      v-model:modelValue="tokenId"
    />
    
    <!-- Lifecycle Actions -->
    <LifecycleActions
      :tokenId="tokenId"
      :processing="processing"
      :handleReview="handleReview"
      :handleSign="handleSign"
      :handleRevoke="handleRevoke"
      :isAdmin="isAdmin"
    />
    
    <!-- Feedback -->
    <FeedbackMessage v-if="success" type="success" :message="success" />
    <FeedbackMessage v-if="error" type="error" :message="error" />
  </div>
</template>
