import { Interface, JsonRpcProvider, Wallet, Contract, id } from "ethers";
import type { Env } from "./config.js";
import type { CouponEvent } from "./types.js";

export const RWA_ABI = [
  "event CouponPaid(uint256 indexed sourceId, uint256 indexed couponId, uint256 amount, bytes32 trancheHash, string metadata)",
  "event SourceRegistered(uint256 indexed sourceId, string name, string tranche, uint16 riskBps)",
  "function postCoupon(uint256 sourceId, uint256 amount, string metadata) returns (uint256)",
  "function sources(uint256) view returns (string name, string tranche, uint16 riskBps, bool active)",
];

export const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function sharePrice() view returns (uint256)",
  "function reportedApyBps() view returns (uint256)",
  "function totalHarvested() view returns (uint256)",
  "function harvestCount() view returns (uint256)",
  "function harvestTrusted(bytes32 queryId, uint256 sourceId, uint256 couponId, uint256 amount, bytes32 sepoliaTxHash)",
  "function execute(uint8 action, uint64 chainKey, uint64 blockHeight, bytes encodedTransaction, bytes32 merkleRoot, (bytes32 hash, bool isLeft)[] siblings, bytes32 lowerEndpointDigest, bytes32[] continuityRoots) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function asset() view returns (address)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount)",
  "function symbol() view returns (string)",
];

const couponIface = new Interface(RWA_ABI);

export function createSepoliaProvider(env: Env): JsonRpcProvider {
  return new JsonRpcProvider(env.SEPOLIA_RPC_URL);
}

export function createCreditcoinProvider(env: Env): JsonRpcProvider {
  return new JsonRpcProvider(env.CREDITCOIN_RPC_URL);
}

export function createHarvesterWallet(env: Env, provider: JsonRpcProvider): Wallet | null {
  const key = env.HARVESTER_PRIVATE_KEY || env.DEPLOYER_PRIVATE_KEY;
  if (!key) return null;
  return new Wallet(key, provider);
}

export async function fetchCouponLogs(
  provider: JsonRpcProvider,
  sourceAddress: string,
  fromBlock: number,
  toBlock: number | "latest" = "latest",
): Promise<CouponEvent[]> {
  const topic = id("CouponPaid(uint256,uint256,uint256,bytes32,string)");
  const logs = await provider.getLogs({
    address: sourceAddress,
    topics: [topic],
    fromBlock,
    toBlock,
  });

  return logs.map((log) => {
    const parsed = couponIface.parseLog({ topics: log.topics as string[], data: log.data });
    if (!parsed) throw new Error("failed to parse CouponPaid");
    const amount = BigInt(parsed.args.amount);
    return {
      id: `${log.transactionHash}-${log.index}`,
      sourceId: Number(parsed.args.sourceId),
      couponId: Number(parsed.args.couponId),
      amount: Number(amount) / 1e6,
      amountRaw: amount.toString(),
      tranche: String(parsed.args.trancheHash),
      metadata: String(parsed.args.metadata),
      sepoliaTxHash: log.transactionHash,
      blockNumber: log.blockNumber,
      observedAt: new Date().toISOString(),
    } satisfies CouponEvent;
  });
}

export async function postCouponOnchain(
  env: Env,
  sourceId: number,
  amountRaw: bigint,
  metadata: string,
): Promise<string> {
  if (!env.SEPOLIA_RWA_SOURCE) throw new Error("SEPOLIA_RWA_SOURCE unset");
  const provider = createSepoliaProvider(env);
  const wallet = createHarvesterWallet(env, provider);
  if (!wallet) throw new Error("HARVESTER_PRIVATE_KEY unset");
  const c = new Contract(env.SEPOLIA_RWA_SOURCE, RWA_ABI, wallet);
  const tx = await c.postCoupon(sourceId, amountRaw, metadata);
  const receipt = await tx.wait();
  return receipt.hash as string;
}
