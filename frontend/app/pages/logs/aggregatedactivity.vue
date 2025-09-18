<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAggregatedActivity } from '~/composables/useAggregatedActivity'
import { useToast } from '~/composables/useToast'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { CheckCircle, ArrowRight, PlusCircle, Trash2, AlertCircle } from 'lucide-vue-next'

// --- Composables ---
const {
  activities,
  loading,
  lastTimestamp,
  fetchActivities,
  addTag,
  removeTag
} = useAggregatedActivity()
const { addToast } = useToast()

// --- Filters ---
const accountFilter = ref('')
const txHashFilter = ref('')
const contractFilter = ref('')
const tagsFilter = ref('')

// --- Tag management ---
const newTags = reactive<Record<string, string>>({})

// --- Pagination / Infinite scroll ---
const hasMore = ref(true)
const pageSize = 20

// --- Expanded JSON tracker ---
const expanded = reactive<Record<string, boolean>>({})

// --- Map action to icon ---
const actionIconMap: Record<string, any> = {
  transfer: ArrowRight,
  mint: PlusCircle,
  burn: Trash2,
  approve: CheckCircle,
  error: AlertCircle,
}

// --- Scroller ref ---
const scroller = ref<any>(null)

// --- Load next page ---
const loadNextPage = async (isFilterReset = false) => {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const res = await fetchActivities(
      {
        account: accountFilter.value || null,
        txHash: txHashFilter.value || null,
        contractAddress: contractFilter.value || null,
        tags: tagsFilter.value ? tagsFilter.value.split(',').map(t => t.trim()) : [],
        limit: pageSize,
      },
      isFilterReset ? null : lastTimestamp.value
    )

    if (isFilterReset) {
      // Filter baru → replace list
      activities.value = res.data
    } else {
      // Infinite scroll → append
      activities.value.push(...res.data)
    }

    lastTimestamp.value = res.nextStartAfterTimestamp
    if (!res.nextStartAfterTimestamp || res.data.length < pageSize) hasMore.value = false
  } catch (err: any) {
    addToast('error', err.message || 'Unknown error')
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// --- Apply filters ---
const applyFilters = async () => {
  // Reset pagination & list
  hasMore.value = true
  lastTimestamp.value = null
  activities.value = []

  // Load first page dengan filter baru
  await loadNextPage(true)
}

// --- Scroll handler for infinite scroll ---
const onScroll = () => {
  if (!scroller.value) return
  const el = scroller.value.$el as HTMLElement
  const scrollBottom = el.scrollTop + el.clientHeight
  const threshold = el.scrollHeight - 50
  if (scrollBottom >= threshold) loadNextPage()
}

// --- Toggle JSON expand ---
const toggleExpand = (id: string) => {
  expanded[id] = !expanded[id]
}

const handleAddTag = async (id: string, tag: string) => {
  if (!tag) return
  try {
    await addTag(id, tag)
    newTags[id] = ''
    addToast(`Tag "${tag}" added!`, 'success')
  } catch (err: any) {
    addToast(err.message || 'Failed to add tag', 'error')
  }
}

const handleRemoveTag = async (id: string, tag: string) => {
  try {
    await removeTag(id, tag)
    addToast(`Tag "${tag}" removed!`, 'success')
  } catch (err: any) {
    addToast(err.message || 'Failed to remove tag', 'error')
  }
}

// --- Initial fetch ---
onMounted(() => loadNextPage())
</script>

<template>
  <div class="p-4 max-w-[95vw] mx-auto">
    <h1 class="text-2xl font-bold mb-6 text-gray-900">Aggregated Activity Logs</h1>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap gap-3 items-end">
      <input v-model="accountFilter" placeholder="Account" class="border border-gray-300 px-3 py-2 rounded w-full md:w-auto focus:ring-1 focus:ring-blue-500 focus:outline-none" />
      <input v-model="txHashFilter" placeholder="TxHash" class="border border-gray-300 px-3 py-2 rounded w-full md:w-auto focus:ring-1 focus:ring-blue-500 focus:outline-none" />
      <input v-model="contractFilter" placeholder="Contract Address" class="border border-gray-300 px-3 py-2 rounded w-full md:w-auto focus:ring-1 focus:ring-blue-500 focus:outline-none" />
      <input v-model="tagsFilter" placeholder="Tags (comma separated)" class="border border-gray-300 px-3 py-2 rounded w-full md:w-auto focus:ring-1 focus:ring-blue-500 focus:outline-none" />
      <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition" @click="applyFilters">Apply</button>
    </div>

    <!-- Timeline -->
    <client-only>
      <DynamicScroller
        ref="scroller"
        :items="activities"
        class="timeline-list"
        :min-item-size="140"
        key-field="id"
        @scroll="onScroll"
      >
        <template #default="{ item, index }">
          <DynamicScrollerItem :key="item.id" :item="item" :active="true">
            <div class="mb-4">

              <!-- Date header -->
              <div
                v-if="index === 0 || new Date(item.timestamp).toDateString() !== new Date(activities[index-1]?.timestamp ?? 0).toDateString()"
                class="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded mb-2 sticky top-0 z-10"
              >
                {{ new Date(item.timestamp).toLocaleDateString() }}
              </div>

              <!-- Activity card (grid layout) -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg shadow-sm p-4 mb-3 hover:bg-gray-50 transition break-words">

                <!-- Left: Action + Timestamp + Icon -->
                <div class="flex items-center gap-2">
                  <component :is="actionIconMap[item.action] || CheckCircle" class="w-5 h-5 text-blue-500" />
                  <div class="flex flex-col">
                    <div class="font-medium text-gray-800 text-base truncate">{{ item.action }}</div>
                    <div class="text-gray-500 text-xs md:text-sm mt-1 truncate">{{ new Date(item.timestamp).toLocaleString() }}</div>
                  </div>
                </div>

                <!-- Center: Details -->
                <div class="flex flex-col gap-2 text-sm text-gray-700 break-words">
                  <div><span class="font-semibold">Account:</span> {{ item.account || '-' }}</div>
                  <div><span class="font-semibold">TxHash:</span> {{ item.txHash || '-' }}</div>
                  <div><span class="font-semibold">Contract:</span> {{ item.contractAddress || '-' }}</div>
                </div>

                <!-- Right: Tags + Expand JSON -->
                <div class="flex flex-col gap-2 min-w-[140px]">
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in item.tags"
                      :key="tag"
                      class="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      {{ tag }}
                      <button class="ml-1 text-red-500" @click="handleRemoveTag(item.id, tag)">&times;</button>
                    </span>
                  </div>
                  <div class="flex gap-2 mt-1">
                    <input v-model="newTags[item.id]" placeholder="Tag" class="border border-gray-300 px-2 py-1 rounded text-xs flex-1 focus:ring-1 focus:ring-green-400 focus:outline-none" />
                    <button
                      class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition"
                      @click="handleAddTag(item.id, newTags[item.id] as string)"
                    >
                      Add
                    </button>
                  </div>
                  <button class="text-blue-500 text-xs mt-1 hover:underline" @click="toggleExpand(item.id)">
                    {{ expanded[item.id] ? 'Hide JSON' : 'Show JSON' }}
                  </button>
                  <pre v-if="expanded[item.id]" class="bg-gray-50 p-2 mt-1 overflow-x-auto text-xs rounded">
{{ JSON.stringify(item, null, 2) }}
                  </pre>
                </div>

              </div>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>

      <div v-if="loading" class="text-center text-gray-500 mt-2">Loading more...</div>
      <div v-if="!hasMore && activities.length" class="text-center text-gray-400 mt-2">No more activities</div>
      <div v-if="!activities.length && !loading" class="text-center text-gray-400 mt-2">No activities found</div>
    </client-only>
  </div>
</template>

<style scoped>
.timeline-list {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
