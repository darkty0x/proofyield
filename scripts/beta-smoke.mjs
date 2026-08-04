#!/usr/bin/env node
/**
 * Live beta smoke checks after deploy.
 * Usage: node scripts/beta-smoke.mjs [apiBase]
 */
const API = process.argv[2] || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function get(path) {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`);
  return body;
}

const health = await get("/health");
const status = await get("/api/status");
const proofs = await get("/api/proofs");

const checks = [
  ["health.mode", health.mode === "live", health.mode],
  ["status.live", status.live === true, status.live],
  ["status.vaultAddress", Boolean(status.vaultAddress), status.vaultAddress],
  ["status.assetAddress", Boolean(status.assetAddress), status.assetAddress],
  ["statusLabel", status.statusLabel === "Live", status.statusLabel],
  [
    "no template proofs",
    !(proofs.items ?? []).some((p) => String(p.id).startsWith("tpl-")),
    (proofs.items ?? []).length,
  ],
];

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
  if (!ok) failed += 1;
}

console.log(
  JSON.stringify(
    {
      api: API,
      sepoliaSource: status.sourceAddress,
      vault: status.vaultAddress,
      asset: status.assetAddress,
      proofs: (proofs.items ?? []).length,
    },
    null,
    2,
  ),
);

process.exit(failed ? 1 : 0);
