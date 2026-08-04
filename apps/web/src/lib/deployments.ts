import { explorers, type VaultStatus } from "./api";

/** Canonical live testnet addresses — always linkable even if API is briefly offline. */
export const CANONICAL_DEPLOYMENTS = {
  sepolia: {
    chainId: 11155111,
    chain: "Sepolia",
    explorer: explorers.sepolia,
    rwaSource: "0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB",
  },
  creditcoin: {
    chainId: 102031,
    chain: "Creditcoin CC3",
    explorer: explorers.ctc,
    vault: "0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc",
    asset: "0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9",
  },
} as const;

export type DeploymentRow = {
  id: string;
  label: string;
  chain: string;
  address: string;
  href: string;
  explorerLabel: string;
};

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Prefer live status addresses; fall back to canonical testnet deploy. */
export function deploymentRows(status?: VaultStatus | null): DeploymentRow[] {
  const vault = status?.vaultAddress || CANONICAL_DEPLOYMENTS.creditcoin.vault;
  const asset = status?.assetAddress || CANONICAL_DEPLOYMENTS.creditcoin.asset;
  const source = status?.sourceAddress || CANONICAL_DEPLOYMENTS.sepolia.rwaSource;

  return [
    {
      id: "vault",
      label: "ProofYield Vault",
      chain: CANONICAL_DEPLOYMENTS.creditcoin.chain,
      address: vault,
      href: `${CANONICAL_DEPLOYMENTS.creditcoin.explorer}/address/${vault}`,
      explorerLabel: "Blockscout",
    },
    {
      id: "asset",
      label: "pyUSD (MockUSDC)",
      chain: CANONICAL_DEPLOYMENTS.creditcoin.chain,
      address: asset,
      href: `${CANONICAL_DEPLOYMENTS.creditcoin.explorer}/address/${asset}`,
      explorerLabel: "Blockscout",
    },
    {
      id: "source",
      label: "RWA Yield Source",
      chain: CANONICAL_DEPLOYMENTS.sepolia.chain,
      address: source,
      href: `${CANONICAL_DEPLOYMENTS.sepolia.explorer}/address/${source}`,
      explorerLabel: "Etherscan",
    },
  ];
}
