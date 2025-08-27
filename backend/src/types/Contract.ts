export interface ContractLogEntry {
  action: string;
  txHash: string;
  account: string;
  extra?: any;
  timestamp: number;
  onChainInfo?: {
    status: string | number;
    blockNumber?: number;
    confirmations?: number;
  };
}

export interface ContractLogs {
  contractAddress: string;
  history: ContractLogEntry[];
}
