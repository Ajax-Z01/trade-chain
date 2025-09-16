import { ref, reactive } from 'vue'
import { useNuxtApp } from '#app'

export function useAggregatedActivity() {
  // --- Types ---
  interface ActivityItem {
    id: string
    timestamp: number
    type: string
    action: string
    account: string
    txHash?: string
    contractAddress?: string
    tags: string[]
    extra?: Record<string, any>
    onChainInfo?: Record<string, any>
  }

  interface FetchActivitiesResult {
    data: ActivityItem[]
    nextStartAfterTimestamp: number | null
  }

  // --- State ---
  const activities = ref<ActivityItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const lastTimestamp = ref<number | null>(null)

  const filters = reactive({
    account: null as string | null,
    txHash: null as string | null,
    contractAddress: null as string | null,
    tags: [] as string[],
    limit: 20,
  })

  const { $apiBase } = useNuxtApp()

  type AggregatedFilters = {
    account: string | null
    txHash: string | null
    contractAddress: string | null
    tags: string[]
    offset: number
    limit: number
  }

  // --- Fetch aggregated activities ---
  const fetchActivities = async (
    customFilters?: Partial<AggregatedFilters>,
    startAfterTimestamp?: number | null
  ): Promise<FetchActivitiesResult> => {
    loading.value = true
    if (!startAfterTimestamp) activities.value = []
    error.value = null

    try {
      const combinedFilters = { ...filters, ...customFilters }

      const queryParams: Record<string, string> = {}
      Object.entries(combinedFilters).forEach(([k, v]) => {
        if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) return
        queryParams[k] = Array.isArray(v) ? v.join(',') : String(v)
      })

      if (startAfterTimestamp) queryParams['startAfterTimestamp'] = String(startAfterTimestamp)

      const query = new URLSearchParams(queryParams).toString()
      const res = await fetch(`${$apiBase}/aggregated?${query}`)
      if (!res.ok) throw new Error(await res.text())

      const data: FetchActivitiesResult = await res.json()

      if (startAfterTimestamp) {
        activities.value.push(...data.data)
      } else {
        activities.value = data.data
      }

      lastTimestamp.value = data.nextStartAfterTimestamp
      totalCount.value = activities.value.length
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching aggregated activities:', err)
      return { data: [], nextStartAfterTimestamp: null }
    } finally {
      loading.value = false
    }
  }

  // --- Fetch single activity by ID ---
  const fetchActivityById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/aggregated/${id}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return { ...data, tags: data.tags || [] }
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching activity by ID:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // --- Add tag ---
  const addTag = async (id: string, tag: string) => {
    if (!tag) return
    try {
      const res = await fetch(`${$apiBase}/aggregated/${id}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      if (!res.ok) throw new Error(await res.text())

      const activity = activities.value.find(a => a.id === id)
      if (activity) {
        activity.tags = activity.tags || []
        if (!activity.tags.includes(tag)) activity.tags.push(tag)
      }
    } catch (err: any) {
      console.error('Failed to add tag:', err)
      throw err
    }
  }

  // --- Remove tag ---
  const removeTag = async (id: string, tag: string) => {
    if (!tag) return
    try {
      const res = await fetch(`${$apiBase}/aggregated/${id}/tag?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())

      const activity = activities.value.find(a => a.id === id)
      if (activity && activity.tags) {
        activity.tags = activity.tags.filter((t: string) => t !== tag)
      }
    } catch (err: any) {
      console.error('Failed to remove tag:', err)
      throw err
    }
  }

  // --- Reset filters ---
  const resetFilters = () => {
    filters.account = null
    filters.txHash = null
    filters.contractAddress = null
    filters.tags = []
    filters.limit = 20
  }

  return {
    activities,
    totalCount,
    lastTimestamp,
    loading,
    error,
    filters,
    fetchActivities,
    fetchActivityById,
    addTag,
    removeTag,
    resetFilters,
  }
}
