import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { createPublicClient, http } from 'viem';
import { Chain } from '../config/chain.js';
import ContractLogDTO from '../dtos/contractDTO.js';
import { db } from '../config/firebase.js'

const collection = db.collection('contractLogs');

// Public client untuk optional verifikasi
const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
});

// --- Firestore log helper ---
export const addContractLog = async (data: Partial<ContractLogDTO>) => {
  const dto = new ContractLogDTO(data as any);
  dto.validate();

  const docRef = collection.doc(dto.contractAddress);
  const doc = await docRef.get();

  if (doc.exists) {
    await docRef.update({
      history: admin.firestore.FieldValue.arrayUnion(dto.toJSON()),
    });
  } else {
    await docRef.set({ contractAddress: dto.contractAddress, history: [dto.toJSON()] });
  }
};

// --- Controller Endpoints ---

// GET /contracts
export const fetchDeployedContracts = async (_req: Request, res: Response) => {
  try {
    const snapshot = await collection.get();
    const contracts = snapshot.docs.map((doc) => doc.id);
    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// POST /contracts/log
export const logContractAction = async (req: Request, res: Response) => {
  try {
    const { contractAddress, action, txHash, account, extra, verifyOnChain } = req.body;
    if (!contractAddress || !action || !txHash || !account) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let onChainInfo: { status: string | number; blockNumber?: number; confirmations?: number } | undefined;

    if (verifyOnChain) {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        let confirmations: number | undefined;
        let blockNumber: number | undefined;

        if (receipt?.blockNumber != null) {
          blockNumber = Number(receipt.blockNumber);
          const latestBlock = await publicClient.getBlockNumber();
          confirmations = Number(latestBlock - receipt.blockNumber + 1n);
        }

        onChainInfo = {
          status: receipt?.status ?? 'unknown',
          blockNumber,
          confirmations,
        };
      } catch (err) {
        console.warn('Failed to verify on-chain:', err);
      }
    }

    const dto = new ContractLogDTO({
      contractAddress,
      action,
      txHash,
      account,
      extra,
      timestamp: Date.now(),
      onChainInfo,
    });
    dto.validate();

    await addContractLog(dto);
    res.json({ success: true, log: dto.toJSON() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET /contracts/:address/details
export const getContractDetails = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const doc = await collection.doc(address).get();
    if (!doc.exists) return res.status(404).json({ error: 'Contract not found' });

    const log = doc.data();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
