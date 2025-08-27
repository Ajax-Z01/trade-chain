import { ContractLogEntry } from '../types/Contract.js';

export default class ContractLogDTO {
  contractAddress!: string;
  action!: string;
  txHash!: string;
  account!: string;
  extra?: any;

  constructor(data: Partial<ContractLogEntry> & { contractAddress: string }) {
    Object.assign(this, data);
  }

  validate() {
    if (!this.contractAddress) throw new Error('contractAddress required');
    if (!this.action) throw new Error('action required');
    if (!this.txHash) throw new Error('txHash required');
    if (!this.account) throw new Error('account required');
  }

  toJSON(): ContractLogEntry {
    return {
      action: this.action,
      txHash: this.txHash,
      account: this.account,
      extra: this.extra,
      timestamp: Date.now(),
    };
  }
}
