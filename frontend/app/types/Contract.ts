export interface OnChainInfo {
  status: string | number
  blockNumber?: number
  confirmations?: number
}

export interface ContractLogEntry {
  action: string
  txHash?: string
  account: string
  exporter?: string
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
