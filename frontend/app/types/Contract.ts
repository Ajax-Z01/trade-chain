import type { OnChainInfo } from './Info'

export interface ContractLogEntry {
  action: string
  txHash?: string
  account: string
  exporter?: string
  importer?: string
  requiredAmount?: string
  contractAddress?: string
  extra?: any
  timestamp: number
  onChainInfo?: OnChainInfo
}

export interface ContractLogs {
  contractAddress: string
  history: ContractLogEntry[]
}

export type ContractLogPayload = Omit<ContractLogEntry, 'timestamp'>
