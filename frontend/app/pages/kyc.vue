<script setup lang="ts">
import { ref } from 'vue'
import { useRegistryKYC } from '~/composables/useRegistryKYC'
import { useWallet } from '~/composables/useWallets'
import { useKYC } from '~/composables/useKycs'
import { useStorage } from '~/composables/useStorage'

// Lucide icons
import { Loader2, CheckCircle2, XCircle, Plus, Minus, FileUp, Search, Users, PenLine, Signature, Ban } from 'lucide-vue-next'

const { walletClient, account } = useWallet()
const { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, isMinter, quickCheckNFT, reviewDocument, signDocument, revokeDocument } = useRegistryKYC()
const { uploadToLocal } = useStorage()
const { createKyc } = useKYC()

const selectedFile = ref<File | null>(null)
const tokenId = ref<bigint | null>(null)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const minterAddress = ref('')
const addingMinter = ref(false)
const removingMinter = ref(false)
const nftInfo = ref<{ owner: string; metadata: any } | null>(null)
const processing = ref(false)

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

const verifyAndMint = async () => {
  if (!selectedFile.value) return
  error.value = null
  success.value = null

  if (!account.value || !walletClient.value) {
    error.value = 'Wallet not connected'
    return
  }

  const minterStatus = await isMinter(account.value as `0x${string}`)
  if (!minterStatus) {
    error.value = 'Wallet is not authorized as minter'
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

// --- Lifecycle Actions ---
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

// --- Minter Management ---
const handleAddMinter = async () => {
  if (!minterAddress.value) return
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
  if (!minterAddress.value) return
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
  <div class="p-6 max-w-lg mx-auto space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-lg">
    <!-- Header -->
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <FileUp class="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> KYC Document Verification & Minting
    </h2>

    <!-- Upload & Mint -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Document</label>
      <input
        type="file"
        class="block w-full text-sm border rounded-lg cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
        @change="onFileChange"
      />
      <div v-if="selectedFile" class="flex items-center justify-between mt-2 p-2 border rounded bg-gray-50 dark:bg-gray-700/50">
        <span class="text-gray-700 dark:text-gray-200 truncate">{{ selectedFile.name }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-300">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
      </div>
      <button
        class="w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        :disabled="!selectedFile || minting"
        @click="verifyAndMint"
      >
        <Loader2 v-if="minting" class="w-4 h-4 animate-spin" />
        <FileUp v-else class="w-4 h-4" />
        {{ minting ? 'Minting...' : 'Verify & Mint' }}
      </button>
    </div>

    <!-- Lifecycle Actions -->
    <div v-if="tokenId" class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 class="font-semibold text-gray-800 dark:text-gray-100">Lifecycle Actions</h3>
      <div class="flex flex-wrap gap-2">
        <button
          class="flex-1 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="processing" @click="handleReview"
        >
          <Loader2 v-if="processing" class="w-4 h-4 animate-spin" />
          <PenLine v-else class="w-4 h-4" /> Review
        </button>
        <button
          class="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="processing" @click="handleSign"
        >
          <Loader2 v-if="processing" class="w-4 h-4 animate-spin" />
          <Signature v-else class="w-4 h-4" /> Sign
        </button>
        <button
          class="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="processing" @click="handleRevoke"
        >
          <Loader2 v-if="processing" class="w-4 h-4 animate-spin" />
          <Ban v-else class="w-4 h-4" /> Revoke
        </button>
      </div>
    </div>

    <!-- Feedback -->
    <div v-if="success" class="mt-2 p-3 flex items-center gap-2 border rounded-lg bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300">
      <CheckCircle2 class="w-5 h-5" /> {{ success }}
    </div>
    <div v-if="error" class="mt-2 p-3 flex items-center gap-2 border rounded-lg bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300">
      <XCircle class="w-5 h-5" /> {{ error }}
    </div>

    <!-- Manage Minters -->
    <div class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Users class="w-5 h-5" /> Manage Minters</h3>
      <input
        v-model="minterAddress"
        type="text"
        placeholder="Enter minter address"
        class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
      />
      <div class="flex gap-2 flex-wrap">
        <button
          class="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="addingMinter" @click="handleAddMinter"
        >
          <Loader2 v-if="addingMinter" class="w-4 h-4 animate-spin" />
          <Plus v-else class="w-4 h-4" /> Add
        </button>
        <button
          class="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="removingMinter" @click="handleRemoveMinter"
        >
          <Loader2 v-if="removingMinter" class="w-4 h-4 animate-spin" />
          <Minus v-else class="w-4 h-4" /> Remove
        </button>
      </div>
    </div>

    <!-- Quick Check NFT -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Search class="w-5 h-5" /> Quick Check NFT</h3>
      <div class="flex gap-2 flex-wrap">
        <input v-model="tokenId" type="number" placeholder="Enter token ID"
          class="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
        <button
          class="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :disabled="!tokenId" @click="checkNFT"
        >
          <Search class="w-4 h-4" /> Check
        </button>
      </div>
      <div v-if="nftInfo" class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50 border text-blue-800 dark:text-blue-300 space-y-2 mt-2">
        <p><strong>Owner:</strong> {{ nftInfo.owner }}</p>
        <p><strong>Name:</strong> {{ nftInfo.metadata.name }}</p>
        <p><strong>Description:</strong> {{ nftInfo.metadata.description }}</p>
        <img v-if="nftInfo.metadata.image" :src="nftInfo.metadata.image" class="mt-2 w-32 h-32 object-contain rounded border dark:border-gray-600" />
      </div>
    </div>
  </div>
</template>
