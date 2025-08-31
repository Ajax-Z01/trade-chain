import {
  createWalletClient,
  createPublicClient,
  http,
  type Chain,
  parseEther,
} from 'viem';
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

// --- Wallet & Public client
const walletClient = createWalletClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
  account: privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  ),
});
const publicClient = createPublicClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
});

// --- Load artifacts
const loadArtifact = (fileName: string) => {
  const artifactPath = path.resolve(__dirname, `../artifacts/contracts/${fileName}.sol/${fileName}.json`);
  return JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
};

const registryArtifact = loadArtifact('DocumentRegistry');
const factoryArtifact = loadArtifact('TradeAgreementFactory');
const agreementArtifact = loadArtifact('TradeAgreement');

async function main() {
  try {
    const [importerSigner, exporterSigner] = [walletClient.account.address, '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'];

    // ------------------------
    // 1️⃣ Deploy DocumentRegistry
    // ------------------------
    console.log('Deploying DocumentRegistry...');
    const registryTxHash = await walletClient.deployContract({
      abi: registryArtifact.abi,
      bytecode: registryArtifact.bytecode,
      account: walletClient.account,
      args: [walletClient.account.address], // initialOwner
      gas: 3_000_000n,
    });
    const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryTxHash });
    const registryAddress = registryReceipt.contractAddress;
    console.log('DocumentRegistry deployed at:', registryAddress);

    // ------------------------
    // 2️⃣ Mint NFT untuk importer & exporter
    // ------------------------
    console.log('Minting NFT for importer...');
    const importerMintTx = await walletClient.writeContract({
      address: registryAddress as `0x${string}`,
      abi: registryArtifact.abi,
      functionName: 'verifyAndMint',
      account: walletClient.account,
      args: [importerSigner, 'QmImporterDocHash', 'ipfs://importer-metadata'],
      gas: 2_000_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash: importerMintTx });
    const importerDocId = 1n;

    console.log('Minting NFT for exporter...');
    const exporterMintTx = await walletClient.writeContract({
      address: registryAddress as `0x${string}`,
      abi: registryArtifact.abi,
      functionName: 'verifyAndMint',
      account: walletClient.account,
      args: [exporterSigner, 'QmExporterDocHash', 'ipfs://exporter-metadata'],
      gas: 2_000_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash: exporterMintTx });
    const exporterDocId = 2n;

    console.log('NFTs minted:', { importerDocId, exporterDocId });

    // ------------------------
    // 3️⃣ Deploy TradeAgreementFactory
    // ------------------------
    console.log('Deploying TradeAgreementFactory...');
    const factoryTxHash = await walletClient.deployContract({
      abi: factoryArtifact.abi,
      bytecode: factoryArtifact.bytecode,
      account: walletClient.account,
      args: [registryAddress], // pass registry
      gas: 3_000_000n,
    });
    const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryTxHash });
    const factoryAddress = factoryReceipt.contractAddress;
    console.log('TradeAgreementFactory deployed at:', factoryAddress);

    // ------------------------
    // 4️⃣ Deploy TradeAgreement via Factory
    // ------------------------
    console.log('Deploying TradeAgreement via Factory...');
    const deployTx = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: 'deployTradeAgreement',
      account: walletClient.account,
      args: [
        importerSigner,
        exporterSigner,
        parseEther('0.01'),
        importerDocId,
        exporterDocId,
      ],
      gas: 3_000_000n,
    });
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTx });
    console.log('TradeAgreement deployed via Factory, receipt:', deployReceipt);

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
