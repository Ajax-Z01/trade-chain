import { ref, computed, watch } from 'vue'
import { useWallet } from './useWallets'
import { useApi } from './useApi'
import { useActivityLogs } from './useActivityLogs'
import type { UserCompany, CreateUserCompanyDTO, UpdateUserCompanyDTO } from '~/types/UserCompany'

export function useUserCompany() {
  const userCompanies = ref<UserCompany[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const page = ref(1)
  const limit = ref(10)
  const total = ref(0)
  const searchText = ref('')
  const filterRole = ref<string>('')
  const filterStatus = ref<string>('')
  const filterCompanyId = ref<string>('')

  const { account } = useWallet()
  const { request } = useApi()
  const { addActivityLog } = useActivityLogs()

  const queryParams = computed(() => {
    const params = new URLSearchParams()
    params.append('page', page.value.toString())
    params.append('limit', limit.value.toString())
    if (searchText.value) params.append('search', searchText.value)
    if (filterRole.value) params.append('role', filterRole.value)
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterCompanyId.value) params.append('companyId', filterCompanyId.value) // 👈 Tambahan
    return params.toString()
  })

  const fetchUserCompanies = async () => {
    if (!account.value) return
    loading.value = true
    error.value = null
    try {
      const res = await request<{ data: UserCompany[]; total: number }>(`/user-company?${queryParams.value}`)
      userCompanies.value = res.data ?? []
      total.value = res.total ?? 0
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // Reset page when any filter/search changes
  watch([searchText, filterRole, filterStatus, filterCompanyId], () => {
    page.value = 1
    fetchUserCompanies()
  })

  // Fetch when page changes
  watch(page, () => fetchUserCompanies())

  const createUserCompany = async (payload: CreateUserCompanyDTO) => {
    if (!account.value) return null
    loading.value = true
    try {
      const res = await request<{ data: UserCompany }>('/user-company', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      userCompanies.value.unshift(res.data)
      await addActivityLog(account.value, {
        type: 'backend',
        action: 'createUserCompany',
        tags: ['user-company', 'create'],
        extra: { ...payload, userCompanyId: res.data.id },
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  const updateUserCompany = async (id: string, payload: UpdateUserCompanyDTO) => {
    if (!account.value) return null
    loading.value = true
    try {
      const res = await request<{ data: UserCompany }>(`/user-company/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      const index = userCompanies.value.findIndex((uc) => uc.id === id)
      if (index !== -1) userCompanies.value[index] = res.data

      await addActivityLog(account.value, {
        type: 'backend',
        action: 'updateUserCompany',
        tags: ['user-company', 'update'],
        extra: { ...payload, userCompanyId: id },
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteUserCompany = async (id: string) => {
    if (!account.value) return false
    loading.value = true
    try {
      await request(`/user-company/${id}`, { method: 'DELETE' })
      userCompanies.value = userCompanies.value.filter((uc) => uc.id !== id)
      await addActivityLog(account.value, {
        type: 'backend',
        action: 'deleteUserCompany',
        tags: ['user-company', 'delete'],
        extra: { userCompanyId: id },
      })
      return true
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    userCompanies,
    loading,
    error,
    page,
    limit,
    total,
    searchText,
    filterRole,
    filterStatus,
    filterCompanyId,
    fetchUserCompanies,
    createUserCompany,
    updateUserCompany,
    deleteUserCompany,
  }
}
