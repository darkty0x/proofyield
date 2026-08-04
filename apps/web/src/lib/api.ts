const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type VaultStatus = {
  mode: "demo" | "live";
  live: boolean;
  statusLabel: string;
  tvl: number;
  sharePrice: number;
  apyBps: number;
  realizedApyBps?: number;
  tokenSupply?: number;
  promisedApyBps?: number;
  totalHarvested: number;
  harvestCount: number;
  depositorShares: number;
  /** Connected wallet share balance when status requested with ?address= */
  userShares?: number;
  assetSymbol: string;
  shareSymbol?: string;
  vaultAddress?: string;
  sourceAddress?: string;
  assetAddress?: string;
  lastSuccessAt?: string;
};

export type HistoryPoint = {
  t: string;
  tvl: number;
  sharePrice: number;
  apyBps: number;
};

export type ProofItem = {
  id: string;
  status: string;
  coupon: {
    sourceId: number;
    couponId: number;
    amount: number;
    metadata: string;
    sepoliaTxHash: string;
    blockNumber: number;
    observedAt: string;
  };
  decision?: {
    action: string;
    riskScore: number;
    rationale: string;
    sourceRank: number;
  };
  attestcoin?: {
    verified?: boolean;
    headerNumber?: number;
    chainKey: number;
  };
  harvest?: {
    ctcTxHash?: string;
    sharePriceAfter?: number;
  };
  error?: string;
  updatedAt: string;
};

export type SourceItem = {
  sourceId: number;
  name: string;
  tranche: string;
  riskBps: number;
  active: boolean;
  targetWeightBps: number;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `${path} failed`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: (address?: string) =>
    getJson<VaultStatus>(
      address ? `/api/status?address=${encodeURIComponent(address)}` : "/api/status",
    ),
  history: (days = 30) => getJson<{ items: HistoryPoint[] }>(`/api/history?days=${days}`),
  proofs: (q = "", status = "all") =>
    getJson<{ items: ProofItem[]; total: number }>(
      `/api/proofs?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,
    ),
  sources: () => getJson<{ items: SourceItem[] }>("/api/sources"),
  faucet: (address: string) =>
    postJson<{ ok: true; txHash: string; amount: number }>("/api/faucet", { address }),
  /** Demo-only mutations — blocked by API when PROOFYIELD_MODE=live. */
  deposit: (amount: number) => postJson<VaultStatus>("/api/demo/deposit", { amount }),
  withdraw: (amount: number) => postJson<VaultStatus>("/api/demo/withdraw", { amount }),
  harvest: (payload?: { sourceId?: number; amount?: number }) =>
    postJson<ProofItem>("/api/demo/harvest", payload ?? {}),
};

/** Thousand-separated number, e.g. 1,250,995.18 */
export function formatNumber(
  n: number,
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  const max = opts?.maximumFractionDigits ?? 2;
  const min = opts?.minimumFractionDigits ?? 0;
  return n.toLocaleString("en-US", {
    maximumFractionDigits: max,
    minimumFractionDigits: min,
  });
}

/** Drop trailing zeros: 10.00 → "10", 1.20 → "1.2", 1.26 → "1.26" */
function trimZeros(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

/** Compact USD for metrics: $1.26M, $6.1K, $42.5 — never forces .00 */
export function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${trimZeros(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `$${trimZeros(n / 1_000, 1)}K`;
  return `$${formatNumber(n, { maximumFractionDigits: 2 })}`;
}

export function formatApy(bps: number): string {
  return `${trimZeros(bps / 100, 2)}%`;
}

/** Compact supply for metrics: 10M, 1.2K, 850 */
export function formatSupply(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trimZeros(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${trimZeros(n / 1_000, 1)}K`;
  return formatNumber(n, { maximumFractionDigits: 2 });
}

export const explorers = {
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ?? "https://sepolia.etherscan.io",
  ctc: process.env.NEXT_PUBLIC_CTC_EXPLORER ?? "https://creditcoin-testnet.blockscout.com",
};
