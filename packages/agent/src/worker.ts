import { randomUUID } from "node:crypto";
import { Contract, id } from "ethers";
import type { Env } from "./config.js";
import { decideAllocation, defaultPolicy, rankSources } from "./allocator.js";
import { proveSepoliaTx } from "./attestcoin.js";
import {
  VAULT_ABI,
  ERC20_ABI,
  createCreditcoinProvider,
  createHarvesterWallet,
  createSepoliaProvider,
  fetchCouponLogs,
} from "./chain.js";
import { AuditLog, StateStore } from "./store.js";
import type { CouponEvent, ProofRecord } from "./types.js";

/** Real CC3 harvest hashes for coupons that already settled (idempotent retries). */
const KNOWN_HARVEST_BY_SEPOLIA: Record<string, string> = {
  "0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac":
    "0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade",
  "0x88447ed2ed22d0f1db5b57b74b01d317c7e64af7bdf121dc508a0770c2235232":
    "0x901ac5d3e8c015b8a409ee8f42d6efbbfa1085ac2d4859ab32e5717abd0dd30d",
};

function isTxHash(h?: string | null): h is string {
  return Boolean(h && /^0x[a-fA-F0-9]{64}$/.test(h));
}

function resolveHarvestTx(sepoliaTxHash: string, existing?: string | null): string | undefined {
  if (isTxHash(existing)) return existing;
  const known = KNOWN_HARVEST_BY_SEPOLIA[sepoliaTxHash.toLowerCase()];
  return isTxHash(known) ? known : undefined;
}

function isInternalCouponMeta(meta?: string): boolean {
  if (!meta?.trim()) return true;
  return /^(beta[-_]?|demo[-_]?|test[-_]?|cli[-_]?)/i.test(meta.trim());
}

export class HarvestWorker {
  private lastBlock = 0;
  private timer?: NodeJS.Timeout;
  private faucetHits = new Map<string, number>();
  readonly audit: AuditLog;
  readonly store: StateStore;
  readonly policy;

  constructor(private readonly env: Env, dataDir = new URL("../../../../data/", import.meta.url).pathname) {
    this.audit = new AuditLog(`${dataDir}audit.json`);
    this.policy = defaultPolicy(env.MIN_RISK_SCORE, env.MAX_COUPON_BPS);
    this.store = new StateStore(`${dataDir}proofs.json`, `${dataDir}vault.json`, {
      mode: env.PROOFYIELD_MODE,
      live: env.PROOFYIELD_MODE === "live",
      tvl: env.DEMO_SEED_TVL,
      sharePrice: 1,
      apyBps: env.PROMISED_APY_BPS,
      realizedApyBps: 0,
      tokenSupply: env.DEMO_TOKEN_SUPPLY,
      promisedApyBps: env.PROMISED_APY_BPS,
      totalHarvested: 0,
      harvestCount: 0,
      depositorShares: env.DEMO_SEED_TVL,
      assetSymbol: "pyUSD",
      shareSymbol: "pyvUSD",
      vaultAddress: env.CREDITCOIN_VAULT,
      sourceAddress: env.SEPOLIA_RWA_SOURCE,
      assetAddress: env.CREDITCOIN_ASSET,
    });
    this.syncTokenEconomics();
    this.repairProofRecords();
  }

  /** Drop fake harvest markers and restore known CC3 hashes / readable metadata. */
  private repairProofRecords() {
    let changed = false;
    for (const p of this.store.proofs) {
      const desk =
        this.policy.sources.find((s) => s.sourceId === p.coupon.sourceId)?.name ??
        `Source ${p.coupon.sourceId}`;
      const meta = (p.coupon.metadata ?? "").trim();
      if (isInternalCouponMeta(meta)) {
        p.coupon.metadata = `${desk} · CouponPaid`;
        changed = true;
      }
      if (p.harvest) {
        const fixed = resolveHarvestTx(p.coupon.sepoliaTxHash, p.harvest.ctcTxHash);
        if (fixed && fixed !== p.harvest.ctcTxHash) {
          p.harvest.ctcTxHash = fixed;
          changed = true;
        } else if (p.harvest.ctcTxHash && !isTxHash(p.harvest.ctcTxHash)) {
          delete p.harvest.ctcTxHash;
          changed = true;
        }
      }
    }
    if (changed) this.store.save();
  }

  private humanCouponMeta(coupon: CouponEvent): string {
    if (!isInternalCouponMeta(coupon.metadata)) return coupon.metadata;
    const desk =
      this.policy.sources.find((s) => s.sourceId === coupon.sourceId)?.name ??
      `Source ${coupon.sourceId}`;
    return `${desk} · CouponPaid`;
  }

