import type { KYC, KYCLogs, KYCLogEntry } from "../types/Kyc.js"
import { db } from "../config/firebase.js"

const collection = db.collection("KYCs")
const logsCollection = db.collection("KYCLogs")

export class KYCModel {
  static async create(data: Partial<KYC>): Promise<KYC> {
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
    }

    await docRef.set(newDoc)
    return newDoc
  }

  static async getById(tokenId: string): Promise<KYC | null> {
    const doc = await collection.doc(tokenId).get()
    return doc.exists ? (doc.data() as KYC) : null
  }

  static async getByOwner(owner: string): Promise<KYC[]> {
    const snapshot = await collection.where("owner", "==", owner).get()
    return snapshot.docs.map(doc => doc.data() as KYC)
  }

  static async update(tokenId: string, data: Partial<KYC>): Promise<KYC | null> {
    const docRef = collection.doc(tokenId)
    const doc = await docRef.get()
    if (!doc.exists) return null

    const current = doc.data() as KYC
    const updated: KYC = { ...current, ...data, updatedAt: Date.now() }
    await docRef.update(updated as any)
    return updated
  }

  static async delete(tokenId: string): Promise<boolean> {
    const docRef = collection.doc(tokenId)
    const doc = await docRef.get()
    if (!doc.exists) return false

    await docRef.delete()
    return true
  }

  // --- Optional: log helper ---
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

  static async getLogs(tokenId: string): Promise<KYCLogs | null> {
    const snapshot = await logsCollection.doc(tokenId).get()
    return snapshot.exists ? (snapshot.data() as KYCLogs) : null
  }
}
