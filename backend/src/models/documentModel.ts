import { getAddress } from 'viem'
import { db } from "../config/firebase.js"
import DocumentDTO from "../dtos/documentDTO.js"
import type { Document, DocumentLogs, DocumentLogEntry } from "../types/Document.js"
import { getContractRoles } from "../services/contractService.js"

const collection = db.collection("documents")
const logsCollection = db.collection("documentLogs")

function safeAddress(addr?: string | null): string {
  if (!addr) throw new Error('Address is missing or invalid')
  return getAddress(addr)
}

// --- Add new document ---
export const addDocument = async (
  data: Partial<Document>, 
  account: string, 
  action: DocumentLogEntry['action'], 
  txHash?: string
): Promise<Document> => {
  if (!data.linkedContracts?.length) {
    throw new Error("Document must be linked to at least one contract")
  }

  const dto = new DocumentDTO(data)
  const docRef = collection.doc(dto.tokenId.toString())
  const doc = await docRef.get()

  if (doc.exists) throw new Error(`Document with tokenId ${dto.tokenId} already exists`)

  const normalizedAccount = safeAddress(account)

  // Validate roles for each linked contract
  for (const contractAddress of dto.linkedContracts) {
    const roles = await getContractRoles(contractAddress)
    const importer = roles.importer ? safeAddress(roles.importer) : null
    const exporter = roles.exporter ? safeAddress(roles.exporter) : null

    if (!importer && !exporter) {
      throw new Error(`Contract ${contractAddress} has no assigned roles yet`)
    }
    if (normalizedAccount !== importer && normalizedAccount !== exporter) {
      throw new Error(`Account ${account} is not authorized for contract ${contractAddress}`)
    }
  }

  const newDoc: Document = dto.toFirestore()
  await docRef.set(newDoc)

  // Log for each linked contract
  for (const linkedContract of dto.linkedContracts) {
    await addDocumentLog(dto.tokenId, {
      action,
      txHash: txHash || "",
      account: normalizedAccount,
      signer: dto.signer,
      linkedContract,
      timestamp: Date.now(),
    })
  }

  return newDoc
}

// --- Add document log ---
export const addDocumentLog = async (tokenId: number, log: DocumentLogEntry) => {
  const logRef = logsCollection.doc(tokenId.toString())
  const snapshot = await logRef.get()

  if (!snapshot.exists) {
    const newLog: DocumentLogs = {
      tokenId,
      contractAddress: log.linkedContract || "",
      history: [log],
    }
    await logRef.set(newLog)
  } else {
    const currentLogs = snapshot.data() as DocumentLogs
    currentLogs.history.push(log)
    // Update contractAddress if missing
    if (!currentLogs.contractAddress && log.linkedContract) {
      currentLogs.contractAddress = log.linkedContract
    }
    await logRef.update(currentLogs as any)
  }
}

// --- Get all documents (join with logs) ---
export const getAll = async (): Promise<(Document & { history?: DocumentLogEntry[] })[]> => {
  const snapshot = await collection.get()
  const docs: Document[] = snapshot.docs.map(d => d.data() as Document)

  const result = await Promise.all(
    docs.map(async doc => {
      const logsSnap = await logsCollection.doc(doc.tokenId.toString()).get()
      const history: DocumentLogEntry[] = logsSnap.exists 
        ? (logsSnap.data() as DocumentLogs).history 
        : []
      return { ...doc, history }
    })
  )

  return result
}

// --- Get document logs only ---
export const getDocumentLogs = async (tokenId: number): Promise<DocumentLogEntry[]> => {
  const snapshot = await logsCollection.doc(tokenId.toString()).get()
  return snapshot.exists ? (snapshot.data() as DocumentLogs).history : []
}

// --- Get document by ID ---
export const getDocumentById = async (tokenId: number): Promise<(Document & { history?: DocumentLogEntry[] }) | null> => {
  const docSnap = await collection.doc(tokenId.toString()).get()
  if (!docSnap.exists) return null

  const doc = docSnap.data() as Document
  const logsSnap = await logsCollection.doc(tokenId.toString()).get()
  const history: DocumentLogEntry[] = logsSnap.exists ? (logsSnap.data() as DocumentLogs).history : []

  return { ...doc, history }
}

// --- Get documents by owner ---
export const getDocumentsByOwner = async (owner: string): Promise<Document[]> => {
  const snapshot = await collection.where("owner", "==", owner).get()
  return snapshot.docs.map(d => d.data() as Document)
}

// --- Get documents by contract ---
export const getDocumentsByContract = async (contractAddress: string): Promise<Document[]> => {
  const snapshot = await collection.where("linkedContracts", "array-contains", contractAddress).get()
  return snapshot.docs.map(d => d.data() as Document)
}

// --- Update document ---
export const updateDocument = async (
  tokenId: number,
  data: Partial<Document>,
  action?: DocumentLogEntry["action"],
  txHash?: string,
  account?: string
): Promise<Document | null> => {
  const docRef = collection.doc(tokenId.toString())
  const snap = await docRef.get()
  if (!snap.exists) return null

  const current = snap.data() as Document

  const updated: Document = {
    ...current,
    ...data,
    status: data.status ?? current.status,
    updatedAt: Date.now(),
  }

  await docRef.update(updated as any)

  if (action && account) {
    for (const linkedContract of current.linkedContracts ?? []) {
      await addDocumentLog(tokenId, {
        action,
        txHash: txHash ?? "",
        account,
        signer: current.signer ?? account,
        linkedContract,
        timestamp: Date.now(),
      })
    }
  }

  return updated
}

// --- Delete document ---
export const deleteDocument = async (
  tokenId: number,
  action?: DocumentLogEntry['action'],
  txHash?: string,
  account?: string
): Promise<boolean> => {
  const docRef = collection.doc(tokenId.toString())
  const doc = await docRef.get()
  if (!doc.exists) return false

  const data = doc.data() as Document
  await docRef.delete()

  if (action && account) {
    for (const linkedContract of data.linkedContracts ?? []) {
      await addDocumentLog(tokenId, {
        action,
        txHash: txHash || "",
        account,
        signer: data.signer,
        linkedContract,
        timestamp: Date.now(),
      })
    }
  }

  return true
}
