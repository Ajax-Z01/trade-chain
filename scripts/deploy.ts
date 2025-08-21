import { createWalletClient, custom } from "viem";
import { http } from "viem";
import { hardhat } from "viem/chains";
import fs from "fs";
import path from "path";

// Ambil bytecode & ABI
const artifact = JSON.parse(
  fs.readFileSync(path.resolve("./artifacts/contracts/TradeAgreement.sol/TradeAgreement.json"), "utf-8")
);

async function main() {
  // Buat wallet client
  const client = createWalletClient({
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
    account: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  });

  const { abi, bytecode } = artifact;

  // Deploy contract
  const contract = await client.deployContract({
    abi,
    bytecode,
    args: ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"],
    chain: hardhat, // wajib di Viem v2+
  });

  console.log("Contract deployed at:", contract);
}

main().catch(console.error);
