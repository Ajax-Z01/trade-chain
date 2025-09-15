import { ref } from 'vue'
import { useActivityLogs } from './useActivityLogs'
import { useWallet } from './useWallets'

export function useCompany() {
  const companies = ref<any[]>([])
  const company = ref<any | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { $apiBase } = useNuxtApp()
  const { addActivityLog } = useActivityLogs()
  const { account } = useWallet()

  // --- Fetch all companies ---
  const fetchCompanies = async () => {
    if (!account.value) return
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/company`)
      if (!res.ok) throw new Error('Failed to fetch companies')
      const data = await res.json()
      companies.value = data.data ?? []
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // --- Fetch company by ID ---
  const fetchCompanyById = async (id: string) => {
    if (!account.value) return
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/company/${id}`)
      if (!res.ok) throw new Error('Failed to fetch company')
      const data = await res.json()
      company.value = data.data ?? null
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // --- Create company ---
  const createCompany = async (payload: any) => {
    if (!account.value) return null
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create company')
      const data = await res.json()

      await addActivityLog(account.value, {
        type: 'backend',
        action: 'createCompany',
        tags: ['company', 'create'],
        extra: { companyId: data.data.id, ...payload },
      })

      return data.data
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // --- Update company ---
  const updateCompany = async (id: string, payload: any) => {
    if (!account.value) return null
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/company/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to update company')
      const data = await res.json()

      await addActivityLog(account.value, {
        type: 'backend',
        action: 'updateCompany',
        tags: ['company', 'update'],
        extra: { companyId: id, ...payload },
      })

      return data.data
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // --- Delete company ---
  const deleteCompany = async (id: string) => {
    if (!account.value) return false
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${$apiBase}/company/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete company')
      const data = await res.json()

      await addActivityLog(account.value, {
        type: 'backend',
        action: 'deleteCompany',
        tags: ['company', 'delete'],
        extra: { companyId: id },
      })

      return data.success
    } catch (err: any) {
      error.value = err.message || 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    companies,
    company,
    loading,
    error,
    fetchCompanies,
    fetchCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
  }
}
