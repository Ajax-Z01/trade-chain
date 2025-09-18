import { test, expect } from '@playwright/test'
import { makeWalletClient, deployFixtureContracts, mintDocument } from './fixture-chain'

let walletClient: Awaited<ReturnType<typeof makeWalletClient>>
let contracts: Awaited<ReturnType<typeof deployFixtureContracts>>

test.beforeAll(async () => {
  walletClient = await makeWalletClient()
  contracts = await deployFixtureContracts(walletClient)
})

test('Negative path: fail to mint with zero address', async () => {
  const to = '0x0000000000000000000000000000000000000000' as `0x${string}`
  const fileHash = 'QmTestFileHash123'
  const metadataUrl = 'https://example.com/metadata.json'

  await expect(
    mintDocument(
      walletClient,
      contracts.kycRegistryAddress,
      to,
      fileHash,
      metadataUrl
    )
  ).rejects.toThrow(/Recipient not verified|invalid address/i)
})
