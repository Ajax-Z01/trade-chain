import { ref, reactive } from 'vue'
import { useRuntimeConfig } from '#app'
import type { ActivityState, ActivityLog } from '~/types/Activity'

export function useActivityLogs() {
  const config = useRuntimeConfig()
  const activityStates = reactive<Record<string, ActivityState>>({})

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
      const data: ActivityLog[] = await res.json()

      if (data.length < (options?.limit || 20)) {
        state.finished = true
      }

      state.logs.push(...data)
      if (data.length > 0) {
        params.append('startAfterTimestamp', (state.lastTimestamp ?? 0).toString())
      }
    } catch (err) {
      console.error(`Failed to fetch activity logs for ${account}:`, err)
    } finally {
      state.loading = false
    }
  }

  /** Tambah log baru langsung ke backend & state frontend */
  const addActivityLog = async (account: string, log: Omit<ActivityLog, 'timestamp'>) => {
    try {
      const payload = { ...log, timestamp: Date.now(), account }
      const res = await fetch(`${config.public.apiBase}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: ActivityLog = await res.json()
      // Update state frontend
      getActivityState(account).logs.unshift(data)
      return data
    } catch (err) {
      console.error('Failed to add activity log:', err)
      throw err
    }
  }

  /** Reset & fetch ulang logs */
  const refreshActivityLogs = (account: string) => {
    const state = getActivityState(account)
    state.logs = []
    state.lastTimestamp = undefined
    state.finished = false
    fetchActivityLogs(account)
  }

  return {
    activityStates,
    getActivityState,
    fetchActivityLogs,
    addActivityLog,
    refreshActivityLogs,
  }
}
