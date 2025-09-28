import type { KYC, KYCLogs, KYCLogEntry, KYCStatus } from "../types/Kyc.js"
import { db } from "../config/firebase.js"
import { notifyWithAdmins } from "../utils/notificationHelper.js"

const collection = db.collection("KYCs")
const logsCollection = db.collection("KYCLogs")

export class KYCModel {
  // --- Create KYC ---
  static async create(data: Partial<KYC> & { status?: KYCStatus }, executor: string): Promise<KYC> {
    if (!data.tokenId || !data.owner || !data.fileHash || !data.metadataUrl) {
      throw new Error("Missing required KYC fields: tokenId, owner, fileHash, metadataUrl")
    }

    const docRef = collection.doc(data.tokenId)
    const doc = await docRef.get()
    if (doc.exists) throw new Error(`KYC with tokenId ${data.tokenId} already exists`)

    const newDoc: KYC = {
      tokenId: data.tokenId!,
      owner: data.owner!,
      fileHash: data.fileHash!,
      metadataUrl: data.metadataUrl!,
      documentUrl: data.documentUrl,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: data.updatedAt,
      status: data.status || "Draft",
    }

    await docRef.set(newDoc)

    // Notifikasi
    await notifyWithAdmins(executor, {
      type: "kyc",
      title: `KYC Created: ${newDoc.tokenId}`,
      message: `KYC for owner ${newDoc.owner} created by ${executor}.`,
      data: newDoc
    })

    return newDoc
  }

  // --- Update KYC ---
  static async update(
    tokenId: string,
    data: Partial<KYC>,
    action?: KYCLogEntry["action"],
    txHash?: string,
    executor?: string
  ): Promise<KYC | null> {
    const docRef = collection.doc(tokenId)
    const doc = await docRef.get()
    if (!doc.exists) return null

    const current = doc.data() as KYC
    const protectedFields = ["tokenId", "owner", "fileHash"] as const

    const filteredData: Partial<KYC> = {}
    for (const key in data) {
      if (!protectedFields.includes(key as any)) {
        const value = data[key as keyof KYC]
        if (value !== undefined) {
          (filteredData as any)[key] = value
        }
      }
    }

    const updated: KYC = {
      ...current,
      ...filteredData,
      updatedAt: Date.now(),
    }

    await docRef.update(updated as any)

    if (action && executor) {
      const log: KYCLogEntry = {
        action,
        txHash: txHash || "",
        account: current.owner,
        executor,
        timestamp: Date.now(),
      }
      await this.addLogEntry(tokenId, log)

      // Notifikasi
      await notifyWithAdmins(executor, {
        type: "kyc",
        title: `KYC Updated: ${tokenId}`,
        message: `KYC ${tokenId} updated by ${executor}.`,
        data: updated
      })
    }

    return updated
  }

  // --- Delete KYC ---
  static async delete(
    tokenId: string,
    action?: KYCLogEntry["action"],
    txHash?: string,
    executor?: string
  ): Promise<boolean> {
    const docRef = collection.doc(tokenId)
    const doc = await docRef.get()
    if (!doc.exists) return false

    const kyc = doc.data() as KYC
    await docRef.delete()

    if (action && executor) {
      const log: KYCLogEntry = {
        action,
        txHash: txHash || "",
        account: kyc.owner,
        executor,
        timestamp: Date.now(),
      }
      await this.addLogEntry(tokenId, log)

      // Notifikasi
      await notifyWithAdmins(executor, {
        type: "kyc",
        title: `KYC Deleted: ${tokenId}`,
        message: `KYC ${tokenId} deleted by ${executor}.`,
        data: kyc
      })
    }

    return true
  }

  // --- Log helper ---
  static async addLogEntry(tokenId: string, log: KYCLogEntry) {
    const logRef = logsCollection.doc(tokenId)
    const snapshot = await logRef.get()
    if (!snapshot.exists) {
      const newLog: KYCLogs = { tokenId: Number(tokenId), history: [log] }
      await logRef.set(newLog)
    } else {
      const currentLogs = snapshot.data() as KYCLogs
      currentLogs.history.push(log)
      await logRef.update(currentLogs as any)
    }
  }

  static async getAll(): Promise<(KYC & { history: KYCLogEntry[] })[]> {
    const snapshot = await collection.get()
    const kycs: KYC[] = snapshot.docs.map(doc => doc.data() as KYC)
    const result = await Promise.all(
      kycs.map(async kyc => {
        const logsSnap = await logsCollection.doc(kyc.tokenId).get()
        const history: KYCLogEntry[] = logsSnap.exists ? (logsSnap.data() as KYCLogs).history : []
        return { ...kyc, history }
      })
    )
    return result
  }

  static async getById(tokenId: string): Promise<KYC & { history: KYCLogEntry[] } | null> {
    const doc = await collection.doc(tokenId).get()
    if (!doc.exists) return null
    const kyc = doc.data() as KYC

    const logsSnap = await logsCollection.doc(tokenId).get()
    const history: KYCLogEntry[] = logsSnap.exists ? (logsSnap.data() as KYCLogs).history : []

    return { ...kyc, history }
  }

  static async getByOwner(owner: string): Promise<(KYC & { history: KYCLogEntry[] })[]> {
    const snapshot = await collection.where("owner", "==", owner).get()
    const kycs: KYC[] = snapshot.docs.map(doc => doc.data() as KYC)
    const result = await Promise.all(
      kycs.map(async kyc => {
        const logsSnap = await logsCollection.doc(kyc.tokenId).get()
        const history: KYCLogEntry[] = logsSnap.exists ? (logsSnap.data() as KYCLogs).history : []
        return { ...kyc, history }
      })
    )
    return result
  }

  static async getLogs(tokenId: string): Promise<KYCLogEntry[]> {
    const snapshot = await logsCollection.doc(tokenId).get()
    if (!snapshot.exists) return []
    const logs = snapshot.data() as KYCLogs
    return logs.history
  }
}
