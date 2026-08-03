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
  status: () => getJson<VaultStatus>("/api/status"),
  history: (days = 30) => getJson<{ items: HistoryPoint[] }>(`/api/history?days=${days}`),
  proofs: (q = "", status = "all") =>
    getJson<{ items: ProofItem[]; total: number }>(
      `/api/proofs?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,
    ),
  sources: () => getJson<{ items: SourceItem[] }>("/api/sources"),
  deposit: (amount: number) => postJson<VaultStatus>("/api/demo/deposit", { amount }),
  withdraw: (amount: number) => postJson<VaultStatus>("/api/demo/withdraw", { amount }),
  harvest: (payload?: { sourceId?: number; amount?: number }) =>
    postJson<ProofItem>("/api/demo/harvest", payload ?? {}),
};

export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatApy(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatSupply(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const explorers = {
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ?? "https://sepolia.etherscan.io",
  ctc: process.env.NEXT_PUBLIC_CTC_EXPLORER ?? "https://creditcoin-testnet.blockscout.com",
};
