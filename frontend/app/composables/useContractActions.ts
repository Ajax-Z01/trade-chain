import { ref } from 'vue'
import { useWallet } from './useWallets'
import { createPublicClient, http } from 'viem'
import MyContract from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'

export const deployedContracts = ref<`0x${string}`[]>([])

const Chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
}

const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

// ABI lengkap sesuai kontrak
const contractAbi = [
  {
    type: 'constructor',
    stateMutability: 'payable',
    inputs: [
      { name: '_exporter', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
  },
  { type: 'function', name: 'approveAsImporter', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'approveAsExporter', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'finalize', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'amount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256', name: '' }] },
]

export async function deployContract(exporter: string, amount: bigint) {
  const { walletClient, account } = useWallet()
  if (!walletClient || !account.value) throw new Error('Wallet not connected')

  const bytecode: `0x${string}` = MyContract.bytecode.startsWith('0x')
    ? (MyContract.bytecode as `0x${string}`)
    : (`0x${MyContract.bytecode}` as `0x${string}`)

  const txHash = await walletClient.deployContract({
    account: account.value as `0x${string}`,
    abi: contractAbi,
    bytecode,
    args: [exporter, amount],
    value: amount,
    chain: Chain,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  deployedContracts.value.push(receipt.contractAddress as `0x${string}`)
  return receipt.contractAddress
}

export async function approveAsImporter(address: `0x${string}`) {
  const { walletClient, account } = useWallet()
  if (!walletClient || !account.value) return
  const txHash = await walletClient.writeContract({
    address,
    abi: contractAbi,
    functionName: 'approveAsImporter',
    args: [],
    account: account.value as `0x${string}`,
    chain: Chain,
  })
  return await publicClient.waitForTransactionReceipt({ hash: txHash })
}

export async function approveAsExporter(address: `0x${string}`) {
  const { walletClient, account } = useWallet()
  if (!walletClient || !account.value) return
  const txHash = await walletClient.writeContract({
    address,
    abi: contractAbi,
    functionName: 'approveAsExporter',
    args: [],
    account: account.value as `0x${string}`,
    chain: Chain,
  })
  return await publicClient.waitForTransactionReceipt({ hash: txHash })
}

export async function finalizeContract(address: `0x${string}`) {
  const { walletClient, account } = useWallet()
  if (!walletClient || !account.value) return
  const txHash = await walletClient.writeContract({
    address,
    abi: contractAbi,
    functionName: 'finalize',
    args: [],
    account: account.value as `0x${string}`,
    chain: Chain,
  })
  return await publicClient.waitForTransactionReceipt({ hash: txHash })
}
