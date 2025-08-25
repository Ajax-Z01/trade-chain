import { ref } from 'vue'
import { useWallet } from './useWallets'
import { createPublicClient, http, decodeEventLog } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'

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

const factoryAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi

export function useContractActions() {
  const { account, walletClient } = useWallet()

  const fetchDeployedContracts = async () => {
    if (!account.value) return
    try {
      const contracts = await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbiFull,
        functionName: 'getDeployedContracts',
        args: [],
      })
      deployedContracts.value = contracts as `0x${string}`[]
    } catch (err) {
      console.error(err)
      deployedContracts.value = []
    }
  }

  // --- Deploy kontrak tanpa ETH
  const deployContract = async (exporter: string) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')

    const txHash = await walletClient.value.writeContract({
      address: factoryAddress,
      abi: factoryAbiFull,
      functionName: 'deployTradeAgreement',
      args: [exporter],
      account: account.value as `0x${string}`,
      chain: Chain,
      value: 0n,
    })
    console.log('[DEBUG] Transaction hash:', txHash)

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
    console.log('[DEBUG] Transaction receipt:', receipt)

    // --- Ambil event ContractDeployed
    const log = receipt.logs.find(
      l => l.topics[0] === '0x33c981baba081f8fd2c52ac6ad1ea95b6814b4376640f55689051f6584729688'
    )

    if (!log) throw new Error('ContractDeployed event not found')

    // topic[1] adalah address kontrak baru (indexed)
    let newContractAddress: `0x${string}` | undefined;

    if (log.topics && log.topics[1]) {
      newContractAddress = `0x${log.topics[1].slice(26)}` as `0x${string}`;
    } else {
      console.warn("No contract address found in log topics");
    }

    if (newContractAddress) {
      deployedContracts.value.push(newContractAddress)
      console.log('[DEBUG] New contract deployed at:', newContractAddress)
    }
    return newContractAddress
  }

  // --- Deposit ETH
  const depositToContract = async (contractAddress: `0x${string}`, amount: bigint) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: [
        {
          type: 'function',
          name: 'deposit',
          stateMutability: 'payable',
          inputs: [],
          outputs: [],
        },
      ],
      functionName: 'deposit',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
      value: amount,
    })
    return await publicClient.waitForTransactionReceipt({ hash: txHash })
  }

  // --- Approve & finalize
  const approveAsImporter = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error("Wallet not connected");

    console.log("[DEBUG] approveAsImporter called", { contractAddress, account: account.value });

    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: "approveAsImporter",
      args: [],
      account: account.value,
    });

    console.log("[DEBUG] txHash:", txHash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log("[DEBUG] receipt:", receipt);

    return receipt;
  };

  const approveAsExporter = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'approveAsExporter',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    return await publicClient.waitForTransactionReceipt({ hash: txHash })
  }

  const finalizeContract = async (contractAddress: `0x${string}`) => {
    if (!walletClient.value || !account.value) throw new Error('Wallet not connected')
    const txHash = await walletClient.value.writeContract({
      address: contractAddress,
      abi: tradeAgreementAbi,
      functionName: 'finalize',
      args: [],
      account: account.value as `0x${string}`,
      chain: Chain,
    })
    return await publicClient.waitForTransactionReceipt({ hash: txHash })
  }
  
  const getImporter = async (contractAddress: `0x${string}`) => {
    if (!account.value) return
    try {
      const importer = await publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'importer',
        args: [],
      })
      console.log('Importer address:', importer)
      return importer as `0x${string}`
    } catch (err) {
      console.error('Failed to read importer:', err)
    }
  }

  return {
    deployedContracts,
    fetchDeployedContracts,
    deployContract,
    depositToContract,
    approveAsImporter,
    approveAsExporter,
    finalizeContract,
    getImporter,
  }
}
