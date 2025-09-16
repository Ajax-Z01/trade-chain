<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { useAggregatedActivity } from '~/composables/useAggregatedActivity'
import { useToast } from '~/composables/useToast'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { CheckCircle, ArrowRight, PlusCircle, Trash2, AlertCircle } from 'lucide-vue-next'

// --- Composables ---
const { activities, fetchActivities, addTag, removeTag } = useAggregatedActivity()
const { addToast } = useToast()

// --- Filters ---
const accountFilter = ref('')
const txHashFilter = ref('')
const contractFilter = ref('')
const tagsFilter = ref('')

// --- Tag management ---
const newTags = reactive<Record<string, string>>({})

// --- Pagination / Infinite scroll ---
const loading = ref(false)
const hasMore = ref(true)
const lastTimestamp = ref<number | null>(null)
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

// --- Load next page ---
const loadNextPage = async () => {
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
      lastTimestamp.value
    )

    if (res.data.length < pageSize) hasMore.value = false
    if (res.data.length) {
      lastTimestamp.value = res.data[res.data.length - 1]?.timestamp || null
      activities.value.push(...res.data)
    }
  } finally {
    loading.value = false
  }
}

// --- Apply filters ---
const applyFilters = async () => {
  lastTimestamp.value = null
  hasMore.value = true
  activities.value = []
  await loadNextPage()
}

// --- Toggle JSON expand ---
const toggleExpand = (id: string) => {
  expanded[id] = !expanded[id]
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
      <button @click="applyFilters" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">Apply</button>
    </div>

    <!-- Timeline -->
    <client-only>
      <DynamicScroller
        :items="activities"
        class="timeline-list"
        :minItemSize="140"
        key-field="id"
        @update="(visibleItems: any[]) => {
          const lastVisible = visibleItems[visibleItems.length - 1]
          if (lastVisible && lastVisible === activities[activities.length - 1]) loadNextPage()
        }"
      >
        <template #default="{ item, index }">
          <DynamicScrollerItem :item="item" :key="item.id" :active="true">
            <div class="mb-4">

              <!-- Date header -->
              <div
                v-if="index === 0 || new Date(item.timestamp).toDateString() !== new Date(activities[index-1]!.timestamp).toDateString()"
                class="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded mb-2 sticky top-0 z-10"
              >
                {{ new Date(item.timestamp).toLocaleDateString() }}
              </div>

              <!-- Activity card -->
              <div class="flex flex-col md:flex-row justify-between border rounded-lg shadow-sm p-4 mb-3 hover:bg-gray-50 transition gap-4 w-full break-words">

                <!-- Left: Action + Timestamp + Icon -->
                <div class="md:w-1/4 flex flex-col md:flex-row md:items-center md:gap-2">
                  <component :is="actionIconMap[item.action] || CheckCircle" class="w-5 h-5 text-blue-500" />
                  <div class="font-medium text-gray-800 text-base truncate">{{ item.action }}</div>
                  <div class="text-gray-500 text-xs md:text-sm mt-1 md:mt-0 truncate">{{ new Date(item.timestamp).toLocaleString() }}</div>
                </div>

                <!-- Center: Details -->
                <div class="md:w-1/2 flex flex-col md:flex-row md:gap-6 text-sm text-gray-700 break-words">
                  <div class="truncate"><span class="font-semibold">Account:</span> {{ item.account }}</div>
                  <div class="truncate"><span class="font-semibold">TxHash:</span> {{ item.txHash }}</div>
                  <div class="truncate"><span class="font-semibold">Contract:</span> {{ item.contractAddress }}</div>
                </div>

                <!-- Right: Tags + Expand JSON -->
                <div class="md:w-1/4 flex flex-col gap-2 min-w-[120px]">
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in item.tags"
                      :key="tag"
                      class="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      {{ tag }}
                      <button @click="removeTag(item.id, tag)" class="ml-1 text-red-500">&times;</button>
                    </span>
                  </div>
                  <div class="flex gap-2 mt-1">
                    <input v-model="newTags[item.id]" placeholder="Tag" class="border border-gray-300 px-2 py-1 rounded text-xs flex-1 focus:ring-1 focus:ring-green-400 focus:outline-none" />
                    <button
                      @click="addTag(item.id, newTags[item.id] as string)"
                      class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition"
                    >
                      Add
                    </button>
                  </div>
                  <button @click="toggleExpand(item.id)" class="text-blue-500 text-xs mt-1 hover:underline">
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
