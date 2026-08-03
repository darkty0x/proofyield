"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { VaultChart } from "./chart";
import { WalletButton } from "./wallet-button";
import { BrandLogo, ThemeToggle } from "@/components/brand-logo";
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

type Tab = "vault" | "portfolio" | "proofs" | "allocator";
type Action = "deposit" | "withdraw";

const FILTERS = ["all", "harvested", "attested", "pending", "attesting", "rejected"] as const;

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
  const [proofs, setProofs] = useState<ProofItem[]>(TEMPLATE_PROOFS);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("1000");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"tvl" | "sharePrice">("tvl");

  const refresh = useCallback(async () => {
    try {
      const [s, h, p, src] = await Promise.all([
        api.status(),
        api.history(30),
        api.proofs(query, filter === "all" ? "all" : filter),
        api.sources(),
      ]);
      setStatus(s);
      setHistory(h.items);
      setProofs(p.items.length > 0 ? p.items : TEMPLATE_PROOFS);
      setSources(src.items);
      setError(null);
    } catch (err) {
      setProofs(TEMPLATE_PROOFS);
      setError(err instanceof Error ? err.message : "API unreachable");
    }
  }, [filter, query]);

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
  const myShares = status?.depositorShares ?? 0;
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
    const n = Number(amount);
    if (!(n > 0)) return;
    if (action === "deposit") {
      void run(() => api.deposit(n), `Deposited ${formatNumber(n)} ${asset}`);
    } else {
      void run(() => api.withdraw(n), `Withdrew ${formatNumber(n)} ${asset}`);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.bgGlow} aria-hidden />

      <header className={styles.topNav}>
        <BrandLogo />

        <nav className={styles.navLinks}>
          <Link href="/#how">How it works</Link>
          <Link href="/#engines">Strategy</Link>
          <Link href="/#markets">Markets</Link>
          <Link href="/#compare">Yield</Link>
          <Link href="/#powered">Infrastructure</Link>
        </nav>

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
                    <span className={styles.badgeMuted}>RWA · AI</span>
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
                  {status?.vaultAddress ? (
                    <a
                      className={styles.ext}
                      href={`${explorers.ctc}/address/${status.vaultAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on explorer →
                    </a>
                  ) : (
                    <p className={styles.muted}>Demo vault · live address after CC3 deploy</p>
                  )}
                </article>

                <article className={styles.detailCard}>
                  <h3>Strategy</h3>
                  <p>
                    AI allocator routes coupons from Sepolia RWA desks. NAV only rises after Attestcoin
                    proves inclusion on Creditcoin — no bridges, no centralized oracles.
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
                    src="/brand/pyusd-flat.png"
                    alt=""
                    width={28}
                    height={28}
                    className={styles.coinPyusd}
                  />
                  <span>
                    {asset} → {share}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/pyvusd-flat.png"
                    alt=""
                    width={22}
                    height={22}
                    className={styles.coinPyvusd}
                  />
                </div>

                <label className={styles.amountLabel}>Amount</label>
                <div className={styles.amountBox}>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
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

                <button className={styles.submit} type="submit" disabled={busy}>
                  {busy ? "Working…" : action === "deposit" ? `Deposit ${asset}` : `Withdraw ${asset}`}
                </button>
              </form>

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
            </aside>
          </div>
        ) : null}

        {tab === "portfolio" ? (
          <section className={styles.portfolio}>
            <div className={styles.portfolioHead}>
              <h1 className={styles.vaultTitle}>My portfolio</h1>
              <p className={styles.portfolioLead}>
                Your {share} position in the ProofYield RWA vault — value moves only after Attestcoin-proven
                harvests.
              </p>
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

            <div className={styles.detailGrid}>
              <article className={styles.detailCard}>
                <h3>Position</h3>
                <dl>
                  <div>
                    <dt>Shares</dt>
                    <dd>
                      {formatNumber(myShares, { maximumFractionDigits: 4 })} {share}
                    </dd>
                  </div>
                  <div>
                    <dt>Value</dt>
                    <dd>{formatUsd(myValue)}</dd>
                  </div>
                  <div>
                    <dt>Underlying</dt>
                    <dd>{asset}</dd>
                  </div>
                  <div>
                    <dt>Vault TVL</dt>
                    <dd>{tvl}</dd>
                  </div>
                </dl>
                <button type="button" className={styles.secondary} onClick={() => setTab("vault")}>
                  Deposit or withdraw
                </button>
              </article>
              <article className={styles.detailCard}>
                <h3>Activity</h3>
                <p>
                  Proven yield accrued vault-wide: {formatUsd(status?.totalHarvested ?? 0)} across{" "}
                  {status?.harvestCount ?? 0} harvests. Your share of NAV rises automatically when coupons clear
                  Attestcoin.
                </p>
                <button type="button" className={styles.secondary} onClick={() => setTab("proofs")}>
                  Review proofs
                </button>
              </article>
            </div>
          </section>
        ) : null}

        {tab === "proofs" ? (
          <section className={styles.panelWide}>
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                placeholder="Filter by tx, metadata, source…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className={styles.chips}>
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={filter === f ? styles.chipOn : styles.chip}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.table}>
              <div className={styles.thead}>
                <span>Coupon</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Updated</span>
              </div>
              {displayProofs.length === 0 ? (
                <div className={styles.empty}>No proofs match this filter.</div>
              ) : (
                displayProofs.map((p) => {
                  const open = openId === p.id;
                  return (
                    <div key={p.id} className={styles.tblock}>
                      <button
                        type="button"
                        className={styles.trow}
                        onClick={() => setOpenId(open ? null : p.id)}
                      >
                        <span>
                          Source {p.coupon.sourceId} · #{p.coupon.couponId}
                        </span>
                        <span className={styles.mono}>{formatUsd(p.coupon.amount)}</span>
                        <span className={`${styles.status} ${styles[`st_${p.status}`] ?? ""}`}>
                          {p.status}
                        </span>
                        <span className={styles.muted}>{new Date(p.updatedAt).toLocaleString()}</span>
                      </button>
                      {open ? (
                        <div className={styles.detail}>
                          <p>{p.decision?.rationale}</p>
                          <p>
                            <span className={styles.muted}>Sepolia </span>
                            <span className={styles.mono}>{p.coupon.sepoliaTxHash}</span>
                          </p>
                          {p.harvest?.ctcTxHash ? (
                            <p>
                              <span className={styles.muted}>Harvest </span>
                              <span className={styles.mono}>{p.harvest.ctcTxHash}</span>
                              {p.harvest.sharePriceAfter != null
                                ? ` · NAV ${p.harvest.sharePriceAfter.toFixed(6)}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {tab === "allocator" ? (
          <section className={styles.allocGrid}>
            {sources.map((s) => {
              const art =
                ALLOC_ART[s.name] ??
                TRANCHE_ART[s.tranche] ??
                "/brand/crystal/crystal-hold.jpg";
              return (
                <article key={s.sourceId} className={styles.allocCard} aria-readonly="true">
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
                      <div className={styles.barFill} style={{ width: `${s.targetWeightBps / 100}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
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
                <Link href="/#usc">Proof model</Link>
              </nav>
            </div>
            <div>
              <h3 className={styles.footerColTitle}>Build</h3>
              <nav className={styles.footerColLinks}>
                <Link href="/">Marketing site</Link>
                <a href="https://github.com/darkty0x/proofyield" target="_blank" rel="noreferrer">
                  GitHub
                </a>
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
