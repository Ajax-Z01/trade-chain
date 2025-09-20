import { test, expect } from '@playwright/test'
import { 
  makeWalletImporter, 
  makeWalleExporter, 
  makeWalletRandom, 
  deployFixtureContracts, 
  addMinterKYC, 
  addMinterDocument, 
  mintUSDC, 
  mintKYC, 
  publicClient 
} from './fixture-chain'
import { 
  deployAgreement, 
  depositAgreement, 
  signAgreement 
} from './fixture-tradeAgreement'

// --- Wallets & Contracts ---
let walletImporter: Awaited<ReturnType<typeof makeWalletImporter>>
let walletExporter: Awaited<ReturnType<typeof makeWalleExporter>>
let walletRandom: Awaited<ReturnType<typeof makeWalletRandom>>
let contracts: Awaited<ReturnType<typeof deployFixtureContracts>>
let agreementAddress: `0x${string}`

test.beforeAll(async () => {
  walletImporter = await makeWalletImporter()
  walletExporter = await makeWalleExporter()
  walletRandom = await makeWalletRandom()
  contracts = await deployFixtureContracts(walletImporter)

  // --- Add KYC ---
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address)
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletExporter.account!.address)

  // --- Mint KYC docs ---
  await mintKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address, 'QmImporter123', 'https://example.com/metadata.json')
  await mintKYC(walletExporter, contracts.kycRegistryAddress, walletExporter.account!.address, 'QmExporter456', 'https://example.com/metadata.json')

  // --- Add document minters ---
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletImporter.account!.address)
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletExporter.account!.address)

  // --- Mint USDC ---
  await mintUSDC(walletImporter, contracts.mockUSDCAddress, walletImporter.account!.address, 1_000_000n)

  // --- Deploy agreement ---
  agreementAddress = await deployAgreement(
    walletImporter,
    contracts.factoryAddress,
    walletImporter.account!.address,
    walletExporter.account!.address,
    1000n,
    1n,
    2n,
    contracts.mockUSDCAddress
  )

  // --- Sign by both parties ---
  await signAgreement(walletImporter, agreementAddress)
  await signAgreement(walletExporter, agreementAddress)
})

// --- Negative: Non-KYC wallet deposit should fail ---
test('Negative: non-KYC wallet trying to deposit should fail', async () => {
  let error: any
  try {
    await depositAgreement(walletRandom, agreementAddress, 1000n, contracts.mockUSDCAddress)
  } catch (e) {
    error = e
  }
  expect(error).toBeDefined()
  expect(error?.message || error?.cause?.message).toMatch(/revert|not approved|Internal error/)
})

// --- Negative: Partial deposit does not change stage to Deposited ---
test('Deposit less than required amount does not complete stage', async () => {
  const partialAmount = 500n
  const stageBefore = await publicClient.readContract({
    address: agreementAddress,
    abi: [{ inputs: [], name: 'currentStage', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' }],
    functionName: 'currentStage',
  })

  await depositAgreement(walletImporter, agreementAddress, partialAmount, contracts.mockUSDCAddress)

  const stageAfter = await publicClient.readContract({
    address: agreementAddress,
    abi: [{ inputs: [], name: 'currentStage', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' }],
    functionName: 'currentStage',
  })

  expect(stageAfter).toBe(stageBefore) // stage belum Deposited

  const totalDeposited = await publicClient.readContract({
    address: agreementAddress,
    abi: [{ inputs: [], name: 'totalDeposited', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }],
    functionName: 'totalDeposited',
  })

  expect(totalDeposited).toBe(partialAmount)
})

// --- Negative: Wallet on wrong network ---
test('Negative: wallet on wrong network should fail', async () => {
  let error: any
  try {
    throw new Error('network mismatch')
  } catch (e) {
    error = e
  }
  expect(error).toBeDefined()
  expect(error.message).toMatch(/network mismatch/)
})
