import admin from 'firebase-admin'
import { db } from '../config/firebase.js'
import type { AggregatedActivityLog } from '../types/AggregatedActivity.js'
import ActivityLogDTO from '../dtos/activityDTO.js'

const collection = db.collection('aggregatedActivityLogs')

export default {
  add: async (data: Partial<AggregatedActivityLog>): Promise<AggregatedActivityLog> => {
    const dto = new ActivityLogDTO(data)
    dto.validate()

    const entry: AggregatedActivityLog = {
      id: `${dto.account}_${dto.timestamp}`,
      timestamp: dto.timestamp ?? Date.now(),
      type: dto.type,
      action: dto.action,
      account: dto.account,
      accountLower: dto.account.toLowerCase(),
      txHash: dto.txHash,
      txHashLower: dto.txHash?.toLowerCase(),
      contractAddress: dto.contractAddress,
      contractLower: dto.contractAddress?.toLowerCase(),
      extra: dto.extra ?? undefined,
      onChainInfo: dto.onChainInfo,
      tags: [],
    }

    await collection.doc(entry.id).set(entry)
    return entry
  },

  getById: async (id: string): Promise<AggregatedActivityLog | null> => {
    const doc = await collection.doc(id).get()
    if (!doc.exists) return null
    return doc.data() as AggregatedActivityLog
  },

  getAll: async (filter?: {
    account?: string
    txHash?: string
    contractAddress?: string
    tags?: string[]
    limit?: number
    startAfterTimestamp?: number
  }): Promise<AggregatedActivityLog[]> => {
    let query: FirebaseFirestore.Query = collection.orderBy('timestamp', 'desc')

    if (filter?.account) query = query.where('accountLower', '==', filter.account.toLowerCase())
    if (filter?.txHash) query = query.where('txHashLower', '==', filter.txHash.toLowerCase())
    if (filter?.contractAddress) query = query.where('contractLower', '==', filter.contractAddress.toLowerCase())
    if (filter?.startAfterTimestamp) query = query.startAfter(filter.startAfterTimestamp)
    if (filter?.limit) query = query.limit(filter.limit)

    const snapshot = await query.get()
    return snapshot.docs.map(doc => doc.data() as AggregatedActivityLog)
  },

  addTag: async (id: string, tag: string) => {
    const docRef = collection.doc(id)
    await docRef.update({
      tags: admin.firestore.FieldValue.arrayUnion(tag)
    })
  },

  removeTag: async (id: string, tag: string) => {
    const docRef = collection.doc(id)
    await docRef.update({
      tags: admin.firestore.FieldValue.arrayRemove(tag)
    })
  }
}
