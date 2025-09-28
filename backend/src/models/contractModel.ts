import admin from 'firebase-admin'
import { db } from '../config/firebase.js'
import ContractLogDTO from '../dtos/contractDTO.js'
import type { ContractLogs, ContractLogEntry } from '../types/Contract.js'
import { notifyWithAdmins } from '../utils/notificationHelper.js'

const collection = db.collection('contractLogs')

export const addContractLog = async (data: Partial<ContractLogDTO>) => {
  const dto = new ContractLogDTO(data as any)
  dto.validate()

  const entry: ContractLogEntry = {
    action: dto.action,
    txHash: dto.txHash,
    account: dto.account,
    exporter: dto.exporter,
    importer: dto.importer,
    requiredAmount: dto.requiredAmount,
    extra: dto.extra ?? null,
    timestamp: dto.timestamp ?? Date.now(),
    onChainInfo: dto.onChainInfo,
  }

  const docRef = collection.doc(dto.contractAddress)
  const doc = await docRef.get()

  if (doc.exists) {
    await docRef.update({
      history: admin.firestore.FieldValue.arrayUnion(entry),
    })
  } else {
    const newDoc: ContractLogs = {
      contractAddress: dto.contractAddress,
      history: [entry],
    }
    await docRef.set(newDoc)
  }

  // --- Notifikasi dengan payload tambahan ---
  await notifyWithAdmins(dto.account, {
    type: 'agreement',
    title: `Contract Action: ${dto.action}`,
    message: `Contract ${dto.contractAddress} has a new action "${dto.action}" by ${dto.account}.`,
    data: {
      contractAddress: dto.contractAddress,
      action: dto.action,
      txHash: dto.txHash,
    },
  })

  return entry
}

export const getAllContracts = async () => {
  const snapshot = await collection.get()
  return snapshot.docs.map((doc) => doc.id)
}

export const getContractById = async (address: string) => {
  const doc = await collection.doc(address).get()
  return doc.exists ? doc.data() : null
}

export const getContractStepStatus = async (contractAddress: string) => {
  const doc = await collection.doc(contractAddress).get()
  if (!doc.exists) return null

  const data = doc.data() as ContractLogs
  const history: ContractLogEntry[] = data.history ?? []

  const stepStatus: Record<
    'deploy' | 'deposit' | 'approveImporter' | 'approveExporter' | 'finalize',
    boolean
  > = {
    deploy: false,
    deposit: false,
    approveImporter: false,
    approveExporter: false,
    finalize: false,
  }

  history.forEach((log) => {
    switch (log.action) {
      case 'deploy':
        stepStatus.deploy = true
        break
      case 'deposit':
        stepStatus.deposit = true
        break
      case 'approveImporter':
      case 'approve_importer':
        stepStatus.approveImporter = true
        break
      case 'approveExporter':
      case 'approve_exporter':
        stepStatus.approveExporter = true
        break
      case 'finalize':
        stepStatus.finalize = true
        break
      default:
        break
    }
  })

  return {
    stepStatus,
    lastAction: history[history.length - 1] ?? null,
  }
}
