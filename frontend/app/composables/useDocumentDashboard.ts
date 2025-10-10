import { ref, computed, watch, onMounted } from 'vue'
import { useWallet } from '~/composables/useWallets'
import { useDocuments } from '~/composables/useDocuments'
import { useRegistryDocument } from '~/composables/useRegistryDocument'
import { useContractRole } from '~/composables/useContractRole'
import { useContractActions } from '~/composables/useContractActions'
import { useDashboard } from '~/composables/useDashboard'
import { useToast } from '~/composables/useToast'
import type { Document as DocType } from '~/types/Document'

export function useDocumentDashboard(initialContract: string | null = null) {
  // --- Composables ---
  const { addToast } = useToast()
  const { account } = useWallet()
  const { attachDocument, getDocumentsByContract } = useDocuments()
  const { mintDocument, addMinter, removeMinter, reviewDocument, signDocument, revokeDocument, isMinter } = useRegistryDocument()
  const { deployedContracts, fetchDeployedContracts } = useContractActions()
  const { wallets, fetchDashboard } = useDashboard()
  const {
    userRole,
    isAdmin,
    isImporter,
    isExporter,
    fetchApprovedMintersDoc,
    loadingMintersDoc: roleLoadingMinters
  } = useContractRole(ref(initialContract))

  // --- State ---
  const currentContract = ref<string | null>(initialContract)
  const documents = ref<DocType[]>([])
  const selectedFiles = ref<File[]>([])
  const fileProgresses = ref<{ file: File; progress: number; status: string; tokenId?: number }[]>([])
  const docType = ref<'Invoice' | 'B/L' | 'COO' | 'PackingList' | 'Other'>('Invoice')

  const userIsMinter = ref(false)
  const approvedMintersDoc = ref<string[]>([])
  const loadingDocs = ref(false)
  const loadingMintersDoc = ref(false)
  const minting = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)
  const minterAddress = ref<string>('')
  const addingMinter = ref(false)
  const removingMinter = ref(false)

  const showViewer = ref(false)
  const selectedDocSrc = ref<string | null>(null)
  const selectedDoc = ref<DocType | null>(null)

  // --- Computed ---
  const canAttachAndMint = computed(() => {
    return currentContract.value && account.value && (isImporter.value || isExporter.value)
  })

  // --- Methods ---
  const fetchApprovedMinters = async () => {
    if (!currentContract.value || wallets.value.length === 0) return
    loadingMintersDoc.value = true
    try {
      const minters: string[] = []
      for (const w of wallets.value) {
        if (w.address && await isMinter(w.address as `0x${string}`)) {
          minters.push(w.address)
        }
      }
      approvedMintersDoc.value = minters
      // check if current account is minter
      userIsMinter.value = account.value ? minters.includes(account.value) : false
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch approved minters', 'error')
    } finally {
      loadingMintersDoc.value = false
    }
  }

  const fetchDocuments = async () => {
    if (!currentContract.value) return
    loadingDocs.value = true
    try {
      documents.value = await getDocumentsByContract(currentContract.value)
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch documents', 'error')
    } finally {
      loadingDocs.value = false
    }
  }
  
  const fetchGlobalMinters = async () => {
    if (wallets.value.length === 0) return
    loadingMintersDoc.value = true
    try {
        const minters: string[] = []
        for (const w of wallets.value) {
        if (w.address && await isMinter(w.address as `0x${string}`)) {
            minters.push(w.address)
        }
        }
        approvedMintersDoc.value = minters
        userIsMinter.value = account.value ? minters.includes(account.value) : false
    } catch (err: any) {
        addToast(err.message || 'Failed to fetch global minters', 'error')
    } finally {
        loadingMintersDoc.value = false
    }
    }

  const handleAttachAndMint = async () => {
    if (!selectedFiles.value.length || !currentContract.value || !account.value) {
      addToast('Select files, connect wallet, and choose a contract', 'error')
      return
    }
    if (!userRole.value) {
      addToast('You are not authorized for this contract', 'error')
      return
    }

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const fp = fileProgresses.value[i]
      if (!fp) continue
      try {
        fp.status = 'minting'
        fp.progress = 10

        const { tokenId, metadataUrl, fileHash, txHash } = await mintDocument(account.value as `0x${string}`, fp.file, docType.value)
        fp.progress = 50
        fp.status = 'uploading'

        const uploadedDoc = await attachDocument(currentContract.value, {
          tokenId: Number(tokenId),
          owner: account.value,
          fileHash,
          uri: `uploaded://fake-url/${fp.file.name}`, // replace with actual upload method
          docType: docType.value,
          linkedContracts: [currentContract.value],
          createdAt: Date.now(),
          signer: account.value,
          name: fp.file.name,
          description: `Attached & minted document ${fp.file.name}`,
          metadataUrl
        }, account.value, txHash)

        documents.value.push(uploadedDoc)
        fp.progress = 100
        fp.status = 'success'
        fp.tokenId = Number(tokenId)
      } catch (err: any) {
        console.error(err)
        fp.progress = 100
        fp.status = 'error'
        addToast(`Failed to mint ${fp.file.name}`, 'error')
      }
    }
    selectedFiles.value = []
    addToast('All files processed!', 'success')
  }

  const handleAddMinter = async () => {
    if (!minterAddress.value || !isAdmin.value) return
    addingMinter.value = true
    try {
      await addMinter(minterAddress.value as `0x${string}`)
      minterAddress.value = ''
      await fetchApprovedMinters()
    } finally {
      addingMinter.value = false
    }
  }

  const handleRemoveMinter = async () => {
    if (!minterAddress.value || !isAdmin.value) return
    removingMinter.value = true
    try {
      await removeMinter(minterAddress.value as `0x${string}`)
      minterAddress.value = ''
      await fetchApprovedMinters()
    } finally {
      removingMinter.value = false
    }
  }

  const handleReview = async (doc: DocType) => {
    if (!account.value || !doc.tokenId) return
    try {
      await reviewDocument(BigInt(doc.tokenId))
      doc.status = 'Reviewed'
      addToast(`Document ${doc.name} marked as Reviewed (on-chain)`, 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to review on-chain', 'error')
    }
  }

  const handleSign = async (doc: DocType) => {
    if (!account.value || !doc.tokenId) return
    try {
      await signDocument(BigInt(doc.tokenId))
      doc.status = 'Signed'
      addToast(`Document ${doc.name} signed (on-chain)`, 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to sign on-chain', 'error')
    }
  }

  const handleRevoke = async (doc: DocType) => {
    if (!account.value || !doc.tokenId) return
    try {
      await revokeDocument(BigInt(doc.tokenId))
      doc.status = 'Revoked'
      addToast(`Document ${doc.name} revoked (on-chain)`, 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to revoke on-chain', 'error')
    }
  }

  const openViewer = (doc: DocType) => {
    selectedDoc.value = doc
    selectedDocSrc.value = doc.uri
    showViewer.value = true
  }

  // --- Lifecycle ---
  onMounted(async () => {
    await fetchDashboard()
    await fetchDeployedContracts()
    fetchApprovedMinters()
    fetchDocuments()
    fetchGlobalMinters()
  })

  // watchers
  watch([currentContract, account], async ([contract, acc]) => {
    if (!contract || !acc) {
      documents.value = []
      userIsMinter.value = false
      return
    }
    fetchApprovedMinters()
    await fetchDocuments()
  })

  return {
    // state
    currentContract,
    documents,
    selectedFiles,
    fileProgresses,
    docType,
    userRole,
    isAdmin,
    isImporter,
    isExporter,
    userIsMinter,
    approvedMintersDoc,
    loadingDocs,
    loadingMintersDoc,
    minting,
    minterAddress,
    addingMinter,
    removingMinter,
    error,
    success,
    deployedContracts,
    // viewer
    selectedDoc,
    selectedDocSrc,
    showViewer,
    // methods
    fetchApprovedMinters,
    fetchDocuments,
    handleAttachAndMint,
    handleAddMinter,
    handleRemoveMinter,
    handleReview,
    handleSign,
    handleRevoke,
    openViewer,
    canAttachAndMint
  }
}
