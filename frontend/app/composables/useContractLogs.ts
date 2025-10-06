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
      }
    }
    return contractStates[contract]
  }

  /** Fetch semua deployed contracts dari backend */
  const fetchContracts = async () => {
    loading.value = true
    try {
      const data = await request<{ chainContracts: string[]; backendLogs: ContractLogEntry[] }>('/contract')
      logs.value = data.chainContracts
      logs.value.forEach(c => getContractState(c))

      data.backendLogs.forEach(log => {
        const addr = log.contractAddress
        if (!addr) return
        backendLogs.value[addr] = backendLogs.value[addr] || []
        backendLogs.value[addr].push(log)
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
      const data = await request<{ backendLogs: ContractLogEntry[] }>(`contract/${contract}/details`)
      const backend = data.backendLogs

      if (backend.length === 0) state.finished = true

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
      const payload: ContractLogPayload & { timestamp: number; address: string } = {
        ...log,
        timestamp: Date.now(),
        address: contract,
      }
      const data = await request<ContractLogEntry>('/contract/log', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      getContractState(contract).history.unshift(data)
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
