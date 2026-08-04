import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadEnv } from "./config.js";

describe("loadEnv deployments merge", () => {
  it("parses live mode and faucet knobs", () => {
    const env = loadEnv({
      PROOFYIELD_MODE: "live",
      FAUCET_AMOUNT: "5000",
      FAUCET_COOLDOWN_MS: "120000",
      PORT: "8787",
    });
    assert.equal(env.PROOFYIELD_MODE, "live");
    assert.equal(env.FAUCET_AMOUNT, 5000);
    assert.equal(env.FAUCET_COOLDOWN_MS, 120000);
  });

  it("defaults demo when unset", () => {
    const env = loadEnv({ PORT: "8787" });
    assert.equal(env.PROOFYIELD_MODE, "demo");
  });
});
