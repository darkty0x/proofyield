import { explorers, formatUsd, type ProofItem } from "./api";

/** Match agent allocator desks — used when coupon.metadata is an internal tag. */
export const SOURCE_NAMES: Record<number, string> = {
  1: "Trade Finance Invoice Pool",
  2: "T-Bill Proxy Desk",
  3: "Emerging Market Receivables",
};

function isInternalMeta(meta?: string): boolean {
  if (!meta?.trim()) return true;
  const m = meta.trim().toLowerCase();
  return /^(beta[-_]?|demo[-_]?|test[-_]?|coupon[-_]?)/.test(m) || /^[0-9a-fx_-]+$/i.test(m);
}

export function isTxHash(h?: string | null): h is string {
  return Boolean(h && /^0x[a-fA-F0-9]{64}$/.test(h));
}

/** Human desk name for a coupon (never raw CLI tags like beta-live-2). */
export function proofTitle(p: ProofItem): string {
  const raw = p.coupon.metadata?.split("·")[0]?.trim();
  if (raw && !isInternalMeta(raw)) return raw;
  return SOURCE_NAMES[p.coupon.sourceId] ?? `RWA source ${p.coupon.sourceId}`;
}

export function proofDetail(p: ProofItem): string {
  return `${formatUsd(p.coupon.amount)} coupon · ${proofTitle(p)}`;
}

/** Prefer real CC3 harvest hash; fall back to Sepolia CouponPaid. */
export function proofExplorerHref(p: ProofItem): string | null {
  if (isTxHash(p.harvest?.ctcTxHash)) {
    return `${explorers.ctc}/tx/${p.harvest!.ctcTxHash}`;
  }
  if (isTxHash(p.coupon.sepoliaTxHash)) {
    return `${explorers.sepolia}/tx/${p.coupon.sepoliaTxHash}`;
  }
  return null;
}
