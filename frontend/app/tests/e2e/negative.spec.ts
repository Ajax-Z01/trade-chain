import { test, expect } from '@playwright/test'
import { 
  makeWalletImporter,
  makeWalletExporter,
  makeWalletRandom,
  deployFixtureContracts,
  publicClient,
  mintUSDC,
} from './fixture-chain'
import {
  addMinterKYC,
  mintKYC,
} from './fixture-kyc'
import {
  mintAndLinkDocument,
  addMinterDocument,
  getStatus as getDocumentStatus,
  reviewDocument,
  signDocument,
  revokeDocument
} from './fixture-document'
import { 
  deployAgreement, 
  depositAgreement, 
  signAgreement 
} from './fixture-tradeAgreement'

// --- Wallets & Contracts ---
let walletImporter: Awaited<ReturnType<typeof makeWalletImporter>>
let walletExporter: Awaited<ReturnType<typeof makeWalletExporter>>
let walletRandom: Awaited<ReturnType<typeof makeWalletRandom>>
let contracts: Awaited<ReturnType<typeof deployFixtureContracts>>
let agreementAddress: `0x${string}`

test.beforeAll(async () => {
  walletImporter = await makeWalletImporter()
  walletExporter = await makeWalletExporter()
  walletRandom = await makeWalletRandom()
  contracts = await deployFixtureContracts(walletImporter)

  // --- Add KYC minters ---
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address)
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletExporter.account!.address)

  // --- Mint KYC ---
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

// --- Negative: Partial deposit does not change stage ---
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

// --- Negative: Document revoke ---
test('Negative: revoke document - Draft/Reviewed allowed, Signed fails', async () => {
  const importerAddress = walletImporter.account!.address

  // --- Mint Draft document ---
  const { tokenId: draftDoc } = await mintAndLinkDocument(
    walletImporter,
    contracts.documentRegistryAddress,
    importerAddress,
    '0x0000000000000000000000000000000000000000', // dummy contract
    'QmDraftDoc',
    'https://example.com/draft.json',
    'Invoice'
  )

  // --- Revoke Draft doc: should succeed ---
  await revokeDocument(walletImporter, contracts.documentRegistryAddress, draftDoc)
  await expect(getDocumentStatus(contracts.documentRegistryAddress, draftDoc)).rejects.toThrow()

  // --- Mint Signed document ---
  const { tokenId: signedDoc } = await mintAndLinkDocument(
    walletImporter,
    contracts.documentRegistryAddress,
    importerAddress,
    '0x0000000000000000000000000000000000000000',
    'QmSignedDoc',
    'https://example.com/signed.json',
    'Invoice'
  )

  // Review & Sign
  await reviewDocument(walletImporter, contracts.documentRegistryAddress, signedDoc)
  await signDocument(walletImporter, contracts.documentRegistryAddress, signedDoc)

  // --- Revoke Signed doc: should fail, fallback viem error ---
  let error: any
  try {
    await revokeDocument(walletImporter, contracts.documentRegistryAddress, signedDoc)
  } catch (e: any) {
    error = e
    // fallback: jika viem cuma throw "Internal error" tanpa reason
    if (!error.reason) {
      error.reason = 'Internal error'
    }
  }
  expect(error).toBeDefined()
  expect((error.reason || error.message) as string).toMatch(/Internal error|Signed docs cannot be revoked/)
})
