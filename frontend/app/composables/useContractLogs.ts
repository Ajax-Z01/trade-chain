import { reactive, ref, onMounted } from 'vue'
import { getContractLogs, getContractLogsByAddress } from '~/composables/useLogs'
import type { ContractLogEntry, ContractLogPayload } from '~/types/Contract'

export function useContractLogs() {
  const logs = ref<string[]>([])
  const backendLogs = ref<Record<string, ContractLogEntry[]>>({})
  const loading = ref(true)

  interface ContractState {
    isOpen: boolean
    history: ContractLogEntry[]
    loading: boolean
    finished: boolean
    lastTimestamp?: number
  }

  const contractStates = reactive<Record<string, ContractState>>({})

  const getContractState = (contract: string) => {
    if (!contractStates[contract]) {
      contractStates[contract] = {
        isOpen: false,
        history: [],
        loading: false,
        finished: false,
        lastTimestamp: undefined,
      }
    }
    return contractStates[contract]
  }

  /** Fetch contracts dari chain + backend */
  const fetchContracts = async () => {
    loading.value = true
    try {
      const { chainContracts, backendLogs: backend } = await getContractLogs()
      logs.value = chainContracts
      logs.value.forEach(c => getContractState(c))

      // map backend logs per contract
      backend.forEach((log: any) => {
        const addr = log.contractAddress as string
        backendLogs.value[addr] = backendLogs.value[addr] || []
        backendLogs.value[addr].push(log)
      })
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
    } finally {
      loading.value = false
    }
  }

  /** Fetch logs contract dari backend + chain */
  const fetchContractLogs = async (contract: string) => {
    const state = getContractState(contract)
    if (state.loading || state.finished) return

    state.loading = true
    try {
      const { backendLogs: backend } = await getContractLogsByAddress(contract as `0x${string}`)

      if (backend.length === 0) {
        state.finished = true
      }

      state.history.push(...backend)
      if (backend.length > 0) state.lastTimestamp = backend[backend.length - 1]?.timestamp ?? state.lastTimestamp
    } catch (err) {
      console.error(`Failed to fetch contract logs for ${contract}:`, err)
    } finally {
      state.loading = false
    }
  }

  /** Add log baru ke backend */
  const addContractLog = async (contract: string, log: ContractLogPayload) => {
    try {
      const { $apiBase } = useNuxtApp()
      const payload = { ...log, timestamp: Date.now(), account: log.account, address: contract }
      const res = await fetch(`${$apiBase}/contract/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: ContractLogEntry = await res.json()
      getContractState(contract).history.unshift(data)
      return data
    } catch (err) {
      console.error('Failed to add contract log:', err)
      throw err
    }
  }

  const toggleContract = async (contract: string) => {
    const state = getContractState(contract)
    state.isOpen = !state.isOpen

    if (state.isOpen && state.history.length === 0) {
      await fetchContractLogs(contract)
    }
  }

  const refreshContractLogs = (contract: string) => {
    const state = getContractState(contract)
    state.history = []
    state.lastTimestamp = undefined
    state.finished = false
    fetchContractLogs(contract)
  }

  onMounted(fetchContracts)

  return {
    logs,
    backendLogs,
    loading,
    contractStates,
    getContractState,
    toggleContract,
    fetchContracts,
    fetchContractLogs,
    addContractLog,
    refreshContractLogs,
  }
}
