<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useMockUSDC } from '~/composables/useMockUSDC'
import { useWallet } from '~/composables/useWallets'

const { mint, getBalance, minting } = useMockUSDC()
const { account } = useWallet()

const recipient = ref(account.value || '')
const amount = ref(100) // default 100 USDC
const balance = ref<number | null>(null)
const message = ref('')

// --- Fungsi ambil balance
const fetchBalance = async (addr?: string) => {
  if (!addr) return
  balance.value = await getBalance(addr as `0x${string}`)
}

// --- Watch account, update recipient & balance otomatis
watch(account, (newAccount) => {
  if (newAccount) {
    recipient.value = newAccount
    fetchBalance(newAccount)
  } else {
    recipient.value = ''
    balance.value = null
  }
}, { immediate: true })

const handleMint = async () => {
  if (!recipient.value || !amount.value) return
  message.value = ''
  try {
    const result = await mint(recipient.value as `0x${string}`, amount.value)
    balance.value = result.balance
    message.value = `Minted ${amount.value} USDC! Tx: ${result.receipt.transactionHash}`
  } catch (err: any) {
    message.value = `Mint failed: ${err.message || err}`
  }
}

// --- On mounted, fetch balance untuk account sekarang
onMounted(() => {
  if (account.value) fetchBalance(account.value)
})
</script>

<template>
  <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
    <h1 class="text-2xl font-bold mb-4">USDC Faucet</h1>

    <div class="mb-4">
      <label class="block mb-1 font-semibold">Recipient Address</label>
      <input
        v-model="recipient"
        type="text"
        placeholder="0x..."
        class="w-full border rounded px-3 py-2"
      />
    </div>

    <div class="mb-4">
      <label class="block mb-1 font-semibold">Amount (USDC)</label>
      <input
        v-model="amount"
        type="number"
        min="1"
        class="w-full border rounded px-3 py-2"
      />
    </div>

    <button
      :disabled="minting"
      @click="handleMint"
      class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {{ minting ? 'Minting...' : 'Mint USDC' }}
    </button>

    <div v-if="message" class="mt-4 p-2 bg-gray-100 rounded">
      {{ message }}
    </div>

    <div v-if="balance !== null" class="mt-2 text-gray-700">
      Current Balance: {{ balance }} USDC
    </div>
  </div>
</template>

<style scoped>
input:disabled {
  background-color: #f0f0f0;
}
</style>
