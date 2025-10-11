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

export interface ContractState {
  name?: string
  isOpen: boolean
  history: ContractLogEntry[]
  loading: boolean
  finished: boolean
  lastTimestamp?: number
  role?: 'Importer' | 'Exporter' | 'Guest'
  documentCount?: number
}

export interface ContractDetails {
  id: string
  contractAddress: `0x${string}`
  importer: string
  exporter: string
  amount: string
  logs?: any
  [key: string]: any
}

export interface MyContractData {
  contractAddress: string
  history: ContractLogEntry[]
  role?: 'Importer' | 'Exporter' | 'Guest'
}
