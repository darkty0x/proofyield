#!/usr/bin/env node
/**
 * Merge deployed addresses into deployments/testnet.json and print .env lines.
 * Usage:
 *   node scripts/write-deployments.mjs \
 *     --source 0x... --vault 0x... --asset 0x...
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(root, "deployments/testnet.json");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const source = arg("source");
const vault = arg("vault");
const asset = arg("asset");

const data = JSON.parse(readFileSync(path, "utf8"));
if (source) {
  data.sepolia.rwaSource = source;
  data.sepolia.rwaSourceUrl = `https://sepolia.etherscan.io/address/${source}`;
}
if (vault) {
  data.creditcoin.vault = vault;
  data.creditcoin.vaultUrl = `https://creditcoin-testnet.blockscout.com/address/${vault}`;
}
if (asset) {
  data.creditcoin.asset = asset;
  data.creditcoin.assetUrl = `https://creditcoin-testnet.blockscout.com/address/${asset}`;
}
data.updatedAt = new Date().toISOString();

writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

console.log("Updated", path);
console.log("\n# Add to .env / Railway:");
if (data.sepolia.rwaSource) console.log(`SEPOLIA_RWA_SOURCE=${data.sepolia.rwaSource}`);
if (data.creditcoin.vault) console.log(`CREDITCOIN_VAULT=${data.creditcoin.vault}`);
if (data.creditcoin.asset) console.log(`CREDITCOIN_ASSET=${data.creditcoin.asset}`);
console.log("PROOFYIELD_MODE=live");
