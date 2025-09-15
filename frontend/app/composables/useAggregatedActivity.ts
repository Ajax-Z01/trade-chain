import { ref, reactive } from 'vue'
import { useNuxtApp } from '#app'

export function useAggregatedActivity() {
  // --- State ---
  const activities = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)

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
    limit: number
  }

  // --- Fetch aggregated activities ---
  const fetchActivities = async (
    customFilters?: Partial<AggregatedFilters>,
    startAfterTimestamp?: number | null // pagination helper
  ) => {
    loading.value = true
    if (!startAfterTimestamp) activities.value = [] // reset hanya saat fetch pertama
    error.value = null

    try {
      const combinedFilters = { ...filters, ...customFilters }

      // Convert to string query params
      const queryParams: Record<string, string> = {}
      Object.entries(combinedFilters).forEach(([k, v]) => {
        if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) return
        queryParams[k] = Array.isArray(v) ? v.join(',') : String(v)
      })

      if (startAfterTimestamp) queryParams['startAfterTimestamp'] = String(startAfterTimestamp)

      const query = new URLSearchParams(queryParams).toString()
      const res = await fetch(`${$apiBase}/aggregated?${query}`)
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      console.log('Fetched aggregated activities:', data)

      // Append data saat pagination
      if (startAfterTimestamp) {
        activities.value.push(...(Array.isArray(data) ? data : []))
      } else {
        activities.value = Array.isArray(data) ? data : []
      }

      totalCount.value = activities.value.length
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching aggregated activities:', err)
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
    try {
      const res = await fetch(`${$apiBase}/aggregated/${id}/tag`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
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
