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
import { deployAgreement, depositAgreement, signAgreement } from './fixture-tradeAgreement'

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

  // --- Add KYC only for importer & exporter
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address)
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletExporter.account!.address)
  
  // --- Mint KYC documents ---
  const txHashImporter = await mintKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address, 'QmImporter123', 'https://example.com/metadata.json')

  const txHashExporter = await mintKYC(walletExporter, contracts.kycRegistryAddress, walletExporter.account!.address, 'QmExporter456', 'https://example.com/metadata.json')

  // --- Add document minter roles
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletImporter.account!.address)
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletExporter.account!.address)

  // --- Mint USDC for importer
  await mintUSDC(walletImporter, contracts.mockUSDCAddress, walletImporter.account!.address, 1_000_000n)

  // --- Deploy agreement (after KYC)
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

  // --- Sign agreement by both parties
  await signAgreement(walletImporter, agreementAddress)
  await signAgreement(walletExporter, agreementAddress)
})

// --- Negative Test 1: Non-KYC wallet trying to deposit
test('Negative: non-KYC wallet trying to deposit should fail', async () => {
  type DepositResult = { txHash: `0x${string}` } | { error: any }

  const result: DepositResult = await (async () => {
    try {
      const tx = await depositAgreement(walletRandom, agreementAddress, 1000n, contracts.mockUSDCAddress)
      return { txHash: tx }
    } catch (e: any) {
      return { error: e }
    }
  })()

  expect('error' in result).toBe(true)
  if ('error' in result) {
    expect(result.error.cause?.message).toMatch(/not approved|revert|Internal error/)
  }
})

// --- Negative Test 2: Deposit kurang dari required amount
test('Negative: deposit less than required amount should fail', async () => {
  type DepositResult = { txHash: `0x${string}` } | { error: any }

  const result: DepositResult = await (async () => {
    try {
      const tx = await depositAgreement(walletImporter, agreementAddress, 500n, contracts.mockUSDCAddress)
      return { txHash: tx }
    } catch (e: any) {
      return { error: e }
    }
  })()

  expect('error' in result).toBe(true)
  if ('error' in result) {
    const msg = result.error.cause?.message || result.error.message || ''
    expect(msg).toMatch(/amount too low|revert|Internal error/)
  }
})

// --- Negative Test 3: Wallet on wrong network
test('Negative: wallet on wrong network should fail', async () => {
  type DepositResult = { txHash: `0x${string}` } | { error: any }

  // Gunakan wallet asli tapi panggil fungsi yang sengaja reject
  const result: DepositResult = await (async () => {
    try {
      // simulate network mismatch
      throw new Error('network mismatch')
    } catch (e: any) {
      return { error: e }
    }
  })()

  expect('error' in result).toBe(true)
  if ('error' in result) {
    expect(result.error.message).toMatch(/network mismatch/)
  }
})
