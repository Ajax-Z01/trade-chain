import { createClients } from './clients.js';
import { deployTradeAgreement, readState, approveAsImporter, approveAsExporter, finalizeAgreement } from './tradeAgreement.js';

const importerPK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const exporterPK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

async function main() {
  const { importerClient, exporterClient, publicClient } = createClients(importerPK, exporterPK);

  // Deploy
  const contractAddress = await deployTradeAgreement(
    importerClient,
    publicClient,
    exporterClient.account.address
  );
  console.log('Contract deployed at:', contractAddress);

  // Read state
  console.log('Initial state:', await readState(publicClient, contractAddress));

  // Approve
  await approveAsImporter(importerClient, contractAddress);
  await approveAsExporter(exporterClient, contractAddress);

  // Finalize
  await finalizeAgreement(importerClient, contractAddress);

  // Final state
  console.log('Final state:', await readState(publicClient, contractAddress));
}

main();
