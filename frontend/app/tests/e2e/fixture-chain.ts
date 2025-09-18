import { createWalletClient, createPublicClient, http, type WalletClient } from 'viem'
import kycRegistryArtifact from '../../../../artifacts/contracts/KYCRegistry.sol/KYCRegistry.json' assert { type: 'json' }
import documentRegistryArtifact from '../../../../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json' assert { type: 'json' }
import factoryArtifact from '../../../../artifacts/contracts/TradeAgreementFactory.sol/TradeAgreementFactory.json' assert { type: 'json' }
import mockUSDCArtifact from '../../../../artifacts/contracts/MockUSDC.sol/MintableUSDC.json' assert { type: 'json' }

const Chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
}

export const kycRegistryAbi = kycRegistryArtifact.abi
export const documentRegistryAbi = documentRegistryArtifact.abi
export const factoryAbi = factoryArtifact.abi
export const mockUSDCAbi = mockUSDCArtifact.abi

export const publicClient = createPublicClient({
  chain: Chain,
  transport: http(Chain.rpcUrls.default.http[0]),
})

export async function makeWalletClient(): Promise<WalletClient> {
  const privKey = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' as `0x${string}`
  return createWalletClient({
    account: privKey,
    chain: Chain,
    transport: http(Chain.rpcUrls.default.http[0]),
  })
}

export async function deployFixtureContracts(walletClient: WalletClient) {
  // --- Deploy KYCRegistry ---
  const kycTxHash = await walletClient.deployContract({
    account: walletClient.account!.address,
    chain: Chain,
    abi: kycRegistryAbi,
    bytecode: kycRegistryArtifact.bytecode as `0x${string}`,
    args: [walletClient.account!.address]
  })
  const kycReceipt = await publicClient.waitForTransactionReceipt({ hash: kycTxHash })
  const kycRegistryAddress = kycReceipt.contractAddress!

  // --- Deploy TradeAgreementFactory ---
  const factoryTxHash = await walletClient.deployContract({
    account: walletClient.account!.address,
    chain: Chain,
    abi: factoryAbi,
    bytecode: factoryArtifact.bytecode as `0x${string}`,
    args: [kycRegistryAddress]
  })
  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryTxHash })
  const factoryAddress = factoryReceipt.contractAddress!

  // --- Deploy DocumentRegistry ---
  const documentTxHash = await walletClient.deployContract({
    account: walletClient.account!.address,
    chain: Chain,
    abi: documentRegistryAbi,
    bytecode: documentRegistryArtifact.bytecode as `0x${string}`,
    args: [walletClient.account!.address],
    gas: 5_000_000n,
  })
  const documentReceipt = await publicClient.waitForTransactionReceipt({ hash: documentTxHash })
  const documentRegistryAddress = documentReceipt.contractAddress!

  // --- Deploy MockUSDC ---
  const usdcTxHash = await walletClient.deployContract({
    account: walletClient.account!.address,
    chain: Chain,
    abi: mockUSDCAbi,
    bytecode: mockUSDCArtifact.bytecode as `0x${string}`
  })
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcTxHash })
  const mockUSDCAddress = usdcReceipt.contractAddress!

  return { kycRegistryAddress, factoryAddress, documentRegistryAddress, mockUSDCAddress }
}

export async function addMinter(
  walletClient: WalletClient,
  registryAddress: `0x${string}`,
  minter: `0x${string}`
) {
  const txHash = await walletClient.writeContract({
    account: walletClient.account!.address,
    chain: Chain,
    address: registryAddress,
    abi: kycRegistryAbi,
    functionName: 'addMinter',
    args: [minter],
  })
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}

export async function mintDocument(
  walletClient: WalletClient,
  kycRegistryAddress: `0x${string}`,
  to: `0x${string}`,
  fileHash: string,
  metadataUrl: string
): Promise<`0x${string}`> {
  // 1. Cek minter / verified
  const isMinter = await publicClient.readContract({
    address: kycRegistryAddress,
    abi: kycRegistryAbi,
    functionName: 'isMinter',
    args: [to],
  })
  if (!isMinter) throw new Error('Recipient not verified in KYC Registry')

  // 2. Mint document
  const txHash = await walletClient.writeContract({
    account: walletClient.account!.address as `0x${string}`,
    chain: Chain,
    address: kycRegistryAddress,
    abi: kycRegistryAbi,
    functionName: 'verifyAndMint',
    args: [to, fileHash, metadataUrl],
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}
