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

app.get("/api/deployments", (_req, res) => {
  const sepoliaExplorer = "https://sepolia.etherscan.io";
  const ctcExplorer = "https://creditcoin-testnet.blockscout.com";
  const vault = worker.store.vault.vaultAddress || env.CREDITCOIN_VAULT || "";
  const asset = worker.store.vault.assetAddress || env.CREDITCOIN_ASSET || "";
  const source = worker.store.vault.sourceAddress || env.SEPOLIA_RWA_SOURCE || "";
  res.json({
    network: "testnet",
    mode: env.PROOFYIELD_MODE,
    live: worker.store.vault.live,
    contracts: [
      {
        id: "vault",
        label: "ProofYield Vault",
        chain: "Creditcoin CC3",
        chainId: 102031,
        address: vault,
        explorer: ctcExplorer,
        url: vault ? `${ctcExplorer}/address/${vault}` : null,
      },
      {
        id: "asset",
        label: "pyUSD (MockUSDC)",
        chain: "Creditcoin CC3",
        chainId: 102031,
        address: asset,
        explorer: ctcExplorer,
        url: asset ? `${ctcExplorer}/address/${asset}` : null,
      },
      {
        id: "source",
        label: "RWA Yield Source",
        chain: "Sepolia",
        chainId: 11155111,
        address: source,
        explorer: sepoliaExplorer,
        url: source ? `${sepoliaExplorer}/address/${source}` : null,
      },
    ],
  });
});

app.get("/api/status", async (req, res) => {
  const address = typeof req.query.address === "string" ? req.query.address : undefined;
  let userShares: number | undefined;
  if (address && env.PROOFYIELD_MODE === "live") {
    try {
      userShares = await worker.userShares(address);
    } catch {
      userShares = undefined;
    }
  }
  res.json({
    ...worker.store.vault,
    userShares,
    statusLabel: worker.store.vault.live
      ? "Live"
      : env.PROOFYIELD_MODE === "demo"
        ? "Demo"
        : "Offline",
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

app.post("/api/faucet", async (req, res) => {
  try {
    const to = String(req.body?.address ?? "");
    const result = await worker.faucet(to);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/demo/deposit", (req, res) => {
  if (env.PROOFYIELD_MODE === "live") {
    return res.status(400).json({ error: "Demo deposit disabled in live mode — use wallet deposit" });
  }
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
    res.json(worker.demoDeposit(amount));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/demo/withdraw", (req, res) => {
  if (env.PROOFYIELD_MODE === "live") {
    return res.status(400).json({ error: "Demo withdraw disabled in live mode — use wallet redeem" });
  }
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
    res.json(worker.demoWithdraw(amount));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/demo/harvest", async (req, res) => {
  if (env.PROOFYIELD_MODE === "live") {
    return res.status(400).json({
      error: "Demo harvest disabled in live mode — post a Sepolia coupon for the agent to harvest",
    });
  }
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
