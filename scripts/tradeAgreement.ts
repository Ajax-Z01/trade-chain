import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEther } from 'viem';
import type { WalletClient, PublicClient } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load ABI & bytecode
const artifactPath = path.resolve(
  __dirname,
  '../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
const { abi, bytecode } = artifact;

export const deployTradeAgreement = async (
  importerClient: WalletClient,
  publicClient: PublicClient,
  exporterAddress: string,
  amountETH = '0.01'
) => {
  const amount = parseEther(amountETH);

  const txHash = await importerClient.deployContract({
    abi,
    bytecode,
    account: importerClient.account!,
    chain: importerClient.chain,
    args: [exporterAddress, amount],
    value: amount,
    gas: 2_000_000n,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  return receipt.contractAddress!;
};

export const readState = async (publicClient: PublicClient, contractAddress: `0x${string}`) => {
  const importer = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'importer',
    args: [],
  });

  const exporter = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'exporter',
    args: [],
  });

  const importerApproved = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'importerApproved',
    args: [],
  });

  const exporterApproved = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'exporterApproved',
    args: [],
  });

  return { importer, exporter, importerApproved, exporterApproved };
};

export const approveAsImporter = async (
  importerClient: WalletClient,
  contractAddress: `0x${string}`
) =>
  importerClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'approveAsImporter',
    args: [],
    account: importerClient.account!,
    chain: importerClient.chain!,
  });

export const approveAsExporter = async (
  exporterClient: WalletClient,
  contractAddress: `0x${string}`
) =>
  exporterClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'approveAsExporter',
    args: [],
    account: exporterClient.account!,
    chain: exporterClient.chain!,
  });

export const finalizeAgreement = async (
  importerClient: WalletClient,
  contractAddress: `0x${string}`
) =>
  importerClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'finalize',
    args: [],
    account: importerClient.account!,
    chain: importerClient.chain!,
  });
