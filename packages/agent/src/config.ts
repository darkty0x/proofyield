import { z } from "zod";

const boolish = z
  .string()
  .optional()
  .transform((v) => v === "1" || v?.toLowerCase() === "true");

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
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(raw);
}
