#!/usr/bin/env node
/**
 * Deploy MockUSDC + ProofYieldVault on Creditcoin CC3 via ethers.
 * Prefer this over forge script — Foundry currently fails CC3 header validation (prevrandao).
 *
 * Usage (from repo root, with funded DEPLOYER_PRIVATE_KEY):
 *   node scripts/deploy-cc3.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { ethers } from "ethers";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const contracts = resolve(root, "contracts");
const mockArt = JSON.parse(readFileSync(resolve(contracts, "out/MockUSDC.sol/MockUSDC.json"), "utf8"));
const vaultArt = JSON.parse(
  readFileSync(resolve(contracts, "out/ProofYieldVault.sol/ProofYieldVault.json"), "utf8"),
);

const pk = process.env.DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("DEPLOYER_PRIVATE_KEY unset");
  process.exit(1);
}

const rpc = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network";
const source = process.env.SEPOLIA_RWA_SOURCE;
const provider = new ethers.JsonRpcProvider(rpc, 102031);
const wallet = new ethers.Wallet(pk, provider);
const harvester = process.env.HARVESTER_ADDRESS || wallet.address;

const bal = await provider.getBalance(wallet.address);
console.log(
  JSON.stringify(
    { deployer: wallet.address, balanceWei: bal.toString(), source, harvester },
    null,
    2,
  ),
);
if (bal === 0n) {
  console.error(
    "NO_CC3_BALANCE — Discord faucet: /faucet address:" + wallet.address + " in #token-faucet",
  );
  process.exit(2);
}

const Mock = new ethers.ContractFactory(mockArt.abi, mockArt.bytecode.object, wallet);
console.log("Deploying MockUSDC…");
const asset = await Mock.deploy();
await asset.waitForDeployment();
const assetAddr = await asset.getAddress();
console.log("MockUSDC", assetAddr);

console.log("Seeding 10M pyUSD to deployer…");
await (await asset.mint(wallet.address, 10_000_000n * 1_000_000n)).wait();

const Vault = new ethers.ContractFactory(vaultArt.abi, vaultArt.bytecode.object, wallet);
console.log("Deploying ProofYieldVault…");
const vault = await Vault.deploy(assetAddr);
await vault.waitForDeployment();
const vaultAddr = await vault.getAddress();
console.log("ProofYieldVault", vaultAddr);

await (await asset.setMinter(vaultAddr, true)).wait();
if (source && source !== ethers.ZeroAddress) {
  await (await vault.setSourceYieldContract(source)).wait();
}
await (await vault.setHarvester(harvester)).wait();
if (harvester.toLowerCase() !== wallet.address.toLowerCase()) {
  await (await asset.setMinter(harvester, true)).wait();
}

const out = { asset: assetAddr, vault: vaultAddr, harvester, source: source || null };
console.log(JSON.stringify(out, null, 2));

// Persist deployments/testnet.json
const depPath = resolve(root, "deployments/testnet.json");
const dep = JSON.parse(readFileSync(depPath, "utf8"));
dep.creditcoin.asset = assetAddr;
dep.creditcoin.vault = vaultAddr;
if (source) dep.sepolia.rwaSource = source;
dep.updatedAt = new Date().toISOString();
writeFileSync(depPath, JSON.stringify(dep, null, 2) + "\n");
console.log("Updated", depPath);

console.log("\n# Set in .env / Railway:");
console.log(`CREDITCOIN_ASSET=${assetAddr}`);
console.log(`CREDITCOIN_VAULT=${vaultAddr}`);
console.log("PROOFYIELD_MODE=live");
