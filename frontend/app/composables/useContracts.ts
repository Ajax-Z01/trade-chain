import { ref, reactive, onMounted } from 'vue'
import { useApi } from './useApi'
import type { MyContractData, ContractState } from '~/types/Contract'

export function useContracts() {
  const contracts = ref<string[]>([])
  const contractStates = reactive<Record<string, ContractState>>({})
  const loading = ref(true)

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

  /** Fetch contracts user */
  const fetchMyContracts = async () => {
    loading.value = true
    try {
      const res = await request<{ success: boolean; data: MyContractData[] }>('/contract/my')
      const myContractsData = res.data ?? []

      const validContracts: string[] = []

      myContractsData.forEach(contractData => {
        const addr = contractData.contractAddress
        const role = contractData.role

        if (!addr || !role) return

        const state = getContractState(addr)
        state.history = contractData.history ?? []
        state.role = role
        const lastAction = state.history[state.history.length - 1]?.action.toLowerCase()
        if (lastAction === 'complete') {
          state.finished = true
        }
        state.loading = false
        state.lastTimestamp = contractData.history?.[contractData.history.length - 1]?.timestamp

        validContracts.push(addr)
      })

      contracts.value = validContracts
    } catch (err) {
      console.error('Failed to fetch my contracts:', err)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchMyContracts()
  })

  return {
    contracts,
    contractStates,
    loading,
    getContractState,
    fetchMyContracts,
  }
}
