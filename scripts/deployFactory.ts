import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createWalletClient, createPublicClient, http } from 'viem'

// --- Fix __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- Load artifact
const artifactPath = path.resolve(
  __dirname,
  '../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
)
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
const { abi, bytecode } = artifact

// --- Setup chain
const chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
}

// --- Public & Wallet clients
const publicClient = createPublicClient({
  chain,
  transport: http('http://127.0.0.1:8545'),
})

const walletClient = createWalletClient({
  chain,
  transport: http('http://127.0.0.1:8545'),
})

// --- Deploy factory
async function deployFactory() {
  const [deployer] = await walletClient.getAddresses()

  const txHash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    account: deployer,
    args: [],
    chain,
    gas: 2_000_000n,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  console.log('Factory deployed at:', receipt.contractAddress)
  return receipt.contractAddress
}

deployFactory().catch(console.error)
