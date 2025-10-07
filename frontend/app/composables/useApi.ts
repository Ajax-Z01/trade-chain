import { useCookie } from '#app'
import { useRuntimeConfig } from '#app'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // --- Ambil token dari cookie atau localStorage ---
    let token: string | null = null
    if (typeof window === 'undefined') {
      // SSR
      token = useCookie('token').value || null
    } else {
      token = localStorage.getItem('token')
    }

    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers })

    if (!res.ok) {
      let errorText = await res.text()
      try {
        const json = JSON.parse(errorText)
        if (json?.message) errorText = json.message
      } catch (err) {}
      throw new Error(errorText || `API request failed: ${res.statusText}`)
    }

    return res.json() as Promise<T>
  }

  return { request }
}
