export interface ActivityLog {
  timestamp: number
  type: 'onChain' | 'backend'
  action: string
  account: string
  txHash?: string
  extra?: Record<string, any>;
  onChainInfo?: {
    status: string
    blockNumber: number
    confirmations: number
  }
}
