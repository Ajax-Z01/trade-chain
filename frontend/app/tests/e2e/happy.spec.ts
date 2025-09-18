import { test, expect } from '@playwright/test'
import { makeWalletClient, deployFixtureContracts, addMinter, mintDocument, publicClient } from './fixture-chain'

let walletClient: Awaited<ReturnType<typeof makeWalletClient>>
let contracts: Awaited<ReturnType<typeof deployFixtureContracts>>

test.beforeAll(async () => {
  walletClient = await makeWalletClient()
  contracts = await deployFixtureContracts(walletClient)

  await addMinter(walletClient, contracts.kycRegistryAddress, walletClient.account!.address)
})

test('Happy path: mint document successfully', async () => {
  const to = walletClient.account!.address as `0x${string}`
  const fileHash = 'QmTestFileHash123'
  const metadataUrl = 'https://example.com/metadata.json'

  const txHash = await mintDocument(
    walletClient,
    contracts.kycRegistryAddress,
    to,
    fileHash,
    metadataUrl
  )

  const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
  expect(receipt.status).toBe('success')
})
