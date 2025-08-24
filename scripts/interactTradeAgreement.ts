import { createWalletClient, createPublicClient, http, type Chain, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Local chain
const localChain: Chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
};

// --- Accounts
const importerPK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0
const exporterPK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account #1

const importerClient = createWalletClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
  account: privateKeyToAccount(importerPK),
});

const exporterClient = createWalletClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
  account: privateKeyToAccount(exporterPK),
});

const publicClient = createPublicClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
});

// --- Load artifact
const artifactPath = path.resolve(
  __dirname,
  '../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
const abi = artifact.abi;
const bytecode = artifact.bytecode;

async function main() {
  try {
    const amount = parseEther('0.01');

    // --- 1. Deploy contract
    const txHash = await importerClient.deployContract({
    abi,
    bytecode,
    account: importerClient.account,
    args: [exporterClient.account.address, amount],
    value: amount,
    gas: 2_000_000n,
    });

    // 2. Tunggu receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // 3. Ambil contract address
    const contractAddress = receipt.contractAddress!;
    console.log('Contract deployed at:', contractAddress);

    // --- 2. Read initial state
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
    console.log('Initial agreement state:');
    console.log('Importer:', importer);
    console.log('Exporter:', exporter);

    // --- 3. Approve as importer
    console.log('\nApproving as importer...');
    await importerClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'approveAsImporter',
      args: [],
    });

    // --- 4. Approve as exporter
    console.log('Approving as exporter...');
    await exporterClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'approveAsExporter',
      args: [],
    });

    // --- 5. Finalize
    console.log('Finalizing agreement...');
    await importerClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'finalize',
      args: [],
    });

    // --- 6. Read final state
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
    console.log('Final state:');
    console.log('Importer Approved:', importerApproved);
    console.log('Exporter Approved:', exporterApproved);
  } catch (err) {
    console.error('Error in TradeAgreement flow:', err);
  }
}

main();
