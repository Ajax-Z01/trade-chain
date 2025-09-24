import { reactive, readonly } from 'vue'
import { useRuntimeConfig } from '#app'
import type { ActivityLog, ActivityState } from '~/types/Activity'

export function useActivityLogs() {
  const config = useRuntimeConfig()
  const activityStates = reactive<Record<string, ActivityState>>({})

  /** Ambil atau buat state untuk account */
  const getActivityState = (account: string) => {
    if (!activityStates[account]) {
      activityStates[account] = {
        logs: [],
        loading: false,
        finished: false,
        lastTimestamp: undefined,
      }
    }
    return activityStates[account]
  }

  /** Fetch logs dari backend dengan pagination */
  const fetchActivityLogs = async (
    account: string,
    options?: { limit?: number; txHash?: string }
  ) => {
    const state = getActivityState(account)
    if (state.loading || state.finished) return

    state.loading = true
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (state.lastTimestamp) params.append('startAfterTimestamp', state.lastTimestamp.toString())
      if (options?.txHash) params.append('txHash', options.txHash)

      const res = await fetch(`${config.public.apiBase}/activity/${account}?${params.toString()}`)
      const json = await res.json()
      const data: ActivityLog[] = Array.isArray(json.data) ? json.data : []

      if (data.length < (options?.limit || 20)) state.finished = true

      state.logs.push(...data)
      if (data.length > 0) state.lastTimestamp = data[data.length - 1]?.timestamp ?? state.lastTimestamp
    } catch (err) {
      console.error(`Failed to fetch activity logs for ${account}:`, err)
    } finally {
      state.loading = false
    }
  }

  /** Tambah log baru langsung ke backend & update state frontend */
  const addActivityLog = async (
    account: string,
    log: Omit<ActivityLog, 'timestamp' | 'account'> & { tags?: string[] }
  ): Promise<ActivityLog> => {
    try {
      // Serialize BigInt to string
      const safePayload = JSON.parse(JSON.stringify({ ...log, account }, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      console.log('Adding activity log:', safePayload)
      const res = await fetch(`${config.public.apiBase}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload),
      })
      const data: ActivityLog = await res.json()

      // update state frontend
      getActivityState(account).logs.unshift(data)
      return data
    } catch (err) {
      console.error('Failed to add activity log:', err)
      throw err
    }
  }

  /** Reset & fetch ulang logs untuk account tertentu */
  const refreshActivityLogs = (account: string) => {
    const state = getActivityState(account)
    state.logs = []
    state.lastTimestamp = undefined
    state.finished = false
    fetchActivityLogs(account)
  }

  /** Ambil logs readonly */
  const getLogs = (account: string) => readonly(getActivityState(account).logs)

  return {
    activityStates,
    getActivityState,
    getLogs,
    fetchActivityLogs,
    addActivityLog,
    refreshActivityLogs,
  }
}
