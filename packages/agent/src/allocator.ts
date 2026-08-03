import type { AllocationDecision, CouponEvent, SourceInfo } from "./types.js";

const DEFAULT_SOURCES: SourceInfo[] = [
  {
    sourceId: 1,
    name: "Trade Finance Invoice Pool",
    tranche: "senior",
    riskBps: 200,
    active: true,
    targetWeightBps: 4000,
  },
  {
    sourceId: 2,
    name: "T-Bill Proxy Desk",
    tranche: "treasury",
    riskBps: 50,
    active: true,
    targetWeightBps: 4500,
  },
  {
    sourceId: 3,
    name: "Emerging Market Receivables",
    tranche: "mezz",
    riskBps: 450,
    active: true,
    targetWeightBps: 1500,
  },
];

export type AllocatorPolicy = {
  minRiskScore: number;
  maxCouponBpsOfTvl: number;
  sources: SourceInfo[];
};

export function defaultPolicy(minRiskScore = 40, maxCouponBpsOfTvl = 500): AllocatorPolicy {
  return { minRiskScore, maxCouponBpsOfTvl, sources: DEFAULT_SOURCES };
}

/** Deterministic AI underwriter — always works for demos; optional LLM can wrap rationale later. */
export function decideAllocation(
  coupon: CouponEvent,
  tvl: number,
  policy: AllocatorPolicy,
): AllocationDecision {
  const source = policy.sources.find((s) => s.sourceId === coupon.sourceId);
  if (!source || !source.active) {
    return {
      action: "reject",
      riskScore: 0,
      weightBps: 0,
      rationale: `Source ${coupon.sourceId} is not an active allowlisted RWA desk.`,
      sourceRank: 99,
    };
  }

  // Higher riskBps → lower score. Cap coupon vs TVL.
  const riskScore = Math.max(0, Math.min(100, 100 - source.riskBps / 5));
  const ranked = [...policy.sources].sort((a, b) => a.riskBps - b.riskBps);
  const sourceRank = ranked.findIndex((s) => s.sourceId === source.sourceId) + 1;

  if (tvl > 0) {
    const bps = (coupon.amount / tvl) * 10_000;
    if (bps > policy.maxCouponBpsOfTvl) {
      return {
        action: "reject",
        riskScore,
        weightBps: source.targetWeightBps,
        rationale: `Coupon ${bps.toFixed(0)} bps of TVL exceeds policy cap ${policy.maxCouponBpsOfTvl} bps.`,
        sourceRank,
      };
    }
  }

  if (riskScore < policy.minRiskScore) {
    return {
      action: "reject",
      riskScore,
      weightBps: source.targetWeightBps,
      rationale: `Risk score ${riskScore} below minimum ${policy.minRiskScore} for tranche ${source.tranche}.`,
      sourceRank,
    };
  }

  return {
    action: "accept",
    riskScore,
    weightBps: source.targetWeightBps,
    rationale: `Accept ${source.name} (${source.tranche}): risk ${riskScore}/100, target weight ${(source.targetWeightBps / 100).toFixed(1)}%, coupon $${coupon.amount.toLocaleString()}. Attestcoin proof required before share price update.`,
    sourceRank,
  };
}

export function rankSources(policy: AllocatorPolicy): SourceInfo[] {
  return [...policy.sources]
    .filter((s) => s.active)
    .sort((a, b) => a.riskBps - b.riskBps || b.targetWeightBps - a.targetWeightBps);
}
