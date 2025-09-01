<script setup lang="ts">
import { ref } from 'vue'
import { useRegistry } from '~/composables/useRegistry'
import { useWallet } from '~/composables/useWallets'

const { walletClient, account } = useWallet()
const { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter, isMinter, quickCheckNFT } = useRegistry()

const selectedFile = ref<File | null>(null)
const tokenId = ref<bigint | null>(null)
const error = ref<string | null>(null)
const minterAddress = ref('')

const onFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  selectedFile.value = files?.[0] ?? null
}

const nftInfo = ref<{ owner: string; metadata: any } | null>(null)

const checkNFT = async () => {
  console.log('Token ID to check:', tokenId.value)
  if (!tokenId.value) return

  const info = await quickCheckNFT(tokenId.value)
  console.log('NFT info returned:', info)
  if (info) {
    let metadata: any = info.metadata

    if (typeof metadata === 'string' && metadata.startsWith('data:application/json;base64,')) {
      const base64 = metadata.split(',')[1] ?? ''  // pastikan tidak undefined
      if (base64) {
        const jsonStr = atob(base64)
        metadata = JSON.parse(jsonStr)
      } else {
        console.warn('TokenURI base64 part is empty')
        metadata = {}
      }
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

  if (!account.value || !walletClient.value) {
    error.value = 'Wallet not connected'
    return
  }

  // --- 0. Cek apakah wallet terdaftar sebagai minter
  const minterStatus = await isMinter(account.value as `0x${string}`)
  if (!minterStatus) {
    error.value = 'Wallet is not authorized as minter'
    return
  }

  try {
    // --- 1. Hitung hash file
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // --- 2. Cek tokenId sudah ada
    const existingId = await getTokenIdByHash(fileHash)
    if (existingId && existingId !== 0n) {
      tokenId.value = existingId
      error.value = `Document already minted! Token ID: ${existingId}`
      return
    }

    // --- 3. Mint NFT
    const { receipt, tokenId: mintedId } = await mintDocument(account.value as `0x${string}`, selectedFile.value)
    tokenId.value = mintedId

  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Minting failed'
  }
}

// --- Add / Remove Minter
const handleAddMinter = async () => {
  if (!minterAddress.value) return
  try {
    await addMinter(minterAddress.value as `0x${string}`)
    error.value = `✅ Minter added: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    error.value = err.message || 'Add minter failed'
  }
}

const handleRemoveMinter = async () => {
  if (!minterAddress.value) return
  try {
    await removeMinter(minterAddress.value as `0x${string}`)
    error.value = `✅ Minter removed: ${minterAddress.value}`
    minterAddress.value = ''
  } catch (err: any) {
    error.value = err.message || 'Remove minter failed'
  }
}
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">Document Verification & Minting</h2>

    <!-- Upload & Mint -->
    <input type="file" @change="onFileChange" />
    <button
      class="bg-blue-500 text-white px-4 py-2 mt-2"
      :disabled="!selectedFile || minting"
      @click="verifyAndMint"
    >
      {{ minting ? 'Minting...' : 'Verify & Mint' }}
    </button>

    <!-- Add/Remove Minter -->
    <div class="mt-6 border-t pt-4">
      <h3 class="font-semibold mb-2">Manage Minters</h3>
      <input
        v-model="minterAddress"
        type="text"
        placeholder="Minter address"
        class="border px-2 py-1 w-full mb-2"
      />
      <div class="flex gap-2">
        <button class="bg-green-500 text-white px-4 py-1" @click="handleAddMinter">
          Add Minter
        </button>
        <button class="bg-red-500 text-white px-4 py-1" @click="handleRemoveMinter">
          Remove Minter
        </button>
      </div>
    </div>

    <!-- Feedback -->
    <div v-if="tokenId" class="mt-4 p-2 border rounded bg-green-50">
      ✅ Document verified! Token ID: {{ tokenId.toString() }}
    </div>
    <div v-if="error" class="mt-4 p-2 border rounded bg-red-50 text-red-700">
      ❌ {{ error }}
    </div>
  </div>
  
  <!-- Tambahkan di bawah feedback -->
<div class="mt-4 border-t pt-4">
  <h3 class="font-semibold mb-2">Quick Check NFT</h3>
  <button
    class="bg-purple-500 text-white px-4 py-1 mb-2"
    :disabled="!tokenId"
    @click="checkNFT"
  >
    Check NFT
  </button>

  <!-- Tampilkan hasil check -->
  <div v-if="tokenId && nftInfo" class="mt-2 p-2 border rounded bg-blue-50 text-blue-700">
    <p><strong>Owner:</strong> {{ nftInfo.owner }}</p>
    <p><strong>Name:</strong> {{ nftInfo.metadata.name }}</p>
    <p><strong>Description:</strong> {{ nftInfo.metadata.description }}</p>
    <img :src="nftInfo.metadata.image" alt="NFT image" class="mt-2 w-32 h-32 object-contain" />
  </div>
</div>
</template>
