"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { VaultChart } from "./chart";
import { WalletButton } from "./wallet-button";
import { BrandLogo, ThemeToggle } from "@/components/brand-logo";
import { SiteNavLinks } from "@/components/site-nav";
import { TransitionLink } from "@/components/transition-link";
import { SocialLinks } from "@/components/social-links";
import { useWalletContext } from "@/components/wallet-provider";
import styles from "./app.module.css";
import {
  api,
  explorers,
  formatApy,
  formatNumber,
  formatSupply,
  formatUsd,
  type HistoryPoint,
  type ProofItem,
  type SourceItem,
  type VaultStatus,
} from "@/lib/api";
import { isTxHash, proofDetail, proofExplorerHref, proofTitle } from "@/lib/proof-display";
import {
  depositAssets,
  fetchUserVaultActivity,
  redeemShares,
  type ChainActivity,
} from "@/lib/vault-tx";
import { deploymentRows } from "@/lib/deployments";

type Tab = "vault" | "portfolio" | "proofs" | "allocator" | "contracts";
type Action = "deposit" | "withdraw";

const FILTERS = ["all", "harvested", "attested", "pending", "attesting", "rejected"] as const;

const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  all: "All",
  harvested: "Harvested",
  attested: "Attested",
  pending: "Pending",
  attesting: "Attesting",
  rejected: "Rejected",
};

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function shortTx(h?: string | null): string {
  if (!h) return "—";
  if (h.length < 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function buildPortfolioActivity(opts: {
  myShares: number;
  asset: string;
  share: string;
  sharePrice: number;
  proofs: ProofItem[];
  live: boolean;
  inventDeposit?: boolean;
}): {
  id: string;
  kind: "deposit" | "withdraw" | "yield";
  label: string;
  detail: string;
  amount: string;
  tone: "in" | "out" | "flat";
  at: string;
  href?: string | null;
}[] {
  const { myShares, asset, share, sharePrice, proofs, live, inventDeposit } = opts;
  const rows: {
    id: string;
    kind: "deposit" | "withdraw" | "yield";
    label: string;
    detail: string;
    amount: string;
    tone: "in" | "out" | "flat";
    at: string;
    href?: string | null;
  }[] = [];

  // Only invent a deposit row in demo mode for empty wallets UX.
  if (!live && inventDeposit !== false && myShares > 0) {
    const deposited = myShares * Math.min(sharePrice, 1.002);
    rows.push({
      id: "pos-deposit",
      kind: "deposit",
      label: `Deposited ${asset}`,
      detail: `Minted ${formatNumber(myShares, { maximumFractionDigits: 2 })} ${share}`,
      amount: `+${formatUsd(deposited)}`,
      tone: "in",
      at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    });
  }

  for (const p of proofs) {
    if (p.status !== "harvested" && p.status !== "attested") continue;
    const href = proofExplorerHref(p);
    rows.push({
      id: `yield-${p.id}`,
      kind: "yield",
      label: "Proven harvest",
      detail: proofDetail(p),
      amount:
        p.harvest?.sharePriceAfter != null
          ? `NAV ${p.harvest.sharePriceAfter.toFixed(4)}`
          : formatUsd(p.coupon.amount),
      tone: "flat",
      at: p.updatedAt,
      href,
    });
  }

  return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

const ALLOC_ART: Record<string, string> = {
  "T-Bill Proxy Desk": "/brand/crystal/crystal-equities.jpg",
  "Trade Finance Invoice Pool": "/brand/crystal/crystal-engine-funding.jpg",
  "Emerging Market Receivables": "/brand/crystal/crystal-fx.jpg",
};

const TRANCHE_ART: Record<string, string> = {
  treasury: "/brand/crystal/crystal-equities.jpg",
  senior: "/brand/crystal/crystal-engine-funding.jpg",
  mezz: "/brand/crystal/crystal-fx.jpg",
};

/** Demo rows so Proofs UI can be reviewed without a live harvest. */
const TEMPLATE_PROOFS: ProofItem[] = [
  {
    id: "tpl-harvested-1",
    status: "harvested",
    coupon: {
      sourceId: 1,
      couponId: 1042,
      amount: 2450,
      metadata: "T-Bill Proxy Desk · CouponPaid",
      sepoliaTxHash: "0x8a1c2b3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcd",
      blockNumber: 5_812_440,
      observedAt: "2026-08-02T14:22:00.000Z",
    },
    decision: {
      action: "accept",
      riskScore: 18,
      rationale: "Within TVL cap and risk band for treasury tranche. Attestcoin inclusion verified.",
      sourceRank: 1,
    },
    attestcoin: { verified: true, headerNumber: 1_204_551, chainKey: 11155111 },
    harvest: {
      ctcTxHash: "0xctc91aa22bb33cc44dd55ee66ff77889900112233445566778899aabbccddee",
      sharePriceAfter: 1.00482,
    },
    updatedAt: "2026-08-02T14:23:12.000Z",
  },
  {
    id: "tpl-attested-2",
    status: "attested",
    coupon: {
      sourceId: 2,
      couponId: 881,
      amount: 1800,
      metadata: "Trade Finance Invoice Pool · CouponPaid",
      sepoliaTxHash: "0x71ff00aa11bb22cc33dd44ee55ff6677889900aabbccddeeff001122334455",
      blockNumber: 5_812_901,
      observedAt: "2026-08-03T09:10:00.000Z",
    },
    decision: {
      action: "accept",
      riskScore: 32,
      rationale: "Senior invoice pool coupon cleared risk score. Waiting harvest accrual.",
      sourceRank: 2,
    },
    attestcoin: { verified: true, headerNumber: 1_204_880, chainKey: 11155111 },
    updatedAt: "2026-08-03T09:11:40.000Z",
  },
  {
    id: "tpl-attesting-3",
    status: "attesting",
    coupon: {
      sourceId: 3,
      couponId: 512,
      amount: 960,
      metadata: "Emerging Market Receivables · CouponPaid",
      sepoliaTxHash: "0x55aa66bb77cc88dd99ee00ff11223344556677889900aabbccddeeff001122",
      blockNumber: 5_813_120,
      observedAt: "2026-08-03T18:40:00.000Z",
    },
    decision: {
      action: "accept",
      riskScore: 41,
      rationale: "Mezz coupon accepted under weight limit. Attestcoin proof in flight.",
      sourceRank: 3,
    },
    attestcoin: { verified: false, chainKey: 11155111 },
    updatedAt: "2026-08-03T18:40:55.000Z",
  },
  {
    id: "tpl-pending-4",
    status: "pending",
    coupon: {
      sourceId: 1,
      couponId: 1048,
      amount: 1200,
      metadata: "T-Bill Proxy Desk · CouponPaid",
      sepoliaTxHash: "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
      blockNumber: 5_813_400,
      observedAt: "2026-08-04T01:05:00.000Z",
    },
    decision: {
      action: "queue",
      riskScore: 22,
      rationale: "Queued for AI allocator scoring against current desk weights.",
      sourceRank: 1,
    },
    updatedAt: "2026-08-04T01:05:20.000Z",
  },
  {
    id: "tpl-rejected-5",
    status: "rejected",
    coupon: {
      sourceId: 3,
      couponId: 490,
      amount: 4200,
      metadata: "Emerging Market Receivables · CouponPaid",
      sepoliaTxHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      blockNumber: 5_811_002,
      observedAt: "2026-08-01T11:00:00.000Z",
    },
    decision: {
      action: "reject",
      riskScore: 78,
      rationale: "Exceeds mezz TVL cap and risk ceiling — coupon not attested.",
      sourceRank: 3,
    },
    error: "Risk ceiling breached",
    updatedAt: "2026-08-01T11:00:45.000Z",
  },
];

export default function VaultAppPage() {
  const [tab, setTab] = useState<Tab>("vault");
  const [action, setAction] = useState<Action>("deposit");
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("1000");
  const [openId, setOpenId] = useState<string | null>(null);
  const [allocOpenId, setAllocOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"tvl" | "sharePrice">("tvl");
  const [chainActivity, setChainActivity] = useState<ChainActivity[]>([]);
  const wallet = useWalletContext();
  const isLive = Boolean(status?.live);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openContracts = () => {
      if (window.location.hash === "#deployments") setTab("contracts");
    };
    openContracts();
    window.addEventListener("hashchange", openContracts);
    return () => window.removeEventListener("hashchange", openContracts);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, h, p, src] = await Promise.all([
        api.status(wallet.address ?? undefined),
        api.history(30),
        api.proofs(query, filter === "all" ? "all" : filter),
        api.sources(),
      ]);
      setStatus(s);
      setHistory(h.items);
      // Live: never fall back to template proofs. Demo: templates only if empty.
      if (s.live) {
        setProofs(p.items);
      } else {
        setProofs(p.items.length > 0 ? p.items : TEMPLATE_PROOFS);
      }
      setSources(src.items);
      setError(null);

      if (s.live && wallet.address && s.vaultAddress) {
        const rows = await fetchUserVaultActivity(s.vaultAddress, wallet.address, explorers.ctc);
        setChainActivity(rows);
      } else {
        setChainActivity([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API unreachable");
    }
  }, [filter, query, wallet.address]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 6_000);
    return () => clearInterval(t);
  }, [refresh]);

  const apy = useMemo(
    () => formatApy(status?.promisedApyBps ?? status?.apyBps ?? 0),
    [status],
  );
  const tvl = useMemo(() => formatUsd(status?.tvl ?? 0), [status]);
  const supply = useMemo(() => formatSupply(status?.tokenSupply ?? 0), [status]);
  const share = status?.shareSymbol ?? "pyvUSD";
  const asset = status?.assetSymbol ?? "pyUSD";
  // Live: prefer wallet share balance; demo: vault depositorShares snapshot.
  const myShares =
    isLive && status?.userShares != null
      ? status.userShares
      : isLive
        ? 0
        : (status?.depositorShares ?? 0);
  const myValue = myShares * (status?.sharePrice ?? 1);
  const displayProofs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proofs.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      const hay = [
        p.id,
        p.status,
        p.coupon.metadata,
        p.coupon.sepoliaTxHash,
        String(p.coupon.sourceId),
        String(p.coupon.couponId),
        p.harvest?.ctcTxHash ?? "",
        p.decision?.rationale ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [proofs, filter, query]);

  const portfolioPoints = useMemo<HistoryPoint[]>(() => {
    if (history.length === 0) return [];
    const shares = Math.max(myShares, 0);
    return history.map((p) => ({
      ...p,
      tvl: p.sharePrice * shares,
    }));
  }, [history, myShares]);

  const portfolioActivity = useMemo(() => {
    const fromProofs = buildPortfolioActivity({
      myShares,
      asset,
      share,
      sharePrice: status?.sharePrice ?? 1,
      proofs,
      live: isLive,
    });
    const fromChain = chainActivity.map((tx) => ({
      id: tx.id,
      kind: tx.kind as "deposit" | "withdraw" | "yield",
      label: tx.label,
      detail: tx.detail,
      amount: tx.amount,
      tone: tx.tone as "in" | "out" | "flat",
      at: tx.at,
      href: tx.href,
    }));
    return [...fromChain, ...fromProofs].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [myShares, asset, share, status?.sharePrice, proofs, isLive, chainActivity]);

  const openSource = useMemo(
    () => sources.find((s) => s.sourceId === allocOpenId) ?? null,
    [sources, allocOpenId],
  );

  const openSourceProofs = useMemo(() => {
    if (allocOpenId == null) return [];
    return proofs.filter((p) => p.coupon.sourceId === allocOpenId);
  }, [proofs, allocOpenId]);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setFlash(null);
    try {
      await fn();
      await refresh();
      setFlash(okMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    // Live disconnected: primary CTA must open the wallet prompt (not silently no-op).
    if (isLive && !wallet.connected) {
      void wallet.connect();
      return;
    }

    const n = Number(amount);
    if (!(n > 0)) {
      setError("Enter an amount greater than 0");
      return;
    }

    if (isLive) {
      void run(async () => {
        if (!wallet.address) throw new Error("Connect wallet first");
        if (!wallet.onCc3) {
          await wallet.switchToCc3();
          throw new Error("Switch to Creditcoin CC3, then retry");
        }
        const vault = status?.vaultAddress;
        const assetAddr = status?.assetAddress;
        if (!vault || !assetAddr) throw new Error("Live vault addresses not configured");

        if (action === "deposit") {
          const { depositTx } = await depositAssets(wallet.address, vault, assetAddr, n);
          return depositTx;
        }
        const shares = n / (status?.sharePrice ?? 1);
        if (!(shares > 0)) throw new Error("Invalid redeem amount");
        if (shares > myShares + 1e-9) throw new Error("Insufficient shares");
        const { redeemTx } = await redeemShares(wallet.address, vault, shares);
        return redeemTx;
      }, action === "deposit" ? `Deposited ${formatNumber(n)} ${asset}` : `Withdrew ${formatNumber(n)} ${asset}`);
      return;
    }

    if (action === "deposit") {
      void run(() => api.deposit(n), `Deposited ${formatNumber(n)} ${asset}`);
    } else {
      void run(() => api.withdraw(n), `Withdrew ${formatNumber(n)} ${asset}`);
    }
  }

  function onFaucet() {
    if (!wallet.connected) {
      void wallet.connect();
      return;
    }
    void run(async () => {
      if (!wallet.address) throw new Error("Connect wallet first");
      if (!wallet.onCc3) {
        await wallet.switchToCc3();
        throw new Error("Switch to Creditcoin CC3, then retry");
      }
      const r = await api.faucet(wallet.address);
      return r;
    }, "Test pyUSD received");
  }

  return (
    <div className={styles.shell}>
      <div className={styles.bgGlow} aria-hidden />

      <header className={styles.topNav}>
        <BrandLogo />

        <SiteNavLinks className={styles.navLinks} mode="app" />

        <div className={styles.topRight}>
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>

      <nav className={styles.appTabs} aria-label="App sections">
        {(
          [
            ["vault", "Vault"],
            ["portfolio", "Portfolio"],
            ["proofs", "Proofs"],
            ["allocator", "Allocator"],
            ["contracts", "Contracts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.menuItem} ${tab === id ? styles.menuOn : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {error ? <div className={styles.bannerErr}>{error}</div> : null}
        {flash ? <div className={styles.bannerOk}>{flash}</div> : null}

        {tab === "vault" ? (
          <div className={styles.vaultLayout}>
            <section className={styles.vaultInfo}>
              <div className={styles.vaultHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/pyvusd-flat.png" alt="" width={56} height={56} className={styles.vaultCoin} />
                <div>
                  <h1 className={styles.vaultTitle}>ProofYield RWA Vault</h1>
                  <div className={styles.badges}>
                    <span className={styles.badge}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/pyvusd-flat.png" alt="" width={16} height={16} />
                      {share}
                    </span>
                    <span className={styles.badge}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/creditcoin.png" alt="" width={14} height={14} />
                      Creditcoin CC3
                    </span>
                    <span className={styles.badge}>Attestcoin</span>
                    <span
                      className={styles.badgeMuted}
                      data-live={isLive ? "1" : "0"}
                    >
                      {isLive
                        ? "Live"
                        : status?.mode === "live"
                          ? "Offline"
                          : (status?.statusLabel ?? "Demo")}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.metricRow}>
                <div className={styles.metric}>
                  <div className={styles.metricK}>Total APY</div>
                  <div className={styles.metricV}>{apy}</div>
                  <div className={styles.metricHint}>Promised target</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricK}>TVL</div>
                  <div className={styles.metricV}>{tvl}</div>
                  <div className={styles.metricHint}>Deposited {asset}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricK}>NAV</div>
                  <div className={styles.metricV}>{status?.sharePrice?.toFixed(4) ?? "—"}</div>
                  <div className={styles.metricHint}>Per {share}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricK}>pyUSD supply</div>
                  <div className={styles.metricV}>{supply}</div>
                  <div className={styles.metricHint}>Test token mint</div>
                </div>
              </div>

              <div className={styles.chartCard}>
                <div className={styles.chartHead}>
                  <h2>Performance</h2>
                  <div className={styles.chartTabs}>
                    <button
                      type="button"
                      className={chartMetric === "tvl" ? styles.chipOn : styles.chip}
                      onClick={() => setChartMetric("tvl")}
                    >
                      TVL
                    </button>
                    <button
                      type="button"
                      className={chartMetric === "sharePrice" ? styles.chipOn : styles.chip}
                      onClick={() => setChartMetric("sharePrice")}
                    >
                      NAV
                    </button>
                  </div>
                </div>
                <VaultChart points={history} metric={chartMetric} />
              </div>

              <div className={styles.detailGrid}>
                <article className={styles.detailCard}>
                  <h3>Vault details</h3>
                  <dl>
                    <div>
                      <dt>Underlying</dt>
                      <dd>{asset}</dd>
                    </div>
                    <div>
                      <dt>Share</dt>
                      <dd>{share}</dd>
                    </div>
                    <div>
                      <dt>Standard</dt>
                      <dd>ERC-4626</dd>
                    </div>
                    <div>
                      <dt>Harvests</dt>
                      <dd>{status?.harvestCount ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Proven yield</dt>
                      <dd>{formatUsd(status?.totalHarvested ?? 0)}</dd>
                    </div>
                    <div>
                      <dt>Your shares</dt>
                      <dd>
                        {status?.depositorShares != null
                          ? formatNumber(status.depositorShares, {
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={styles.extBtn}
                    onClick={() => setTab("contracts")}
                  >
                    Live deployments →
                  </button>
                </article>

                <article className={styles.detailCard}>
                  <h3>Strategy</h3>
                  <p>
                    Policy allocator routes coupons from Sepolia RWA desks. NAV only rises after
                    Attestcoin proves inclusion on Creditcoin — no bridges, no centralized oracles.
                  </p>
                  <ul className={styles.strategyList}>
                    <li>
                      <span className={styles.ic}>1</span> Observe CouponPaid
                    </li>
                    <li>
                      <span className={styles.ic}>2</span> Attest on CC3
                    </li>
                    <li>
                      <span className={styles.ic}>3</span> Verify + accrue
                    </li>
                  </ul>
                </article>
              </div>
            </section>

            <aside className={styles.trade}>
              <div className={styles.tradeTabs}>
                <button
                  type="button"
                  className={action === "deposit" ? styles.tradeOn : ""}
                  onClick={() => setAction("deposit")}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  className={action === "withdraw" ? styles.tradeOn : ""}
                  onClick={() => setAction("withdraw")}
                >
                  Withdraw
                </button>
              </div>

              <form onSubmit={onSubmit}>
                <div className={styles.assetRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={action === "deposit" ? "/brand/pyusd-flat.png" : "/brand/pyvusd-flat.png"}
                    alt=""
                    width={28}
                    height={28}
                    className={action === "deposit" ? styles.coinPyusd : styles.coinPyvusd}
                  />
                  <span>
                    {action === "deposit" ? `${asset} → ${share}` : `${share} → ${asset}`}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={action === "deposit" ? "/brand/pyvusd-flat.png" : "/brand/pyusd-flat.png"}
                    alt=""
                    width={28}
                    height={28}
                    className={action === "deposit" ? styles.coinPyvusd : styles.coinPyusd}
                  />
                </div>

                <label className={styles.amountLabel}>
                  {action === "deposit" ? "Deposit amount" : "Withdraw amount"}
                </label>
                <div className={styles.amountBox}>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label="Amount"
                  />
                  <span>{asset}</span>
                </div>

                <dl className={styles.tradeMeta}>
                  <div>
                    <dt>Est. shares</dt>
                    <dd>
                      {status?.sharePrice
                        ? formatNumber(Number(amount || 0) / status.sharePrice, {
                            maximumFractionDigits: 2,
                          })
                        : "—"}{" "}
                      {share}
                    </dd>
                  </div>
                  <div>
                    <dt>Promised APY</dt>
                    <dd>{apy}</dd>
                  </div>
                  <div>
                    <dt>Utilization</dt>
                    <dd>
                      {status?.tokenSupply
                        ? `${(((status.tvl ?? 0) / status.tokenSupply) * 100).toFixed(1)}% of supply`
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <button
                  className={styles.submit}
                  type="submit"
                  disabled={busy || (isLive && !wallet.connected && wallet.connecting)}
                >
                  {busy
                    ? "Working…"
                    : wallet.connecting
                      ? "Connecting…"
                      : isLive && !wallet.connected
                        ? "Connect wallet to trade"
                        : action === "deposit"
                          ? `Deposit ${asset}`
                          : `Withdraw ${asset}`}
                </button>
              </form>

              {isLive ? (
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={busy || wallet.connecting}
                  onClick={onFaucet}
                >
                  {wallet.connected ? "Get test pyUSD" : "Connect wallet for faucet"}
                </button>
              ) : (
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const r = await api.harvest({
                        sourceId: 2,
                        amount: Math.min(2500, Math.max(100, (status?.tvl ?? 0) * 0.03)),
                      });
                      setOpenId(r.id);
                      setTab("proofs");
                    }, "Harvest submitted")
                  }
                >
                  Prove & harvest
                </button>
              )}
              {isLive ? (
                <p className={styles.tradeLiveHint}>
                  Live CC3 · coupons harvest via agent after Sepolia Attestcoin proof
                </p>
              ) : null}
              {wallet.error ? <p className={styles.tradeLiveHint}>{wallet.error}</p> : null}
            </aside>
          </div>
        ) : null}

        {tab === "portfolio" ? (
          <section className={styles.portfolio}>
            <div className={styles.pfHero}>
              <div className={styles.pfHeroCopy}>
                <h1 className={styles.pfTitle}>My portfolio</h1>
                <p className={styles.portfolioLead}>
                  Your {share} position in the ProofYield RWA vault — value moves only after
                  Attestcoin-proven harvests.
                </p>
                <div className={styles.pfTokenRow}>
                  <div className={styles.pfToken}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/pyvusd-coin.png" alt="" width={44} height={44} />
                    <div>
                      <strong>{share}</strong>
                      <span>Vault shares</span>
                    </div>
                  </div>
                  <div className={styles.pfToken}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/pyusd-coin.png" alt="" width={44} height={44} />
                    <div>
                      <strong>{asset}</strong>
                      <span>Underlying</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.pfHeroArt} aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/tokens-pair.png" alt="" className={styles.pfPair} />
              </div>
            </div>

            <div className={styles.metricRow}>
              <div className={styles.metric}>
                <div className={styles.metricK}>Your shares</div>
                <div className={styles.metricV}>
                  {formatNumber(myShares, { maximumFractionDigits: 2 })}
                </div>
                <div className={styles.metricHint}>{share}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricK}>Position value</div>
                <div className={styles.metricV}>{formatUsd(myValue)}</div>
                <div className={styles.metricHint}>At live NAV</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricK}>NAV</div>
                <div className={styles.metricV}>{status?.sharePrice?.toFixed(4) ?? "—"}</div>
                <div className={styles.metricHint}>Per {share}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricK}>Promised APY</div>
                <div className={styles.metricV}>{apy}</div>
                <div className={styles.metricHint}>Target on proven yield</div>
              </div>
            </div>

            <div className={styles.pfChartCard}>
              <div className={styles.chartHead}>
                <h2>Position value</h2>
                <span className={styles.pfChartHint}>Personal · shares × NAV</span>
              </div>
              <VaultChart points={portfolioPoints} metric="tvl" />
            </div>

            <div className={styles.pfSplit}>
              <article className={styles.pfHoldings}>
                <h3>Holdings</h3>
                <div className={styles.pfHoldRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/pyvusd-flat.png" alt="" width={48} height={48} />
                  <div className={styles.pfHoldCopy}>
                    <strong>{share}</strong>
                    <span>ERC-4626 vault shares</span>
                  </div>
                  <div className={styles.pfHoldAmt}>
                    <strong>{formatNumber(myShares, { maximumFractionDigits: 2 })}</strong>
                    <span>{formatUsd(myValue)}</span>
                  </div>
                </div>
                <div className={styles.pfHoldRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/pyusd-flat.png" alt="" width={48} height={48} />
                  <div className={styles.pfHoldCopy}>
                    <strong>{asset}</strong>
                    <span>Deposit asset · underlying</span>
                  </div>
                  <div className={styles.pfHoldAmt}>
                    <strong>{formatUsd(myValue)}</strong>
                    <span>At live NAV</span>
                  </div>
                </div>
                <dl className={styles.pfHoldMeta}>
                  <div>
                    <dt>Vault TVL</dt>
                    <dd>{tvl}</dd>
                  </div>
                  <div>
                    <dt>Your share of vault</dt>
                    <dd>
                      {status?.tokenSupply && status.tokenSupply > 0
                        ? `${((myShares / status.tokenSupply) * 100).toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <button type="button" className={styles.secondary} onClick={() => setTab("vault")}>
                  Deposit or withdraw
                </button>
              </article>

              <article className={styles.pfActivity}>
                <div className={styles.pfActivityHead}>
                  <h3>Transaction history</h3>
                  <button type="button" className={styles.pfLinkBtn} onClick={() => setTab("proofs")}>
                    All proofs
                  </button>
                </div>
                {portfolioActivity.length === 0 ? (
                  <div className={styles.proofsEmpty}>No personal activity yet.</div>
                ) : (
                  <ul className={styles.pfTxList}>
                    {portfolioActivity.map((tx) => (
                      <li key={tx.id} className={styles.pfTx}>
                        <div
                          className={`${styles.pfTxIcon} ${
                            tx.kind === "deposit"
                              ? styles.pfTxIn
                              : tx.kind === "withdraw"
                                ? styles.pfTxOut
                                : styles.pfTxYield
                          }`}
                          aria-hidden
                        >
                          {tx.kind === "deposit" ? "+" : tx.kind === "withdraw" ? "−" : "↑"}
                        </div>
                        <div className={styles.pfTxCopy}>
                          <strong>{tx.label}</strong>
                          <span>{tx.detail}</span>
                        </div>
                        <div className={styles.pfTxRight}>
                          <strong
                            className={
                              tx.tone === "in"
                                ? styles.pfAmtIn
                                : tx.tone === "out"
                                  ? styles.pfAmtOut
                                  : undefined
                            }
                          >
                            {tx.amount}
                          </strong>
                          <span>{formatWhen(tx.at)}</span>
                          {tx.href ? (
                            <a href={tx.href} target="_blank" rel="noreferrer">
                              Explorer
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        ) : null}

        {tab === "proofs" ? (
          <section className={styles.proofs}>
            <header className={styles.proofsHead}>
              <div>
                <h1 className={styles.proofsTitle}>Proofs</h1>
                <p className={styles.proofsLead}>
                  Coupon events verified through Attestcoin before harvest.
                </p>
              </div>
              <div className={styles.proofsCount}>
                <span className={styles.proofsCountN}>{displayProofs.length}</span>
                <span className={styles.proofsCountL}>shown</span>
              </div>
            </header>

            <div className={styles.proofsTools}>
              <label className={styles.proofsSearch}>
                <span className={styles.srOnly}>Search proofs</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search source, tx, or note…"
                />
              </label>
              <div className={styles.proofsSeg} role="tablist" aria-label="Proof status">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    className={filter === f ? styles.proofsSegOn : styles.proofsSegBtn}
                    onClick={() => setFilter(f)}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.proofsLedger}>
              <div className={styles.proofsCols} aria-hidden>
                <span>Source</span>
                <span>Coupon</span>
                <span className={styles.proofsEnd}>Amount</span>
                <span>Status</span>
                <span className={styles.proofsEnd}>Updated</span>
              </div>

              {displayProofs.length === 0 ? (
                <div className={styles.proofsEmpty}>
                  {isLive
                    ? "No live proofs yet — post a Sepolia coupon and wait for Attestcoin."
                    : "No proofs match this view."}
                </div>
              ) : (
                displayProofs.map((p) => {
                  const open = openId === p.id;
                  const sepoliaHref = isTxHash(p.coupon.sepoliaTxHash)
                    ? `${explorers.sepolia}/tx/${p.coupon.sepoliaTxHash}`
                    : null;
                  const harvestHref = isTxHash(p.harvest?.ctcTxHash)
                    ? `${explorers.ctc}/tx/${p.harvest!.ctcTxHash}`
                    : null;
                  return (
                    <article
                      key={p.id}
                      className={`${styles.proofsRow} ${open ? styles.proofsRowOpen : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.proofsHit}
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : p.id)}
                      >
                        <span className={styles.proofsSource}>
                          <strong>{proofTitle(p)}</strong>
                          <em>SRC {p.coupon.sourceId}</em>
                        </span>
                        <span className={styles.mono}>#{p.coupon.couponId}</span>
                        <span className={`${styles.mono} ${styles.proofsEnd}`}>
                          {formatUsd(p.coupon.amount)}
                        </span>
                        <span className={`${styles.proofsSt} ${styles[`pst_${p.status}`] ?? ""}`}>
                          <i aria-hidden />
                          {FILTER_LABELS[p.status as Exclude<(typeof FILTERS)[number], "all">] ??
                            p.status}
                        </span>
                        <span className={`${styles.proofsWhen} ${styles.proofsEnd}`}>
                          <time dateTime={p.updatedAt}>{formatWhen(p.updatedAt)}</time>
                          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                            <path
                              d={open ? "M2.5 7.5L6 4l3.5 3.5" : "M2.5 4.5L6 8l3.5-3.5"}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>

                      {open ? (
                        <div className={styles.proofsDetail}>
                          {p.decision?.rationale ? (
                            <p className={styles.proofsRationale}>{p.decision.rationale}</p>
                          ) : null}
                          <dl className={styles.proofsMeta}>
                            <div>
                              <dt>Sepolia</dt>
                              <dd>
                                {sepoliaHref ? (
                                  <a href={sepoliaHref} target="_blank" rel="noreferrer">
                                    {shortTx(p.coupon.sepoliaTxHash)}
                                  </a>
                                ) : (
                                  <span className={styles.mono}>{shortTx(p.coupon.sepoliaTxHash)}</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Harvest</dt>
                              <dd>
                                {harvestHref ? (
                                  <a href={harvestHref} target="_blank" rel="noreferrer">
                                    {shortTx(p.harvest?.ctcTxHash)}
                                  </a>
                                ) : (
                                  <span className={styles.muted}>—</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Risk</dt>
                              <dd className={styles.mono}>
                                {p.decision?.riskScore != null ? p.decision.riskScore : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt>NAV after</dt>
                              <dd className={styles.mono}>
                                {p.harvest?.sharePriceAfter != null
                                  ? p.harvest.sharePriceAfter.toFixed(4)
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {tab === "allocator" ? (
          <section className={styles.alloc}>
            <header className={styles.allocHead}>
              <div>
                <h1 className={styles.allocTitle}>Allocator</h1>
                <p className={styles.allocLead}>
                  Policy target weights across RWA desks. Open a source for details.
                </p>
              </div>
            </header>

            <div className={styles.allocGrid}>
              {sources.map((s) => {
                const art =
                  ALLOC_ART[s.name] ??
                  TRANCHE_ART[s.tranche] ??
                  "/brand/crystal/crystal-hold.jpg";
                const selected = allocOpenId === s.sourceId;
                return (
                  <button
                    key={s.sourceId}
                    type="button"
                    className={`${styles.allocCard} ${selected ? styles.allocCardOn : ""}`}
                    aria-pressed={selected}
                    onClick={() =>
                      setAllocOpenId((cur) => (cur === s.sourceId ? null : s.sourceId))
                    }
                  >
                    <div className={styles.allocMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={art} alt="" className={styles.allocImg} draggable={false} />
                      <div className={styles.allocMediaTop}>
                        <div className={styles.allocId}>SRC {s.sourceId}</div>
                        <div className={styles.status}>{s.active ? "active" : "paused"}</div>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/pyvusd-flat.png"
                        alt=""
                        width={48}
                        height={48}
                        className={styles.allocCoin}
                        draggable={false}
                      />
                    </div>
                    <div className={styles.allocBody}>
                      <h2>{s.name}</h2>
                      <dl className={styles.allocDl}>
                        <div>
                          <dt>Tranche</dt>
                          <dd>{s.tranche}</dd>
                        </div>
                        <div>
                          <dt>Risk</dt>
                          <dd>{s.riskBps} bps</dd>
                        </div>
                        <div>
                          <dt>Weight</dt>
                          <dd>{(s.targetWeightBps / 100).toFixed(1)}%</dd>
                        </div>
                      </dl>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${s.targetWeightBps / 100}%` }}
                        />
                      </div>
                      <span className={styles.allocOpenHint}>
                        {selected ? "Close details" : "View details"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {openSource ? (
              <aside className={styles.allocDetail} aria-live="polite">
                <div className={styles.allocDetailTop}>
                  <div>
                    <div className={styles.allocDetailEyebrow}>SRC {openSource.sourceId}</div>
                    <h2 className={styles.allocDetailTitle}>{openSource.name}</h2>
                    <p className={styles.allocDetailLead}>
                      Policy target sleeve for beta. Weights are static desk targets — not
                      live AI decisions.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.allocDetailClose}
                    onClick={() => setAllocOpenId(null)}
                  >
                    Close
                  </button>
                </div>

                <dl className={styles.allocDetailGrid}>
                  <div>
                    <dt>Tranche</dt>
                    <dd>{openSource.tranche}</dd>
                  </div>
                  <div>
                    <dt>Risk band</dt>
                    <dd className={styles.mono}>{openSource.riskBps} bps</dd>
                  </div>
                  <div>
                    <dt>Target weight</dt>
                    <dd className={styles.mono}>{(openSource.targetWeightBps / 100).toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{openSource.active ? "Active" : "Paused"}</dd>
                  </div>
                  <div>
                    <dt>Est. sleeve TVL</dt>
                    <dd className={styles.mono}>
                      {formatUsd(((status?.tvl ?? 0) * openSource.targetWeightBps) / 10_000)}
                    </dd>
                  </div>
                  <div>
                    <dt>Related proofs</dt>
                    <dd className={styles.mono}>{openSourceProofs.length}</dd>
                  </div>
                </dl>

                <div className={styles.allocDetailActions}>
                  <button
                    type="button"
                    className={styles.allocDetailPrimary}
                    onClick={() => {
                      setQuery(String(openSource.sourceId));
                      setFilter("all");
                      setTab("proofs");
                    }}
                  >
                    Open related proofs
                  </button>
                </div>
              </aside>
            ) : null}
          </section>
        ) : null}

        {tab === "contracts" ? (
          <section className={styles.contractsPanel} id="deployments">
            <div className={styles.contractsHead}>
              <div>
                <h1 className={styles.vaultTitle}>Live deployments</h1>
                <p className={styles.portfolioLead}>
                  Every contract address with a direct link to the block explorer — Sepolia RWA source
                  and Creditcoin CC3 vault stack.
                </p>
              </div>
            </div>
            <div className={styles.deployGrid}>
              {deploymentRows(status).map((row) => (
                <a
                  key={row.id}
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.deployCard}
                >
                  <div className={styles.deployTop}>
                    <span className={styles.deployLabel}>{row.label}</span>
                    <span className={styles.deployChain}>{row.chain}</span>
                  </div>
                  <code className={styles.deployAddr} title={row.address}>
                    {row.address}
                  </code>
                  <span className={styles.deployScan}>View on {row.explorerLabel} →</span>
                </a>
              ))}
            </div>
            <p className={styles.contractsFoot}>
              Full address list ·{" "}
              <a
                href="https://github.com/darkty0x/proofyield/blob/main/docs/proofs/testnet-txs.md"
                target="_blank"
                rel="noreferrer"
              >
                Proof txs
              </a>
              {" · "}
              <a
                href="https://github.com/darkty0x/proofyield/blob/main/deployments/testnet.json"
                target="_blank"
                rel="noreferrer"
              >
                deployments/testnet.json
              </a>
            </p>
          </section>
        ) : null}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <BrandLogo markSize={28} onDark />
            <p className={styles.footerTag}>
              RWA yield vault with Attestcoin proofs on Creditcoin CC3.
            </p>
            <SocialLinks />
          </div>

          <div className={styles.footerCols}>
            <div>
              <h3 className={styles.footerColTitle}>App</h3>
              <nav className={styles.footerColLinks}>
                <button type="button" onClick={() => setTab("vault")}>
                  Vault
                </button>
                <button type="button" onClick={() => setTab("portfolio")}>
                  Portfolio
                </button>
                <button type="button" onClick={() => setTab("proofs")}>
                  Proofs
                </button>
                <button type="button" onClick={() => setTab("allocator")}>
                  Allocator
                </button>
                <button type="button" onClick={() => setTab("contracts")}>
                  Contracts
                </button>
              </nav>
            </div>
            <div>
              <h3 className={styles.footerColTitle}>Protocol</h3>
              <nav className={styles.footerColLinks}>
                <a href="https://creditcoin.org/" target="_blank" rel="noreferrer">
                  Creditcoin
                </a>
                <a href="https://docs.creditcoin.org/creditcoin-usc" target="_blank" rel="noreferrer">
                  Attestcoin docs
                </a>
                <TransitionLink href="/#usc">Proof model</TransitionLink>
              </nav>
            </div>
            <div>
              <h3 className={styles.footerColTitle}>Build</h3>
              <nav className={styles.footerColLinks}>
                <a
                  href="https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail"
                  target="_blank"
                  rel="noreferrer"
                >
                  DoraHacks CTC
                </a>
              </nav>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 ProofYield · BUIDL CTC 2026 Fall</span>
          <span>DeFi + RWA + AI · Powered by Creditcoin</span>
        </div>
      </footer>
    </div>
  );
}
