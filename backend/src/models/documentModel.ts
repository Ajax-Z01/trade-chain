import { getAddress } from 'viem'
import { db } from "../config/firebase.js"
import DocumentDTO from "../dtos/documentDTO.js"
import type { Document, DocumentLogs, DocumentLogEntry } from "../types/Document.js"
import { notifyWithAdmins, notifyUsers } from '../utils/notificationHelper.js'
import { getContractRoles } from "../services/contractService.js"

const collection = db.collection("documents")
const logsCollection = db.collection("documentLogs")

function safeAddress(addr?: string | null): string {
  if (!addr) throw new Error('Address is missing or invalid')
  return getAddress(addr)
}

export class DocumentModel {
  // --- Add new document ---
  static async create(
    data: Partial<Document>,
    account: string,
    action: DocumentLogEntry['action'],
    txHash?: string
  ): Promise<Document> {
    if (!data.linkedContracts?.length) {
      throw new Error("Document must be linked to at least one contract")
    }

    const dto = new DocumentDTO(data)
    const docRef = collection.doc(dto.tokenId.toString())
    const doc = await docRef.get()
    if (doc.exists) throw new Error(`Document with tokenId ${dto.tokenId} already exists`)

    const normalizedAccount = safeAddress(account)

    // Validate roles for each linked contract
    const recipientsToNotify: string[] = []
    for (const contractAddress of dto.linkedContracts) {
      const roles = await getContractRoles(contractAddress)
      const importer = roles.importer ? safeAddress(roles.importer) : null
      const exporter = roles.exporter ? safeAddress(roles.exporter) : null
      if (!importer && !exporter) throw new Error(`Contract ${contractAddress} has no assigned roles yet`)
      if (normalizedAccount !== importer && normalizedAccount !== exporter) {
        throw new Error(`Account ${account} is not authorized for contract ${contractAddress}`)
      }
      if (importer) recipientsToNotify.push(importer)
      if (exporter) recipientsToNotify.push(exporter)
    }

    const newDoc: Document = dto.toFirestore()
    await docRef.set(newDoc)

    // Log & notify for each linked contract
    for (const linkedContract of dto.linkedContracts) {
      const logEntry: DocumentLogEntry = {
        action,
        txHash: txHash || "",
        account: normalizedAccount,
        signer: dto.signer,
        linkedContract,
        timestamp: Date.now(),
      }
      await this.addLogEntry(dto.tokenId, logEntry)
    }

    // --- Notify ---
    const payload = {
      type: "document" as const,
      title: `Document Action: ${action}`,
      message: `Document ${dto.tokenId} has a new action "${action}" by ${normalizedAccount}.`,
      txHash,
      data: { tokenId: dto.tokenId, action, linkedContracts: dto.linkedContracts }
    }

    // Notify admin + executor
    await notifyWithAdmins(normalizedAccount, payload)

    // Notify roles (importer/exporter) selain executor
    await notifyUsers(recipientsToNotify.filter(r => r !== normalizedAccount), payload, normalizedAccount)

    return newDoc
  }

  // --- Add document log ---
  static async addLogEntry(tokenId: number, log: DocumentLogEntry) {
    const logRef = logsCollection.doc(tokenId.toString())
    const snapshot = await logRef.get()

    if (!snapshot.exists) {
      const newLog: DocumentLogs = { tokenId, contractAddress: log.linkedContract || "", history: [log] }
      await logRef.set(newLog)
    } else {
      const currentLogs = snapshot.data() as DocumentLogs
      currentLogs.history.push(log)
      if (!currentLogs.contractAddress && log.linkedContract) currentLogs.contractAddress = log.linkedContract
      await logRef.update(currentLogs as any)
    }
  }

  // --- Update document ---
  static async update(
    tokenId: number,
    data: Partial<Document>,
    action?: DocumentLogEntry["action"],
    txHash?: string,
    account?: string
  ): Promise<Document | null> {
    const docRef = collection.doc(tokenId.toString())
    const snap = await docRef.get()
    if (!snap.exists) return null

    const current = snap.data() as Document
    const updated: Document = { ...current, ...data, status: data.status ?? current.status, updatedAt: Date.now() }
    await docRef.update(updated as any)

    if (action && account) {
      const normalizedAccount = safeAddress(account)
      const recipientsToNotify: string[] = []

      for (const linkedContract of current.linkedContracts ?? []) {
        const logEntry: DocumentLogEntry = {
          action,
          txHash: txHash ?? "",
          account: normalizedAccount,
          signer: current.signer ?? normalizedAccount,
          linkedContract,
          timestamp: Date.now(),
        }
        await this.addLogEntry(tokenId, logEntry)

        const roles = await getContractRoles(linkedContract)
        if (roles.importer) recipientsToNotify.push(safeAddress(roles.importer))
        if (roles.exporter) recipientsToNotify.push(safeAddress(roles.exporter))
      }

      const payload = {
        type: "document" as const,
        title: `Document Action: ${action}`,
        message: `Document ${tokenId} has been updated with action "${action}" by ${normalizedAccount}.`,
        txHash,
        data: { tokenId, action, linkedContracts: current.linkedContracts }
      }

      await notifyWithAdmins(normalizedAccount, payload)
      await notifyUsers(recipientsToNotify.filter(r => r !== normalizedAccount), payload, normalizedAccount)
    }

    return updated
  }

