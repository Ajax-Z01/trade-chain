<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'

interface NFTInfo {
  owner: string
  metadata: {
    name: string
    description: string
    image?: string
  }
}

interface Props {
  modelValue: bigint | null
  nftInfo: NFTInfo | null
  checkNFT: () => Promise<void>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: bigint | null): void
}>()

// Local input as string
const localTokenId = ref<string | number>(props.modelValue?.toString() ?? '')

watch(localTokenId, (val) => {
  if (val !== null && String(val).trim() !== '') {
    try {
      emit('update:modelValue', BigInt(val))
    } catch {
      emit('update:modelValue', null)
    }
  } else {
    emit('update:modelValue', null)
  }
})

</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
    <h3 class="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
      <Search class="w-5 h-5" /> Quick Check NFT
    </h3>

    <div class="flex gap-2 flex-wrap">
      <input
        v-model="localTokenId"
        type="number"
        placeholder="Enter token ID"
        class="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
      />
      <button
        class="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        :disabled="!localTokenId || localTokenId.toString() === ''"
        @click="props.checkNFT"
      >
        <Search class="w-4 h-4" /> Check
      </button>
    </div>

    <div
      v-if="props.nftInfo"
      class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50 border text-blue-800 dark:text-blue-300 space-y-2 mt-2"
    >
      <p><strong>Owner:</strong> {{ props.nftInfo.owner }}</p>
      <p><strong>Name:</strong> {{ props.nftInfo.metadata.name }}</p>
      <p><strong>Description:</strong> {{ props.nftInfo.metadata.description }}</p>
      <img
        v-if="props.nftInfo.metadata.image"
        :src="props.nftInfo.metadata.image"
        class="mt-2 w-32 h-32 object-contain rounded border dark:border-gray-600"
      />
    </div>
  </div>
</template>
