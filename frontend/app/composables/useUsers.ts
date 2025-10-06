import { ref, readonly, onMounted } from 'vue'
import { useApi } from './useApi'
import type { User, UpdateUserDTO } from '~/types/User'

// --- Singleton global state ---
const users = ref<User[]>([])
const loading = ref(false)
let globalCurrentUser: Ref<User | null> | null = null
let _fetchingCurrentUser = false
const _currentUser = ref<User | null>(null)

function setCurrentUser(user: User | null) {
  _currentUser.value = user
}

export function useUsers(ssrUser?: User | null) {
  const { request } = useApi()

  // --- Init singleton currentUser ---
  if (!globalCurrentUser) globalCurrentUser = ref<User | null>(ssrUser || null)
  const currentUser = globalCurrentUser

  // --- Fetch current user (SSR fallback / client) ---
  async function fetchCurrentUser(): Promise<User | null> {
    if (currentUser.value) return currentUser.value
    if (_fetchingCurrentUser) return currentUser.value

    _fetchingCurrentUser = true
    try {
      const data = await request<{ data: User }>('/user/me')
      currentUser.value = data.data
      return currentUser.value
    } catch (err: any) {
      console.warn('Failed fetch current user:', err.message)
      return null
    } finally {
      _fetchingCurrentUser = false
    }
  }

  // --- Wallet connect / auto-register (client-only) ---
  async function walletConnect(address: string): Promise<User | null> {
    try {
      const res = await request<{ data: User; token: string }>('/user/wallet-connect', {
        method: 'POST',
        body: JSON.stringify({ address }),
      })

      currentUser.value = res.data
      if (typeof window !== 'undefined' && res.token) {
        localStorage.setItem('token', res.token)
      }
      return currentUser.value
    } catch (err: any) {
      console.warn('Failed walletConnect:', err.message)
      return null
    }
  }

  // --- Fetch all users (admin) ---
  async function fetchAll(): Promise<User[]> {
    loading.value = true
    try {
      const data = await request<{ data: User[] }>('/user')
      users.value = data.data
      return users.value
    } catch (err: any) {
      console.warn('Failed fetchAll users:', err.message)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchByAddress(address: string): Promise<User | null> {
    try {
      const data = await request<{ data: User }>(`/user/${address}`)
      return data.data
    } catch (err: any) {
      console.warn(`Failed fetch user ${address}:`, err.message)
      return null
    }
  }

  async function update(address: string, payload: UpdateUserDTO): Promise<User | null> {
    try {
      const data = await request<{ data: User }>(`/user/${address}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return data.data
    } catch (err: any) {
      console.warn(`Failed update user ${address}:`, err.message)
      return null
    }
  }

  async function remove(address: string): Promise<boolean> {
    try {
      await request(`/user/${address}`, { method: 'DELETE' })
      users.value = users.value.filter(u => u.address !== address)
      return true
    } catch (err: any) {
      console.warn(`Failed delete user ${address}:`, err.message)
      return false
    }
  }

  // --- Auto-fetch current user client-side (once) ---
  if (typeof window !== 'undefined') {
    onMounted(() => {
      fetchCurrentUser().catch(() => null)
    })
  }

  return {
    users: readonly(users),
    loading: readonly(loading),
    currentUser: readonly(currentUser),
    setCurrentUser,
    fetchCurrentUser,
    walletConnect,
    fetchAll,
    fetchByAddress,
    update,
    remove,
  }
}
