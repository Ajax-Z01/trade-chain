import type { OnChainInfo } from "./Info"

export interface KYC {
  tokenId: string
  owner: string
  fileHash: string
  metadataUrl: string
  documentUrl?: string
  name?: string
  description?: string
  createdAt: number
  updatedAt?: number
  txHash?: `0x${string}`
  history?: KYCLogEntry[]
}

export interface KYCLogEntry {
  action: 'mintKYC' | 'reviewKYC' | 'signKYC' | 'revokeKYC' | 'deleteKYC';
  txHash: string;
  account: string;
  executor?: string;
  extra?: any;
  timestamp: number;
  onChainInfo?: OnChainInfo;
}


export interface KYCLogs {
  tokenId: number;
  history: KYCLogEntry[];
}
