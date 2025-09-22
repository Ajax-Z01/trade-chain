import type { OnChainInfo } from './Info';

export interface KYC {
  tokenId: string
  owner: string
  fileHash: string
  metadataUrl: string
  documentUrl?: string
  name?: string
  description?: string
  txHash?: string
  createdAt: number
  updatedAt?: number
}

export interface KYCLogEntry {
  action: 
    | 'mintKYC'
    | 'reviewKYC'
    | 'signKYC'
    | 'revokeKYC';
  txHash: string;
  account: string;
  extra?: any;
  timestamp: number;
  onChainInfo?: OnChainInfo;
}

export interface KYCLogs {
  tokenId: number;
  history: KYCLogEntry[];
}
