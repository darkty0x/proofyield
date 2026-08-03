export type ProofStatus = "pending" | "attesting" | "attested" | "harvested" | "rejected";

export type CouponEvent = {
  id: string;
  sourceId: number;
  couponId: number;
  amount: number;
  amountRaw: string;
  tranche: string;
  metadata: string;
  sepoliaTxHash: string;
  blockNumber: number;
  observedAt: string;
};

export type AllocationDecision = {
  action: "accept" | "reject";
  riskScore: number;
  weightBps: number;
  rationale: string;
  sourceRank: number;
};

export type ProofRecord = {
  id: string;
  coupon: CouponEvent;
  status: ProofStatus;
  decision?: AllocationDecision;
  attestcoin?: {
    chainKey: number;
    headerNumber?: number;
    verified?: boolean;
    proverUrl: string;
  };
  harvest?: {
    ctcTxHash?: string;
    queryId?: string;
    sharePriceAfter?: number;
  };
  error?: string;
  updatedAt: string;
};

export type VaultSnapshot = {
  mode: "demo" | "live";
  live: boolean;
  tvl: number;
  sharePrice: number;
  /** Display APY — promised target for the vault (bps). */
  apyBps: number;
  /** Trailing realized yield annualized from harvests (bps). */
  realizedApyBps: number;
  /** Total pyUSD test-token supply minted for the demo. */
  tokenSupply: number;
  promisedApyBps: number;
  totalHarvested: number;
  harvestCount: number;
  depositorShares: number;
  assetSymbol: string;
  shareSymbol: string;
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

export type SourceInfo = {
  sourceId: number;
  name: string;
  tranche: string;
  riskBps: number;
  active: boolean;
  targetWeightBps: number;
};

export type AuditEntry = {
  id: string;
  at: string;
  kind: string;
  message: string;
  data?: Record<string, unknown>;
};
