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
    const _exporter = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    const _amount = parseEther('0.01');

    // --- Deploy contract (mengembalikan hash transaksi)
    const txHash = await walletClient.deployContract({
      abi,
      bytecode,
      account: walletClient.account,
      args: [_exporter, _amount],
      value: _amount,
      gas: 2_000_000n,
    });

    console.log('Deployment tx hash:', txHash);

    // --- Tunggu receipt untuk mendapatkan contractAddress
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log('Contract deployed at:', receipt.contractAddress);

  } catch (err) {
    console.error('Deployment error:', err);
  }
}

main();
