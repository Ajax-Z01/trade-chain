import { test, expect } from '@playwright/test'
import { 
  makeWalletImporter,
  makeWalleExporter,
  deployFixtureContracts,
  addMinterKYC,
  mintKYC,
  addMinterDocument,
  mintAndLinkDocument,
  publicClient,
  mintUSDC
} from './fixture-chain'
import {
  deployAgreement,
  signAgreement,
  depositAgreement,
  startShipping,
  completeAgreement,
} from './fixture-tradeAgreement'

let walletImporter: Awaited<ReturnType<typeof makeWalletImporter>>
let walletExporter: Awaited<ReturnType<typeof makeWalleExporter>>
let contracts: Awaited<ReturnType<typeof deployFixtureContracts>>

test.beforeAll(async () => {
  walletImporter = await makeWalletImporter()
  walletExporter = await makeWalleExporter()
  contracts = await deployFixtureContracts(walletImporter)

  // Add minter role to both wallets
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletImporter.account!.address)
  await addMinterKYC(walletImporter, contracts.kycRegistryAddress, walletExporter.account!.address)
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletImporter.account!.address)
  await addMinterDocument(walletImporter, contracts.documentRegistryAddress, walletExporter.account!.address)

  await mintUSDC(walletImporter, contracts.mockUSDCAddress, walletImporter.account!.address, 1_000_000n)
})

test('Happy path: full trade agreement flow with document linking', async () => {
  const importerAddress = walletImporter.account!.address as `0x${string}`
  const exporterAddress = walletExporter.account!.address as `0x${string}`

  // --- Mint KYC documents ---
  const txHashImporter = await mintKYC(walletImporter, contracts.kycRegistryAddress, importerAddress, 'QmImporter123', 'https://example.com/metadata.json')
  const receiptImporter = await publicClient.waitForTransactionReceipt({ hash: txHashImporter })
  expect(receiptImporter.status).toBe('success')

  const txHashExporter = await mintKYC(walletExporter, contracts.kycRegistryAddress, exporterAddress, 'QmExporter456', 'https://example.com/metadata.json')
  const receiptExporter = await publicClient.waitForTransactionReceipt({ hash: txHashExporter })
  expect(receiptExporter.status).toBe('success')

  // --- Deploy trade agreement ---
  const requiredAmount = 1000n
  const importerDocId = 1n
  const exporterDocId = 2n

  const agreementAddress = await deployAgreement(
    walletImporter,
    contracts.factoryAddress,
    importerAddress,
    exporterAddress,
    requiredAmount,
    importerDocId,
    exporterDocId,
    contracts.mockUSDCAddress
  )
  expect(agreementAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)

  // --- Mint & link trade documents ---
  const { tokenId: importerTokenId } = await mintAndLinkDocument(
    walletImporter,
    contracts.documentRegistryAddress,
    importerAddress,
    agreementAddress,
    'QmImporterDoc',
    'https://example.com/importerDoc.json',
    'Invoice'
  )
  expect(importerTokenId).toBe(1n)
  
  const { tokenId: exporterTokenId } = await mintAndLinkDocument(
    walletExporter,
    contracts.documentRegistryAddress,
    exporterAddress,
    agreementAddress,
    'QmExporterDoc',
    'https://example.com/exporterDoc.json',
    'Invoice'
  )
  expect(exporterTokenId).toBe(2n)

  // --- Both parties sign ---
  const hashSignImporter = await signAgreement(walletImporter, agreementAddress)
  const receiptSignImporter = await publicClient.waitForTransactionReceipt({ hash: hashSignImporter })
  expect(receiptSignImporter.status).toBe('success')

  const hashSignExporter = await signAgreement(walletExporter, agreementAddress)
  const receiptSignExporter = await publicClient.waitForTransactionReceipt({ hash: hashSignExporter })
  expect(receiptSignExporter.status).toBe('success')

  // --- Deposit by importer ---
  const hashDeposit = await depositAgreement(walletImporter, agreementAddress, 1000n, contracts.mockUSDCAddress)
  const receiptDeposit = await publicClient.waitForTransactionReceipt({ hash: hashDeposit })
  expect(receiptDeposit.status).toBe('success')

  // --- Start shipping ---
  const hashShipping = await startShipping(walletExporter, agreementAddress)
  const receiptShipping = await publicClient.waitForTransactionReceipt({ hash: hashShipping })
  expect(receiptShipping.status).toBe('success')

  // --- Complete agreement ---
  const hashComplete = await completeAgreement(walletImporter, agreementAddress)
  const receiptComplete = await publicClient.waitForTransactionReceipt({ hash: hashComplete })
  expect(receiptComplete.status).toBe('success')
})
