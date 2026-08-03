import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { loadEnv } from "./config.js";
import { HarvestWorker } from "./worker.js";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
config({ path: resolve(root, ".env") });
config(); // local override

const env = loadEnv();
const worker = new HarvestWorker(env, resolve(root, "data") + "/");
worker.start();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: env.PROOFYIELD_MODE });
});

app.get("/api/status", (_req, res) => {
  res.json({
    ...worker.store.vault,
    statusLabel: worker.store.vault.live ? "Live" : env.PROOFYIELD_MODE === "demo" ? "Demo" : "Offline",
  });
});

app.get("/api/proofs", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const status = String(req.query.status ?? "");
  let items = worker.store.proofs;
  if (status && status !== "all") items = items.filter((p) => p.status === status);
  if (q) {
    items = items.filter(
      (p) =>
        p.coupon.sepoliaTxHash.toLowerCase().includes(q) ||
        p.coupon.metadata.toLowerCase().includes(q) ||
        String(p.coupon.sourceId).includes(q),
    );
  }
  res.json({ items, total: items.length });
});

app.get("/api/sources", (_req, res) => {
  res.json({ items: worker.sources() });
});

app.get("/api/history", (req, res) => {
  const days = Number(req.query.days ?? 30);
  res.json({ items: worker.history(Number.isFinite(days) ? days : 30) });
});

app.get("/api/audit", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json({ items: worker.audit.list(limit) });
});

app.post("/api/demo/deposit", (req, res) => {
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
    res.json(worker.demoDeposit(amount));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/demo/withdraw", (req, res) => {
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
    res.json(worker.demoWithdraw(amount));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/demo/harvest", async (req, res) => {
  try {
    const record = await worker.runDemoHarvest({
      sourceId: req.body?.sourceId ? Number(req.body.sourceId) : undefined,
      amount: req.body?.amount ? Number(req.body.amount) : undefined,
      metadata: req.body?.metadata,
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/harvest", async (req, res) => {
  try {
    const coupon = req.body?.coupon;
    if (!coupon?.sepoliaTxHash) return res.status(400).json({ error: "coupon required" });
    const record = await worker.processCoupon(coupon);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(env.PORT, () => {
  console.log(`ProofYield agent listening on :${env.PORT} (${env.PROOFYIELD_MODE})`);
});
