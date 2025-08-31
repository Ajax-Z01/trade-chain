<script setup lang="ts">
import { ref } from 'vue'
import { keccak256 } from 'viem'
import { useRegistry } from '~/composables/useRegistry'
import { useWallet } from '~/composables/useWallets'

const { walletClient, account } = useWallet()
const { mintDocument, getTokenIdByHash, minting, addMinter, removeMinter } = useRegistry()

const selectedFile = ref<File | null>(null)
const tokenId = ref<bigint | null>(null)
const error = ref<string | null>(null)

const minterAddress = ref('') // untuk input minter baru

const onFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  selectedFile.value = files?.[0] ?? null
}

const verifyAndMint = async () => {
  if (!selectedFile.value) return
  error.value = null

  try {
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const existingId = await getTokenIdByHash(fileHash)
    if (existingId && existingId !== 0n) {
      tokenId.value = existingId
      return
    }

    const tokenURI = `data:application/json;base64,${btoa(
      JSON.stringify({ name: selectedFile.value.name, hash: fileHash })
    )}`

    if (!account.value) {
      error.value = 'Wallet not connected'
      return
    }

    const receipt = await mintDocument(account.value as `0x${string}`, fileHash, tokenURI)
    if (!receipt.status) throw new Error('Transaction failed')

    // --- Ambil tokenId dari event DocumentVerified yang sesuai
    const signatureHash = keccak256(new TextEncoder().encode('DocumentVerified(address,uint256,string)'))
    const event = receipt.logs.find((l: any) => l.topics[0] === signatureHash)
    if (!event || !event.data) throw new Error('DocumentVerified event not found')

    tokenId.value = BigInt('0x' + event.data.slice(-64))
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Minting failed'
  }
}

// --- Tambah minter ---
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

// --- Hapus minter ---
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
</template>
