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

export function formatUsd(n: number): string {
  return `$${formatNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatApy(bps: number): string {
  return `${formatNumber(bps / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatSupply(n: number): string {
  return formatNumber(n, { maximumFractionDigits: 2 });
}

export const explorers = {
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ?? "https://sepolia.etherscan.io",
  ctc: process.env.NEXT_PUBLIC_CTC_EXPLORER ?? "https://creditcoin-testnet.blockscout.com",
};
