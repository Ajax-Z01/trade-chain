import { OnChainInfo } from './Info.js'

export interface ContractLogEntry {
  action: string
  txHash: string
  account: string
  exporter?: string
  importer?: string
  requiredAmount?: string
  extra?: any
  timestamp: number
  onChainInfo?: OnChainInfo
}

export interface ContractLogs {
  contractAddress: string
  history: ContractLogEntry[]
}
