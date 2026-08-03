import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideAllocation, defaultPolicy } from "./allocator.js";
import type { CouponEvent } from "./types.js";

function coupon(partial: Partial<CouponEvent> & Pick<CouponEvent, "sourceId" | "amount">): CouponEvent {
  return {
    id: "1",
    couponId: 1,
    amountRaw: String(Math.round(partial.amount * 1e6)),
    tranche: "treasury",
    metadata: "t",
    sepoliaTxHash: "0xabc",
    blockNumber: 1,
    observedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("allocator", () => {
  it("accepts treasury coupon within caps", () => {
    const d = decideAllocation(coupon({ sourceId: 2, amount: 1000 }), 1_000_000, defaultPolicy());
    assert.equal(d.action, "accept");
    assert.ok(d.riskScore >= 40);
  });

  it("rejects oversized coupon vs TVL", () => {
    const d = decideAllocation(coupon({ sourceId: 2, amount: 100_000 }), 1_000_000, defaultPolicy(40, 500));
    assert.equal(d.action, "reject");
  });

  it("rejects unknown source", () => {
    const d = decideAllocation(coupon({ sourceId: 99, amount: 10 }), 1_000_000, defaultPolicy());
    assert.equal(d.action, "reject");
  });
});