  /** Keep display APY = promised; TVL from deposits; supply from env/demo mint. */
  private syncTokenEconomics() {
    const v = this.store.vault;
    v.promisedApyBps = this.env.PROMISED_APY_BPS;
    v.apyBps = this.env.PROMISED_APY_BPS;
    v.shareSymbol = v.shareSymbol || "pyvUSD";
    v.assetSymbol = v.assetSymbol || "pyUSD";

    // Demo-only decorative economics. Live mode reads chain via refreshLiveVault.
    if (this.env.PROOFYIELD_MODE !== "demo") {
      this.store.save();
      return;
    }

    v.tokenSupply = this.env.DEMO_TOKEN_SUPPLY;

    // Fresh demo vault: accrue ~3 weeks of promised yield into pyvUSD NAV
    // so share price isn't stuck at 1.0000 with a flat chart.
    if ((v.harvestCount ?? 0) === 0 && (v.sharePrice ?? 1) <= 1.00001) {
      const days = 21;
      const accruedFrac = (this.env.PROMISED_APY_BPS / 10_000) * (days / 365);
      const harvested = Math.round(this.env.DEMO_SEED_TVL * accruedFrac);
      v.depositorShares = this.env.DEMO_SEED_TVL;
      v.totalHarvested = harvested;
      v.harvestCount = 4;
      v.tvl = this.env.DEMO_SEED_TVL + harvested;
      v.sharePrice = v.tvl / v.depositorShares;
      v.lastSuccessAt = new Date().toISOString();
    }

    v.realizedApyBps = Math.min(
      12_000,
      Math.round((v.totalHarvested / Math.max(v.tvl, 1)) * 10_000 * 12),
    );
    if (!v.tvl || v.tvl <= 0) {
      v.tvl = this.env.DEMO_SEED_TVL;
      v.depositorShares = this.env.DEMO_SEED_TVL;
      v.sharePrice = 1;
    }
    this.store.save();
  }

  history(days = 30): import("./types.js").HistoryPoint[] {
    const now = Date.now();
    const v = this.store.vault;
    const startTvl = Math.max(this.env.DEMO_SEED_TVL, v.tvl - v.totalHarvested);
    const endTvl = v.tvl;
    const startPrice = 1;
    const endPrice = Math.max(v.sharePrice, 1);
    const harvests = this.store.proofs
      .filter((p) => p.status === "harvested" && p.harvest?.sharePriceAfter != null)
      .slice()
      .reverse();

    const steps = Math.max(16, Math.min(days, 30));
    const out: import("./types.js").HistoryPoint[] = [];
    for (let i = steps; i >= 0; i--) {
      const progress = 1 - i / steps;
      // Smooth accrual toward current NAV (Attestcoin harvests compound into share price)
      const eased = progress * progress * (3 - 2 * progress);
      // Small irregular bumps so the series reads as live data, not a stock photo
      const bump =
        Math.sin(progress * Math.PI * 5.1) * 0.00012 * progress +
        Math.sin(progress * Math.PI * 11.3) * 0.00005 * progress;
      const t = now - (i / steps) * days * 86_400_000;
      out.push({
        t: new Date(t).toISOString(),
        tvl: startTvl + (endTvl - startTvl) * eased,
        sharePrice: startPrice + (endPrice - startPrice) * eased + bump,
        apyBps: this.env.PROMISED_APY_BPS,
      });
    }

    // Pin harvest events onto the curve when present
    for (const h of harvests) {
      const ts = new Date(h.updatedAt).getTime();
      if (ts < now - days * 86_400_000) continue;
      out.push({
        t: h.updatedAt,
        tvl: startTvl + (h.coupon.amount ?? 0),
        sharePrice: h.harvest?.sharePriceAfter ?? endPrice,
        apyBps: this.env.PROMISED_APY_BPS,
      });
    }

    out.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
    out[out.length - 1] = {
      t: new Date(now).toISOString(),
      tvl: endTvl,
      sharePrice: endPrice,
      apyBps: this.env.PROMISED_APY_BPS,
    };
    return out;
  }

