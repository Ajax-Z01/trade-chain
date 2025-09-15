<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAggregatedActivity } from '~/composables/useAggregatedActivity'
import { useToast } from '~/composables/useToast'

// --- Composables ---
const { activities, totalCount, loading, error, filters, fetchActivities, addTag, removeTag } = useAggregatedActivity()
const { addToast } = useToast()

// --- Pagination state ---
const currentPage = ref(1)
const pageSize = computed(() => filters.limit)

// Cache tiap halaman
const pagesCache = reactive<Record<number, any[]>>({})
const lastTimestamps = reactive<Record<number, number | null>>({}) // timestamp terakhir tiap halaman

// --- Jump input state ---
const jumpPageNumber = ref(currentPage.value)

// Fetch halaman tertentu
const fetchPage = async (page: number) => {
  if (page < 1) return

  // Jika halaman sudah ada di cache, pakai cache
  if (pagesCache[page]) {
    activities.value = pagesCache[page]
    currentPage.value = page
    jumpPageNumber.value = page
    return
  }

  // Tentukan startAfterTimestamp
  let startAfter: number | null = null
  if (page > 1) {
    startAfter = lastTimestamps[page - 1] ?? lastTimestamps[page - 2] ?? null
  }

  const prevActivities = [...activities.value]

  try {
    await fetchActivities({}, startAfter)
    if (activities.value.length > 0) {
      pagesCache[page] = [...activities.value]
      lastTimestamps[page] = activities.value[activities.value.length - 1]?.timestamp || null
      currentPage.value = page
      jumpPageNumber.value = page
    } else {
      // rollback jika halaman kosong
      activities.value = prevActivities
    }
  } catch {
    activities.value = prevActivities
  }
}

// --- Next / Prev / Jump ---
const nextPage = async () => {
  await fetchPage(currentPage.value + 1)
}

const prevPage = async () => {
  if (currentPage.value === 1) return
  await fetchPage(currentPage.value - 1)
}

const jumpToPageHandler = async () => {
  if (jumpPageNumber.value < 1) return
  await fetchPage(jumpPageNumber.value)
}

// --- Jump to last page (fetch page terakhir) ---
const jumpToLastPage = async () => {
  let page = currentPage.value
  while (activities.value.length === pageSize.value) {
    page++
    await fetchPage(page)
  }
}

// --- Filters ---
const accountFilter = ref(filters.account || '')
const txHashFilter = ref(filters.txHash || '')
const contractFilter = ref(filters.contractAddress || '')
const tagsFilter = ref('')

const applyFilters = async () => {
  filters.account = accountFilter.value || null
  filters.txHash = txHashFilter.value || null
  filters.contractAddress = contractFilter.value || null
  filters.tags = tagsFilter.value
    ? tagsFilter.value.split(',').map(t => t.trim())
    : []

  // Reset pagination cache
  currentPage.value = 1
  Object.keys(pagesCache).forEach(k => delete pagesCache[Number(k)])
  Object.keys(lastTimestamps).forEach(k => delete lastTimestamps[Number(k)])
  jumpPageNumber.value = 1

  await fetchPage(1)
}

// --- Tag management ---
const newTags = reactive<Record<string, string>>({})

const onAddTag = async (id: string, tag: string) => {
  if (!tag) return
  try {
    await addTag(id, tag)
    addToast(`Tag "${tag}" added`, 'success')
    newTags[id] = ''
  } catch {
    addToast('Failed to add tag', 'error')
  }
}

const onRemoveTag = async (id: string, tag: string) => {
  try {
    await removeTag(id, tag)
    addToast(`Tag "${tag}" removed`, 'info')
  } catch {
    addToast('Failed to remove tag', 'error')
  }
}

// --- Initial fetch ---
onMounted(async () => {
  await fetchPage(1)
})
</script>

<template>
  <div class="p-4 max-w-[95vw] mx-auto">
    <h1 class="text-2xl font-bold mb-6">Aggregated Activity Logs</h1>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap gap-3 items-end">
      <input v-model="accountFilter" placeholder="Account" class="border px-3 py-2 rounded w-full md:w-auto" />
      <input v-model="txHashFilter" placeholder="TxHash" class="border px-3 py-2 rounded w-full md:w-auto" />
      <input v-model="contractFilter" placeholder="Contract Address" class="border px-3 py-2 rounded w-full md:w-auto" />
      <input v-model="tagsFilter" placeholder="Tags (comma separated)" class="border px-3 py-2 rounded w-full md:w-auto" />
      <button @click="applyFilters" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">Apply</button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto border rounded shadow-sm">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Account</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">TxHash</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Contract</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Action</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Tags</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Timestamp</th>
            <th class="px-3 py-2 text-left text-sm font-medium text-gray-700">Manage Tags</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="loading">
            <td colspan="7" class="text-center py-6 text-gray-500">
              <span class="animate-pulse">Loading activities...</span>
            </td>
          </tr>

          <tr v-for="act in activities" :key="act.id" class="hover:bg-gray-50 transition">
            <td class="px-3 py-2 text-sm font-medium text-gray-800">{{ act.account }}</td>
            <td class="px-3 py-2 text-sm text-gray-700 break-all">{{ act.txHash }}</td>
            <td class="px-3 py-2 text-sm text-gray-700 break-all">{{ act.contractAddress }}</td>
            <td class="px-3 py-2 text-sm text-gray-700">{{ act.action }}</td>
            <td class="px-3 py-2 text-sm">
              <span v-for="tag in act.tags" :key="tag" class="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 mr-1 text-xs font-medium">
                {{ tag }}
                <button @click="onRemoveTag(act.id, tag)" class="ml-1 text-red-500 hover:text-red-700">&times;</button>
              </span>
            </td>
            <td class="px-3 py-2 text-sm text-gray-500">{{ new Date(act.timestamp).toLocaleString() }}</td>
            <td class="px-3 py-2 flex gap-1">
              <input v-model="newTags[act.id]" placeholder="Tag" class="border px-2 py-1 rounded text-xs w-16" />
              <button @click="onAddTag(act.id, newTags[act.id] as string)" class="bg-green-500 text-white px-2 rounded text-xs hover:bg-green-600 transition">Add</button>
            </td>
          </tr>

          <tr v-if="!loading && activities.length === 0">
            <td colspan="7" class="text-center py-6 text-gray-400">
              No activities found
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="mt-4 flex flex-wrap justify-center items-center gap-3">
      <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition">Prev</button>

      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Page</span>
        <input type="number" min="1" v-model.number="jumpPageNumber" @keydown.enter="jumpToPageHandler" class="w-16 px-2 py-1 border rounded text-sm" />
        <button @click="jumpToPageHandler" class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition">Go</button>
        <button @click="jumpToLastPage" class="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition">Last</button>
      </div>

      <span class="text-sm font-medium">Current: {{ currentPage }}</span>

      <button @click="nextPage" :disabled="activities.length < pageSize" class="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition">Next</button>
    </div>
  </div>
</template>
