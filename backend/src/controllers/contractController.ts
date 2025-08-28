import { Request, Response } from 'express';
import { createPublicClient, http } from 'viem';
import { Chain } from '../config/chain.js';
import ContractLogDTO from '../dtos/contractDTO.js';
import { addContractLog, getAllContracts, getContractById, getContractStepStatus } from '../models/contractModel.js';

// Public client untuk query blockchain
const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
});

// --- Helper verify on-chain ---
const verifyTransaction = async (txHash: string) => {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.blockNumber === undefined) return undefined;

    const latestBlock = await publicClient.getBlockNumber();
    return {
      status: receipt.status ?? 'unknown',
      blockNumber: Number(receipt.blockNumber),
      confirmations: Number(latestBlock - receipt.blockNumber + 1n),
    };
  } catch (err) {
    console.warn('Failed to verify on-chain:', err);
    return undefined;
  }
};

// GET /contracts
export const fetchDeployedContracts = async (_req: Request, res: Response) => {
  try {
    const contracts = await getAllContracts();
    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// POST /contracts/log
export const logContractAction = async (req: Request, res: Response) => {
  try {
    const {
      contractAddress,
      action,
      txHash,
      account,
      exporter,
      requiredAmount,
      extra,
      verifyOnChain,
    } = req.body;

    if (!contractAddress || !action || !txHash || !account) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let onChainInfo;
    if (verifyOnChain) {
      onChainInfo = await verifyTransaction(txHash);
    }

    const logExtra = {
      ...extra,
      ...(exporter ? { exporter } : {}),
      ...(requiredAmount ? { requiredAmount } : {}),
    };

    const dto = new ContractLogDTO({
      contractAddress,
      action,
      txHash,
      account,
      extra: logExtra,
      timestamp: Date.now(),
      onChainInfo,
    });

    const saved = await addContractLog(dto);
    res.json({ success: true, log: saved });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET /contracts/:address/details
export const getContractDetails = async (req: Request, res: Response) => {
  try {
    const contract = await getContractById(req.params.address);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET /contracts/:address/step
export const getContractStep = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await getContractStepStatus(address);
    if (!result) return res.status(404).json({ error: 'Contract not found' });
    res.json(result);
  } catch (err) {
    console.error('Fetch contract step error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};