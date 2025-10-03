import { ref, computed, watch, type Ref } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useRegistryDocument } from './useRegistryDocument'
import { useContractActions } from '~/composables/useContractActions'

/**
 * Contract-based role helper (untuk importer/exporter + document minters)
 * Tidak ada KYC di sini
 */
export function useContractRole(selectedContract: Ref<string | null>) {
  const { account } = useWallet()
  const { fetchContractDetails } = useContractActions()
  const { isMinter: isDocMinter } = useRegistryDocument()

  const adminAddress = ref<`0x${string}`>('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
  const isAdmin = computed(() => account.value === adminAddress.value)
  const isImporter = ref(false)
  const isExporter = ref(false)

  const userRole = computed<'admin' | 'importer' | 'exporter' | null>(() => {
    if (!account.value) return null
    if (isAdmin.value) return 'admin'
    if (!selectedContract.value) return null
    if (isImporter.value) return 'importer'
    if (isExporter.value) return 'exporter'
    return null
  })

  // ---------------- Contract roles ----------------
  const getContractRoles = async (contract: string) => {
    try {
      const data = await fetchContractDetails(contract as `0x${string}`)
      const deployLog = data.history?.find((h: any) => h.action === 'deploy')
      return {
        importer: deployLog?.extra?.importer || '',
        exporter: deployLog?.extra?.exporter || ''
      }
    } catch {
      return { importer: '', exporter: '' }
    }
  }

  const refreshRole = async () => {
    if (!selectedContract.value || !account.value) return
    if (isAdmin.value) {
      isImporter.value = false
      isExporter.value = false
      return
    }
    const roles = await getContractRoles(selectedContract.value)
    isImporter.value = account.value === roles.importer
    isExporter.value = account.value === roles.exporter
  }

  watch([selectedContract, account], async ([contract, acc]) => {
    if (!account.value) return
    if (isAdmin.value) {
      isImporter.value = false
      isExporter.value = false
      return
    }
    if (!contract) return
    const roles = await getContractRoles(contract)
    isImporter.value = acc === roles.importer
    isExporter.value = acc === roles.exporter
  }, { immediate: true })

  // ---------------- Approved Document Minters ----------------
  const approvedMintersDoc = ref<string[]>([])
  const loadingMintersDoc = ref(false)
  const fetchApprovedMintersDoc = async (addresses: `0x${string}`[]) => {
    loadingMintersDoc.value = true
    try {
      const results = await Promise.all(addresses.map(addr => isDocMinter(addr)))
      approvedMintersDoc.value = addresses.filter((_, idx) => results[idx])
    } catch (err) {
      console.error('[fetchApprovedMintersDoc] Failed:', err)
      approvedMintersDoc.value = []
    } finally {
      loadingMintersDoc.value = false
    }
  }

  return {
    isAdmin,
    isImporter,
    isExporter,
    userRole,
    refreshRole,
    getContractRoles,
    approvedMintersDoc,
    loadingMintersDoc,
    fetchApprovedMintersDoc,
  }
}
