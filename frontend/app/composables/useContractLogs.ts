import { reactive, ref, onMounted } from 'vue'
import { useApi } from './useApi'
import type { ContractLogEntry, ContractLogPayload, ContractState } from '~/types/Contract'

export function useContractLogs() {
  const logs = ref<string[]>([])
  const backendLogs = ref<Record<string, ContractLogEntry[]>>({})
  const loading = ref(true)

  const contractStates = reactive<Record<string, ContractState>>({})

  const { request } = useApi()

  const getContractState = (contract: string) => {
    if (!contractStates[contract]) {
      contractStates[contract] = {
        isOpen: false,
        history: [],
        loading: false,
        finished: false,
        lastTimestamp: undefined,
        role: 'Guest',
      }
    }
    return contractStates[contract]
  }

  /** Fetch semua deployed contracts dari backend */
  const fetchContracts = async () => {
    loading.value = true
    try {
      // Response type sesuai backend
      const res = await request<{ chainContracts: string[]; backendLogs: ContractLogEntry[] }>('/contract')
      const chainContracts = res.chainContracts ?? []
      const backend = res.backendLogs ?? []

      logs.value = chainContracts
      logs.value.forEach((c: string) => getContractState(c))

      backend.forEach((log: ContractLogEntry) => {
        const addr = log.contractAddress
        if (!addr) return
        backendLogs.value[addr] = backendLogs.value[addr] || []
        backendLogs.value[addr].push(log)

        const state = getContractState(addr)
        state.history = backendLogs.value[addr]
        state.lastTimestamp = backendLogs.value[addr][backendLogs.value[addr].length - 1]?.timestamp
      })
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
    } finally {
      loading.value = false
    }
  }

  /** Fetch logs backend per contract */
  const fetchContractLogs = async (contract: string) => {
    const state = getContractState(contract)
    if (state.loading || state.finished) return

    state.loading = true
    try {
      // Sesuaikan tipe response dengan backend
      const res = await request<{ contractAddress: string; history: ContractLogEntry[] }>(`/contract/${contract}/details`)
      const backend: ContractLogEntry[] = res.history ?? []

      console.log(`Fetched contract logs for ${contract}:`, res)

      const lastAction = state.history[state.history.length - 1]?.action.toLowerCase()
      if (['complete'].includes(lastAction as string)) {
        state.finished = true
      }

      // update state dan backendLogs
      state.history.push(...backend)
      if (backend.length > 0) {
        state.lastTimestamp = backend[backend.length - 1]?.timestamp
      }
      backendLogs.value[contract] = state.history
    } catch (err) {
      console.error(`Failed to fetch contract logs for ${contract}:`, err)
    } finally {
      state.loading = false
    }
  }

  /** Add log baru ke backend */
  const addContractLog = async (contract: string, log: ContractLogPayload) => {
    try {
      const payload: ContractLogPayload & { timestamp: number; address: string } = {
        ...log,
        timestamp: Date.now(),
        address: contract,
      }
      const res = await request<ContractLogEntry>('/contract/log', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data: ContractLogEntry = res // sesuai tipe request

      const state = getContractState(contract)
      state.history.unshift(data)
      backendLogs.value[contract] = state.history
      return data
    } catch (err) {
      console.error('Failed to add contract log:', err)
      throw err
    }
  }

  /** Toggle contract open/close dan fetch logs jika kosong */
  const toggleContract = async (contract: string) => {
    const state = getContractState(contract)
    state.isOpen = !state.isOpen

    if (state.isOpen && state.history.length === 0) {
      await fetchContractLogs(contract)
    }
  }

  /** Refresh logs contract */
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
