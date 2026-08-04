import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const envSchema = z.object({
  PROOFYIELD_MODE: z.enum(["demo", "live"]).default("demo"),
  SEPOLIA_RPC_URL: z.string().default("https://ethereum-sepolia-rpc.publicnode.com"),
  CREDITCOIN_RPC_URL: z.string().default("https://rpc.cc3-testnet.creditcoin.network"),
  ATTESTCOIN_PROVER_URL: z
    .string()
    .default("https://prover.cc3-testnet.creditcoin.network"),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  HARVESTER_PRIVATE_KEY: z.string().optional(),
  SEPOLIA_RWA_SOURCE: z.string().optional(),
  CREDITCOIN_VAULT: z.string().optional(),
  CREDITCOIN_ASSET: z.string().optional(),
  SEPOLIA_CHAIN_KEY: z.coerce.number().default(1),
  PORT: z.coerce.number().default(8787),
  POLL_INTERVAL_MS: z.coerce.number().default(15_000),
  MAX_COUPON_BPS: z.coerce.number().default(500),
  MIN_RISK_SCORE: z.coerce.number().default(40),
  OPENAI_API_KEY: z.string().optional(),
  /** pyUSD deposited into the vault at seed (TVL). */
  DEMO_SEED_TVL: z.coerce.number().default(1_250_000),
  /** Total pyUSD test-token supply minted for the demo economy. */
  DEMO_TOKEN_SUPPLY: z.coerce.number().default(10_000_000),
  /** Promised target APY in basis points (842 = 8.42%). */
  PROMISED_APY_BPS: z.coerce.number().default(842),
  /** Live faucet: human pyUSD amount (6 decimals applied in worker). */
  FAUCET_AMOUNT: z.coerce.number().default(10_000),
  /** Live faucet cooldown per address (ms). */
  FAUCET_COOLDOWN_MS: z.coerce.number().default(60_000),
});

export type Env = z.infer<typeof envSchema>;

type DeploymentsFile = {
  sepolia?: { rwaSource?: string | null };
  creditcoin?: { vault?: string | null; asset?: string | null };
};

function loadDeploymentsFile(): DeploymentsFile | null {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
    const path = resolve(root, "deployments/testnet.json");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as DeploymentsFile;
  } catch {
    return null;
  }
}

/** Env wins; otherwise fill empty address fields from deployments/testnet.json. */
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const env = envSchema.parse(raw);
  const dep = loadDeploymentsFile();
  if (!dep) return env;
  return {
    ...env,
    SEPOLIA_RWA_SOURCE: env.SEPOLIA_RWA_SOURCE || dep.sepolia?.rwaSource || undefined,
    CREDITCOIN_VAULT: env.CREDITCOIN_VAULT || dep.creditcoin?.vault || undefined,
    CREDITCOIN_ASSET: env.CREDITCOIN_ASSET || dep.creditcoin?.asset || undefined,
  };
}
