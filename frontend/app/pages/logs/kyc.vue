<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useKYC } from '~/composables/useKycs'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-vue-next'

interface KYCWithHistory {
  tokenId: string
  owner: string
  name?: string
  status: string
  createdAt: number
  updatedAt?: number
  history?: {
    action: string
    account: string
    executor: string
    timestamp: number
  }[]
}

const { getAllKycs } = useKYC()
const kycs = ref<KYCWithHistory[]>([])
const loading = ref(true)
const expanded = ref<Record<string, boolean>>({})

const fetchKycs = async () => {
  loading.value = true
  kycs.value = await getAllKycs()
  loading.value = false
}

const toggleHistory = (tokenId: string) => {
  expanded.value[tokenId] = !expanded.value[tokenId]
}

onMounted(fetchKycs)
</script>

<template>
  <section class="p-4 max-w-6xl mx-auto">
    <h2 class="text-2xl font-bold text-teal-600 mb-4">KYC Documents</h2>

    <div v-if="loading" class="flex justify-center py-10">
      <Loader2 class="w-8 h-8 animate-spin text-teal-500" />
    </div>

    <div v-else-if="kycs.length === 0" class="text-gray-400 text-center py-10">
      No KYC documents available.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(kyc, i) in kycs"
        :key="kyc.tokenId"
        class="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
      >
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-teal-700 truncate">{{ kyc.name || 'Unnamed Document' }}</h3>
            <p class="text-gray-500 text-sm mt-1">
              Token ID: <span class="font-mono">{{ kyc.tokenId }}</span> | Owner: {{ kyc.owner }}
            </p>
            <p class="mt-1">
              Status:
              <span
                :class="{
                  'text-green-600 font-semibold': kyc.status === 'Approved',
                  'text-red-600 font-semibold': kyc.status === 'Rejected',
                  'text-gray-500 font-semibold': kyc.status === 'Draft' || kyc.status === 'N/A'
                }"
              >
                {{ kyc.status }}
              </span>
            </p>
          </div>
          <button @click="toggleHistory(kyc.tokenId)" class="p-1 rounded-full hover:bg-gray-100">
            <component :is="expanded[kyc.tokenId] ? ChevronUp : ChevronDown" class="w-5 h-5 text-gray-500"/>
          </button>
        </div>

        <div v-if="expanded[kyc.tokenId]" class="mt-3 border-t pt-2 space-y-2">
          <div v-for="(h, j) in kyc.history" :key="j" class="text-gray-600 text-sm bg-gray-50 p-2 rounded">
            <p><strong>Action:</strong> {{ h.action }}</p>
            <p><strong>Account:</strong> {{ h.account }}</p>
            <p><strong>Executor:</strong> {{ h.executor }}</p>
            <p class="text-gray-400 text-xs">{{ new Date(h.timestamp).toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
