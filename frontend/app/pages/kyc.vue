<script setup lang="ts">
import { ref } from 'vue'
import { useRegistry } from '~/composables/useRegistryKYC'
import { useWallet } from '~/composables/useWallets'
import { createNft } from '~/composables/useNfts'
import { useStorage } from '~/composables/useStorage'

// Lucide icons
import { Loader2, CheckCircle2, XCircle, Plus, Minus, FileUp, Search, Users } from 'lucide-vue-next'

const { walletClient, account } = useWallet()
const { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, isMinter, quickCheckNFT } = useRegistry()
const { uploadToLocal } = useStorage()

const selectedFile = ref<File | null>(null)
const tokenId = ref<bigint | null>(null)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const minterAddress = ref('')
const addingMinter = ref(false)
const removingMinter = ref(false)

const nftInfo = ref<{ owner: string; metadata: any } | null>(null)

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

    nftInfo.value = {
      owner: info.owner as string,
      metadata
    }
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

  // --- 0. Check minter role
  const minterStatus = await isMinter(account.value as `0x${string}`)
  if (!minterStatus) {
    error.value = 'Wallet is not authorized as minter'
    return
  }

  try {
    // --- 1. Hash file
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // --- 2. Check existing token
    const existingId = await getTokenIdByHash(fileHash)
    if (existingId && existingId !== 0n) {
      tokenId.value = existingId
      error.value = `Document already minted! Token ID: ${existingId}`
      return
    }

    // --- 3. Upload file to IPFS
    const metadataUrl = await uploadToLocal(
      selectedFile.value,
      account.value
    )

    // --- 4. Mint NFT di smart contract
    const { tokenId: mintedId } = await mintDocument(account.value as `0x${string}`, selectedFile.value)
    tokenId.value = mintedId

    // --- 5. Simpan ke backend
    await createNft({
      tokenId: mintedId.toString(),
      owner: account.value,
      fileHash,
      metadataUrl,
      name: selectedFile.value.name,
      description: `Verified document ${selectedFile.value.name}`,
      createdAt: Date.now(),
    })

    success.value = `Document minted and saved! Token ID: ${mintedId}`

  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Minting failed'
  }
}

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
  <div class="p-6 max-w-lg mx-auto space-y-6 bg-white rounded-xl shadow-lg">

    <!-- Header -->
    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
      <FileUp class="w-6 h-6" /> Document Verification & Minting
    </h2>

    <!-- Upload & Mint -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">Upload Document</label>
      <input
        type="file"
        class="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:ring focus:ring-blue-200"
        @change="onFileChange"
      />

      <!-- File Preview -->
      <div v-if="selectedFile" class="flex items-center gap-3 mt-2 p-2 border rounded bg-gray-50">
        <span class="text-gray-700">{{ selectedFile.name }}</span>
        <span class="text-xs text-gray-500">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
      </div>

      <!-- Attach / Mint Button -->
      <button
        class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        :disabled="!selectedFile || minting"
        @click="verifyAndMint"
      >
        <Loader2 v-if="minting" class="w-4 h-4 animate-spin" />
        <FileUp v-else class="w-4 h-4" />
        {{ minting ? 'Minting...' : 'Verify & Mint' }}
      </button>

      <!-- Progress bar -->
      <div v-if="minting" class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
        <div class="h-2 bg-blue-600 animate-pulse w-2/5"></div>
      </div>
    </div>

    <!-- Feedback -->
    <div v-if="success" class="mt-2 p-3 flex items-center gap-2 border rounded bg-green-50 text-green-700">
      <CheckCircle2 class="w-5 h-5" /> {{ success }}
    </div>
    <div v-if="error" class="mt-2 p-3 flex items-center gap-2 border rounded bg-red-50 text-red-700">
      <XCircle class="w-5 h-5" /> {{ error }}
    </div>

    <!-- Manage Minters -->
    <div class="space-y-3 border-t pt-4">
      <h3 class="font-semibold text-gray-800 flex items-center gap-2">
        <Users class="w-5 h-5" /> Manage Minters
      </h3>
      <input
        v-model="minterAddress"
        type="text"
        placeholder="Enter minter address"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
      />
      <div class="flex gap-2">
        <button
          class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          :disabled="addingMinter"
          @click="handleAddMinter"
        >
          <Loader2 v-if="addingMinter" class="w-4 h-4 animate-spin" />
          <Plus v-else class="w-4 h-4" /> Add
        </button>
        <button
          class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          :disabled="removingMinter"
          @click="handleRemoveMinter"
        >
          <Loader2 v-if="removingMinter" class="w-4 h-4 animate-spin" />
          <Minus v-else class="w-4 h-4" /> Remove
        </button>
      </div>
    </div>

    <!-- Quick Check NFT -->
    <div class="border-t pt-4 space-y-3">
      <h3 class="font-semibold text-gray-800 flex items-center gap-2">
        <Search class="w-5 h-5" /> Quick Check NFT
      </h3>
      <div class="flex gap-2">
        <input
          type="number"
          v-model="tokenId"
          placeholder="Enter token ID"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-200"
        />
        <button
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          :disabled="!tokenId"
          @click="checkNFT"
        >
          <Search class="w-4 h-4" /> Check
        </button>
      </div>

      <!-- NFT Info -->
      <div v-if="nftInfo" class="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 space-y-2 mt-2">
        <p><strong>Owner:</strong> {{ nftInfo.owner }}</p>
        <p><strong>Name:</strong> {{ nftInfo.metadata.name }}</p>
        <p><strong>Description:</strong> {{ nftInfo.metadata.description }}</p>
        <img
          v-if="nftInfo.metadata.image"
          :src="nftInfo.metadata.image"
          alt="NFT image"
          class="mt-2 w-32 h-32 object-contain rounded border"
        />
      </div>

      <!-- Skeleton / Loading NFT -->
      <div v-else-if="minting" class="animate-pulse h-32 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
</template>