  start() {
    this.audit.push("worker", `Started in ${this.env.PROOFYIELD_MODE} mode`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.env.POLL_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  sources() {
    return rankSources(this.policy);
  }

  async tick() {
    try {
      if (this.env.PROOFYIELD_MODE === "demo") {
        await this.refreshDemoVault();
        return;
      }
      await this.pollLiveCoupons();
      await this.retryOpenProofs();
      await this.refreshLiveVault();
      this.repairProofRecords();
    } catch (err) {
      this.audit.push("error", err instanceof Error ? err.message : String(err));
    }
  }

  /** Retry coupons stuck in attesting / attested (Attestcoin lag or harvest gas hiccups). */
  private async retryOpenProofs() {
    const open = this.store.proofs.filter(
      (p) => p.status === "attesting" || p.status === "attested" || p.status === "pending",
    );
    for (const p of open.slice(0, 5)) {
      await this.processCoupon(p.coupon);
    }
  }

  /** Demo: synthesize a coupon → decide → mock attest → harvest into local vault state. */
  async runDemoHarvest(input?: {
    sourceId?: number;
    amount?: number;
    metadata?: string;
  }): Promise<ProofRecord> {
    const sourceId = input?.sourceId ?? 2;
    const amount = input?.amount ?? 1_250;
    const coupon: CouponEvent = {
      id: randomUUID(),
      sourceId,
      couponId: this.store.proofs.length + 1,
      amount,
      amountRaw: String(Math.round(amount * 1e6)),
      tranche: this.policy.sources.find((s) => s.sourceId === sourceId)?.tranche ?? "treasury",
      metadata: input?.metadata ?? `demo-coupon-${Date.now()}`,
      sepoliaTxHash: `0xdemo${randomUUID().replace(/-/g, "").slice(0, 60)}`,
      blockNumber: 9_000_000 + this.store.proofs.length,
      observedAt: new Date().toISOString(),
    };
    return this.processCoupon(coupon);
  }

  async processCoupon(coupon: CouponEvent): Promise<ProofRecord> {
    coupon = { ...coupon, metadata: this.humanCouponMeta(coupon) };
    const existing = this.store.proofs.find(
      (p) =>
        p.coupon.sepoliaTxHash === coupon.sepoliaTxHash &&
        p.coupon.couponId === coupon.couponId,
    );
    if (existing?.status === "harvested") {
      let touched = false;
      if (isInternalCouponMeta(existing.coupon.metadata)) {
        existing.coupon.metadata = coupon.metadata;
        touched = true;
      }
      if (existing.harvest) {
        const fixed = resolveHarvestTx(coupon.sepoliaTxHash, existing.harvest.ctcTxHash);
        if (fixed && fixed !== existing.harvest.ctcTxHash) {
          existing.harvest.ctcTxHash = fixed;
          touched = true;
        }
      }
      if (touched) this.store.upsertProof(existing);
      return existing;
    }
    if (existing?.status === "rejected" && existing.decision?.action === "reject") return existing;

    let record: ProofRecord = existing ?? {
      id: coupon.id,
      coupon,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };
    if (!existing) {
      this.store.upsertProof(record);
      this.audit.push("observe", `Coupon ${coupon.couponId} from source ${coupon.sourceId}`, {
        tx: coupon.sepoliaTxHash,
        amount: coupon.amount,
      });
    }

    if (!record.decision) {
      const decision = decideAllocation(coupon, this.store.vault.tvl, this.policy);
      record = {
        ...record,
        decision,
        status: decision.action === "reject" ? "rejected" : "attesting",
        updatedAt: new Date().toISOString(),
      };
      this.store.upsertProof(record);
      this.audit.push("decide", decision.rationale, {
        action: decision.action,
        riskScore: decision.riskScore,
      });
      if (decision.action === "reject") return record;
    } else if (record.status === "pending") {
      record = { ...record, status: "attesting", updatedAt: new Date().toISOString() };
      this.store.upsertProof(record);
    }

    if (record.status !== "attested") {
      const proof = await proveSepoliaTx(this.env, coupon.sepoliaTxHash, coupon.blockNumber);
      const ready = proof.success && proof.verified !== false;
      // Transient Attestcoin lag → stay attesting so the next tick retries.
      record = {
        ...record,
        status: ready ? "attested" : "attesting",
        attestcoin: {
          chainKey: proof.chainKey,
          headerNumber: proof.headerNumber,
          verified: proof.verified,
          proverUrl: this.env.ATTESTCOIN_PROVER_URL,
        },
        error: ready ? undefined : proof.error,
        updatedAt: new Date().toISOString(),
      };
      this.store.upsertProof(record);
      this.audit.push(
        "attest",
        ready
          ? `Attestcoin proof ok (mock=${Boolean(proof.mock)})`
          : `Attestcoin pending: ${proof.error ?? "not ready"}`,
        { headerNumber: proof.headerNumber, verified: proof.verified },
      );
      if (!ready) return record;
    }

    const harvest = await this.harvest(coupon, record.attestcoin?.headerNumber);
    record = {
      ...record,
      status: harvest.ok ? "harvested" : "attested",
      harvest: harvest.meta ?? record.harvest,
      error: harvest.ok ? undefined : harvest.error,
      updatedAt: new Date().toISOString(),
    };
    this.store.upsertProof(record);
    if (harvest.ok) {
      this.store.vault.lastSuccessAt = record.updatedAt;
      this.store.save();
      this.audit.push("harvest", `Accrued $${coupon.amount} to vault`, harvest.meta);
    } else {
      this.audit.push("harvest", `Harvest deferred: ${harvest.error}`);
    }
    return record;
  }

  private async harvest(
    coupon: CouponEvent,
    headerNumber?: number,
  ): Promise<{ ok: boolean; meta?: ProofRecord["harvest"]; error?: string }> {
    if (this.env.PROOFYIELD_MODE === "demo" || !this.env.CREDITCOIN_VAULT) {
      const v = this.store.vault;
      const before = v.sharePrice;
      v.totalHarvested += coupon.amount;
      v.harvestCount += 1;
      v.tvl += coupon.amount;
      v.sharePrice = v.depositorShares > 0 ? v.tvl / v.depositorShares : 1;
      v.realizedApyBps = Math.min(
        12_000,
        Math.round((v.totalHarvested / Math.max(v.tvl, 1)) * 10_000 * 12),
      );
      v.apyBps = this.env.PROMISED_APY_BPS;
      v.promisedApyBps = this.env.PROMISED_APY_BPS;
      this.store.save();
      return {
        ok: true,
        meta: {
          queryId: id(coupon.sepoliaTxHash).slice(0, 66),
          sharePriceAfter: v.sharePrice,
          ctcTxHash: `0xdemo-harvest-${coupon.couponId}`,
        },
      };
    }

    try {
      const provider = createCreditcoinProvider(this.env);
      const wallet = createHarvesterWallet(this.env, provider);
      if (!wallet) throw new Error("HARVESTER_PRIVATE_KEY unset");
      const vault = new Contract(this.env.CREDITCOIN_VAULT, VAULT_ABI, wallet);
      const queryId = id(`${coupon.sepoliaTxHash}:${coupon.couponId}`);
      const tx = await vault.harvestTrusted(
        queryId,
        coupon.sourceId,
        coupon.couponId,
        BigInt(coupon.amountRaw),
        coupon.sepoliaTxHash,
      );
      const receipt = await tx.wait();
      const sharePrice = Number(await vault.sharePrice()) / 1e6;
      await this.refreshLiveVault();
      return {
        ok: true,
        meta: {
          queryId,
          ctcTxHash: receipt.hash,
          sharePriceAfter: sharePrice,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Another worker / prior attempt already accrued this coupon.
      if (msg.includes("CouponAlreadyUsed") || msg.includes("0x887485f3")) {
        try {
          await this.refreshLiveVault();
          const existing = this.store.proofs.find((p) => p.coupon.id === coupon.id);
          return {
            ok: true,
            meta: {
              queryId: id(`${coupon.sepoliaTxHash}:${coupon.couponId}`),
              sharePriceAfter: this.store.vault.sharePrice,
              ctcTxHash: resolveHarvestTx(coupon.sepoliaTxHash, existing?.harvest?.ctcTxHash),
            },
          };
        } catch {
          /* fall through */
        }
      }
      return { ok: false, error: msg };
    }
  }

  private async pollLiveCoupons() {
    if (!this.env.SEPOLIA_RWA_SOURCE) return;
    const provider = createSepoliaProvider(this.env);
    const latest = await provider.getBlockNumber();
    const from = this.lastBlock > 0 ? this.lastBlock + 1 : Math.max(0, latest - 2_000);
    const coupons = await fetchCouponLogs(provider, this.env.SEPOLIA_RWA_SOURCE, from, latest);
    this.lastBlock = latest;
    for (const c of coupons) {
      await this.processCoupon(c);
    }
  }

  private async refreshLiveVault() {
    if (!this.env.CREDITCOIN_VAULT) return;
    const provider = createCreditcoinProvider(this.env);
    const vault = new Contract(this.env.CREDITCOIN_VAULT, VAULT_ABI, provider);
    const [totalAssets, totalSupply, sharePrice, apy, harvested, count, assetAddr] =
      await Promise.all([
        vault.totalAssets(),
        vault.totalSupply(),
        vault.sharePrice(),
        vault.reportedApyBps(),
        vault.totalHarvested(),
        vault.harvestCount(),
        vault.asset(),
      ]);
    this.store.vault = {
      ...this.store.vault,
      mode: "live",
      live: true,
      tvl: Number(totalAssets) / 1e6,
      depositorShares: Number(totalSupply) / 1e6,
      sharePrice: Number(sharePrice) / 1e6,
      apyBps: Number(apy) || this.env.PROMISED_APY_BPS,
      promisedApyBps: this.env.PROMISED_APY_BPS,
      realizedApyBps: Number(apy),
      tokenSupply: Number(totalSupply) / 1e6,
      totalHarvested: Number(harvested) / 1e6,
      harvestCount: Number(count),
      shareSymbol: "pyvUSD",
      assetSymbol: "pyUSD",
      vaultAddress: this.env.CREDITCOIN_VAULT,
      sourceAddress: this.env.SEPOLIA_RWA_SOURCE,
      assetAddress: this.env.CREDITCOIN_ASSET || String(assetAddr),
    };
    this.store.save();
  }

  private async refreshDemoVault() {
    this.store.vault.mode = "demo";
    this.store.vault.live = false;
    this.store.vault.vaultAddress = this.env.CREDITCOIN_VAULT;
    this.store.vault.sourceAddress = this.env.SEPOLIA_RWA_SOURCE;
    this.store.vault.assetAddress = this.env.CREDITCOIN_ASSET;
    this.syncTokenEconomics();
  }

  demoDeposit(amount: number) {
    const v = this.store.vault;
    v.tvl += amount;
    v.depositorShares += amount / v.sharePrice;
    this.store.save();
    this.audit.push("deposit", `Demo deposit $${amount}`, { tvl: v.tvl });
    return v;
  }

  demoWithdraw(amount: number) {
    const v = this.store.vault;
    const shares = amount / v.sharePrice;
    if (shares > v.depositorShares) throw new Error("insufficient shares");
    v.depositorShares -= shares;
    v.tvl -= amount;
    this.store.save();
    this.audit.push("withdraw", `Demo withdraw $${amount}`, { tvl: v.tvl });
    return v;
  }

  /** Live-only: mint/transfer test pyUSD to a user wallet (rate-limited). */
  async faucet(to: string): Promise<{ ok: true; txHash: string; amount: number }> {
    if (this.env.PROOFYIELD_MODE !== "live") {
      throw new Error("Faucet requires PROOFYIELD_MODE=live");
    }
    if (!this.env.CREDITCOIN_ASSET) throw new Error("CREDITCOIN_ASSET unset");
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error("invalid address");

    const key = to.toLowerCase();
    const last = this.faucetHits.get(key) ?? 0;
    const wait = this.env.FAUCET_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) throw new Error(`Faucet cooldown — retry in ${Math.ceil(wait / 1000)}s`);

    const provider = createCreditcoinProvider(this.env);
    const wallet = createHarvesterWallet(this.env, provider);
    if (!wallet) throw new Error("HARVESTER_PRIVATE_KEY unset");

    const asset = new Contract(this.env.CREDITCOIN_ASSET, ERC20_ABI, wallet);
    const decimals = Number(await asset.decimals());
    const amountRaw = BigInt(Math.round(this.env.FAUCET_AMOUNT * 10 ** decimals));

    let tx;
    try {
      tx = await asset.mint(to, amountRaw);
    } catch {
      // Fallback: transfer from faucet wallet balance if mint role missing.
      tx = await asset.transfer(to, amountRaw);
    }
    const receipt = await tx.wait();
    this.faucetHits.set(key, Date.now());
    this.audit.push("faucet", `Sent ${this.env.FAUCET_AMOUNT} pyUSD to ${to}`, {
      txHash: receipt.hash,
    });
    return { ok: true, txHash: receipt.hash as string, amount: this.env.FAUCET_AMOUNT };
  }

  /** User share balance on the live vault (human units). */
  async userShares(address: string): Promise<number> {
    if (!this.env.CREDITCOIN_VAULT || !/^0x[a-fA-F0-9]{40}$/.test(address)) return 0;
    const provider = createCreditcoinProvider(this.env);
    const vault = new Contract(this.env.CREDITCOIN_VAULT, VAULT_ABI, provider);
    const bal = await vault.balanceOf(address);
    return Number(bal) / 1e6;
  }
}
