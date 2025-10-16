import { db } from "../config/firebase.js"
import DashboardDTO from "../dtos/dashboardDTO.js"
import type { DashboardWallet, DashboardContract, DashboardDocument } from "../types/Dashboard.js"
import { getContractRoles } from "../services/contractService.js"
import { getAddress } from "viem"

const usersCollection = db.collection("users")
const contractsLogsCollection = db.collection("contractLogs")
const documentsCollection = db.collection("documents")
const documentLogsCollection = db.collection("documentLogs")

export class DashboardModel {
  static async getDashboard(): Promise<DashboardDTO> {
    // --- Users / Wallets ---
    const userSnapshot = await usersCollection.get()
    const wallets: DashboardWallet[] = userSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        address: data.address,
        balance: data.balance ?? 0,
      }
    })

    // --- Contracts ---
    const contractLogsSnap = await contractsLogsCollection.get()
    const recentContracts: DashboardContract[] = contractLogsSnap.docs
      .map(doc => {
        const data = doc.data()
        const lastAction = data.history?.[data.history.length - 1] ?? null
        return {
          address: doc.id,
          createdAt: lastAction?.timestamp ?? 0,
          lastAction,
        } as DashboardContract
      })
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 5)

    // --- Documents ---
    const documentDocsSnap = await documentsCollection.get()
    const recentDocuments: DashboardDocument[] = await Promise.all(
      documentDocsSnap.docs.map(async doc => {
        const docData = doc.data()
        const logsSnap = await documentLogsCollection.doc(doc.id).get()
        const history = logsSnap.exists ? (logsSnap.data()?.history ?? []) : []
        const lastAction = history[history.length - 1] ?? null

        return {
          id: doc.id,
          title: docData.title ?? "",
          tokenId: docData.tokenId,
          owner: docData.owner,
          docType: docData.docType,
          status: docData.status,
          createdAt: docData.createdAt ?? 0,
          updatedAt: docData.updatedAt ?? 0,
          lastAction,
        } as DashboardDocument
      })
    )

    // Sort by lastAction timestamp atau createdAt
    recentDocuments.sort(
      (a, b) => (b.lastAction?.timestamp ?? b.createdAt ?? 0) - (a.lastAction?.timestamp ?? a.createdAt ?? 0)
    )

    const dto = new DashboardDTO({
      totalWallets: wallets.length,
      totalContracts: contractLogsSnap.size,
      totalDocuments: documentDocsSnap.size,
      wallets,
      recentContracts,
      recentDocuments: recentDocuments.slice(0, 5),
    })

    return dto
  }
  
  
  static async getUserDashboard(userAddress: string): Promise<DashboardDTO> {
    const normalizedAddress = getAddress(userAddress) 

    // --- Wallets ---
    const userSnap = await usersCollection.doc(normalizedAddress).get()
    const wallets: DashboardWallet[] = userSnap.exists
      ? [{ address: normalizedAddress, balance: userSnap.data()?.balance ?? 0 }]
      : []

    // --- Contracts terkait user ---
    const contractLogsSnap = await contractsLogsCollection.get()
    const userContracts: DashboardContract[] = []

    for (const doc of contractLogsSnap.docs) {
      const data = doc.data()
      const lastAction = data.history?.[data.history.length - 1] ?? null
      const roles = await getContractRoles(doc.id)

      if (
        roles.exporter === normalizedAddress ||
        roles.importer === normalizedAddress
      ) {
        userContracts.push({
          address: doc.id as `0x$string`,
          createdAt: lastAction?.timestamp ?? 0,
          lastAction,
        })
      }
    }

    userContracts.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    const recentContracts = userContracts.slice(0, 5)

    // --- Documents terkait user (owner atau linkedContracts) ---
    const docSnap = await documentsCollection.get()
    const userDocuments: DashboardDocument[] = []

    for (const doc of docSnap.docs) {
      const docData = doc.data()
      const logsSnap = await documentLogsCollection.doc(doc.id).get()
      const history = logsSnap.exists ? logsSnap.data()?.history ?? [] : []
      const lastAction = history[history.length - 1] ?? null

      const isOwner = docData.owner === normalizedAddress

      let linkedToUser = false
      if (docData.linkedContracts?.length) {
        for (const c of docData.linkedContracts) {
          const roles = await getContractRoles(c)
          if (roles.exporter === normalizedAddress || roles.importer === normalizedAddress) {
            linkedToUser = true
            break
          }
        }
      }

      if (isOwner || linkedToUser) {
        userDocuments.push({
          id: doc.id,
          title: docData.title ?? "",
          tokenId: docData.tokenId,
          owner: docData.owner,
          docType: docData.docType,
          status: docData.status,
          createdAt: docData.createdAt ?? 0,
          updatedAt: docData.updatedAt ?? 0,
          lastAction,
        })
      }
    }

    userDocuments.sort(
      (a, b) =>
        ((b.lastAction?.timestamp ?? b.createdAt ?? 0) as number) -
        ((a.lastAction?.timestamp ?? a.createdAt ?? 0) as number)
    )

    const dto = new DashboardDTO({
      totalWallets: wallets.length,
      totalContracts: userContracts.length,
      totalDocuments: userDocuments.length,
      wallets,
      recentContracts,
      recentDocuments: userDocuments.slice(0, 5),
    })

    return dto
  }
}
