import { createWalletClient, http, type Chain, parseEther } from 'viem';
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

// --- Wallet client
const walletClient = createWalletClient({
  chain: localChain,
  transport: http(localChain.rpcUrls.default.http[0]),
  account: privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  ),
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
    const _exporter = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // ganti dengan address exporter
    const _amount = parseEther('0.01');

    // --- Deploy contract
    const address = await walletClient.deployContract({
      abi,
      bytecode,
      account: walletClient.account,
      args: [_exporter, _amount],
      value: _amount,   // kontrak dapat ETH untuk payout
      gas: 2_000_000n,
    });

    console.log('Contract deployed at:', address);
  } catch (err) {
    console.error('Deployment error:', err);
  }
}

main();
