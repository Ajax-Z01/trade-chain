import { useWallet } from './useWallets'
import { createPublicClient, http } from 'viem'
import tradeAgreementArtifact from '../../../artifacts/contracts/TradeAgreement.sol/TradeAgreement.json'
import factoryArtifact from '../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json'
import { Chain } from '../config/chain'

// --- Safe parsers ---
function safeParseHex(value: unknown): `0x${string}` | null {
  if (typeof value === 'string' && value.startsWith('0x')) return value as `0x${string}`
  return null
}

function safeParseBigInt(value: unknown): bigint | null {
  try {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      return BigInt(value)
    }
  } catch {}
  return null
}

// --- Client setup ---
const publicClient = createPublicClient({
  chain: Chain,
  transport: http('http://127.0.0.1:8545'),
})

const factoryAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as `0x${string}`
const factoryAbiFull = factoryArtifact.abi
const tradeAgreementAbi = tradeAgreementArtifact.abi

// --- Wallet logs ---
export async function getWalletLogs() {
  const { $apiBase } = useNuxtApp()
  const { account } = useWallet()
  if (!account.value) return []

  try {
    const res = await fetch(`${$apiBase}/wallet/${account.value}/logs`)
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('Error fetching wallet logs:', err)
    return []
  }
}

// --- Get all contracts ---
export async function getContractLogs() {
  const { $apiBase } = useNuxtApp()
  let backendLogs: any[] = []
  let chainContracts: `0x${string}`[] = []

  // Backend logs
  try {
    const res = await fetch(`${$apiBase}/contract/`)
    if (res.ok) {
      const data = await res.json()
      backendLogs = Array.isArray(data) ? data : []
    }
  } catch (err) {
    console.error('Error fetching backend contract logs:', err)
  }

  // Chain contracts
  try {
    const contracts = await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbiFull,
      functionName: 'getDeployedContracts',
    })
    chainContracts = contracts as `0x${string}`[]
  } catch (err) {
    console.error('Error fetching chain contracts:', err)
  }

  return { backendLogs, chainContracts }
}

// --- Get contract logs by address ---
export async function getContractLogsByAddress(contractAddress: `0x${string}`) {
  const { $apiBase } = useNuxtApp()
  let backendLogs: any[] = []
  let chainState: any = {}

  if (!contractAddress) return { backendLogs, chainState }

  // --- Backend logs ---
  try {
    const res = await fetch(`${$apiBase}/contract/${contractAddress}/details`)
    if (res.ok) {
      const data = await res.json()
      backendLogs = Array.isArray(data.history)
        ? data.history.map((log: any) => ({
            ...log,
            contractAddress: parseHex(data.contractAddress),
            requiredAmount: log.extra?.requiredAmount
              ? parseBigInt(log.extra.requiredAmount)
              : undefined,
            account: parseHex(log.account),
          }))
        : []
      console.log(`Backend logs for ${contractAddress}:`, backendLogs)
    }
  } catch (err) {
    console.error(`Error fetching backend logs for ${contractAddress}:`, err)
  }

  // --- Chain state ---
  try {
    const [importer, exporter, requiredAmount] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'importer',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'exporter',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: tradeAgreementAbi,
        functionName: 'requiredAmount',
      }),
    ])

    chainState = {
      importer: parseHex(importer),
      exporter: parseHex(exporter),
      requiredAmount: parseBigInt(requiredAmount),
    }
    console.log(`Chain state for ${contractAddress}:`, chainState)
  } catch (err) {
    console.error(`Error fetching chain state for ${contractAddress}:`, err)
  }

  return { backendLogs, chainState }
}
