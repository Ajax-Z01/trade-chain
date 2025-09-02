import { ref, reactive, onMounted } from 'vue'
import { getContractLogs, getContractLogsByAddress } from '~/composables/useLogs'

export function useContractLogs() {
  const logs = ref<string[]>([])
  const loading = ref(true)

  interface ContractState {
    isOpen: boolean
    history: any[]
    loading: boolean
  }

  const contractStates = reactive<Record<string, ContractState>>({})

  const getContractState = (contract: string) => {
    if (!contractStates[contract]) {
      contractStates[contract] = { isOpen: false, history: [], loading: false }
    }
    return contractStates[contract]
  }

  const fetchContracts = async () => {
    loading.value = true
    try {
      const res = await getContractLogs()
      logs.value = res.chainContracts || []
      logs.value.forEach(c => getContractState(c))
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
    } finally {
      loading.value = false
    }
  }

  const toggleContract = async (contract: string) => {
    const state = getContractState(contract)
    state.isOpen = !state.isOpen

    if (state.isOpen && state.history.length === 0) {
      state.loading = true
      try {
        const res = await getContractLogsByAddress(contract as `0x${string}`)
        state.history = res.backendLogs || []
      } catch (err) {
        console.error(`Failed to fetch contract history for ${contract}:`, err)
      } finally {
        state.loading = false
      }
    }
  }

  onMounted(fetchContracts)

  return {
    logs,
    loading,
    contractStates,
    getContractState,
    toggleContract,
    fetchContracts,
  }
}
