import { OnChainInfo } from './Info.js';

export type KYCStatus = 'Draft' | 'Reviewed' | 'Signed' | 'Revoked';

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
  status: KYCStatus;
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