  // --- Delete document ---
  static async delete(
    tokenId: number,
    action?: DocumentLogEntry['action'],
    txHash?: string,
    account?: string
  ): Promise<boolean> {
    const docRef = collection.doc(tokenId.toString())
    const snap = await docRef.get()
    if (!snap.exists) return false

    const data = snap.data() as Document
    await docRef.delete()

    if (action && account) {
      const normalizedAccount = safeAddress(account)
      const recipientsToNotify: string[] = []

      for (const linkedContract of data.linkedContracts ?? []) {
        const logEntry: DocumentLogEntry = {
          action,
          txHash: txHash || "",
          account: normalizedAccount,
          signer: data.signer,
          linkedContract,
          timestamp: Date.now(),
        }
        await this.addLogEntry(tokenId, logEntry)

        const roles = await getContractRoles(linkedContract)
        if (roles.importer) recipientsToNotify.push(safeAddress(roles.importer))
        if (roles.exporter) recipientsToNotify.push(safeAddress(roles.exporter))
      }

      const payload = {
        type: "document" as const,
        title: `Document Action: ${action}`,
        message: `Document ${tokenId} has been deleted by ${normalizedAccount}.`,
        txHash,
        data: { tokenId, action, linkedContracts: data.linkedContracts }
      }

      await notifyWithAdmins(normalizedAccount, payload)
      await notifyUsers(recipientsToNotify.filter(r => r !== normalizedAccount), payload, normalizedAccount)
    }

    return true
  }

  // --- Get all documents with history ---
  static async getAll(): Promise<(Document & { history: DocumentLogEntry[] })[]> {
    const snapshot = await collection.get()
    const docs: Document[] = snapshot.docs.map(d => d.data() as Document)

    return await Promise.all(
      docs.map(async doc => {
        const logsSnap = await logsCollection.doc(doc.tokenId.toString()).get()
        const history: DocumentLogEntry[] = logsSnap.exists ? (logsSnap.data() as DocumentLogs).history : []
        return { ...doc, history }
      })
    )
  }

  // --- Get document by tokenId with history ---
  static async getById(tokenId: number): Promise<(Document & { history: DocumentLogEntry[] }) | null> {
    const docSnap = await collection.doc(tokenId.toString()).get()
    if (!docSnap.exists) return null

    const doc = docSnap.data() as Document
    const logsSnap = await logsCollection.doc(tokenId.toString()).get()
    const history: DocumentLogEntry[] = logsSnap.exists ? (logsSnap.data() as DocumentLogs).history : []

    return { ...doc, history }
  }

  // --- Get documents by owner with history ---
  static async getByOwner(owner: string): Promise<(Document & { history: DocumentLogEntry[] })[]> {
    const snapshot = await collection.where("owner", "==", owner).get()
    const docs: Document[] = snapshot.docs.map(d => d.data() as Document)

    return await Promise.all(
      docs.map(async doc => {
        const logsSnap = await logsCollection.doc(doc.tokenId.toString()).get()
        const history: DocumentLogEntry[] = logsSnap.exists ? (logsSnap.data() as DocumentLogs).history : []
        return { ...doc, history }
      })
    )
  }

  // --- Get documents by contract with history ---
  static async getByContract(contractAddress: string): Promise<(Document & { history: DocumentLogEntry[] })[]> {
    const snapshot = await collection.where("linkedContracts", "array-contains", contractAddress).get()
    const docs: Document[] = snapshot.docs.map(d => d.data() as Document)

    return await Promise.all(
      docs.map(async doc => {
        const logsSnap = await logsCollection.doc(doc.tokenId.toString()).get()
        const history: DocumentLogEntry[] = logsSnap.exists ? (logsSnap.data() as DocumentLogs).history : []
        return { ...doc, history }
      })
    )
  }

  // --- Get document logs only ---
  static async getLogs(tokenId: number): Promise<DocumentLogEntry[]> {
    const snap = await logsCollection.doc(tokenId.toString()).get()
    return snap.exists ? (snap.data() as DocumentLogs).history : []
  }
}
