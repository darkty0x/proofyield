"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { VaultChart } from "./chart";
import styles from "./app.module.css";
import {
  api,
  explorers,
  formatApy,
  formatSupply,
  formatUsd,
  type HistoryPoint,
  type ProofItem,
  type SourceItem,
  type VaultStatus,
} from "@/lib/api";

type Tab = "vault" | "proofs" | "allocator";
type Action = "deposit" | "withdraw";

const FILTERS = ["all", "harvested", "attested", "pending", "attesting", "rejected"] as const;

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
      setProofs(p.items);
      setSources(src.items);
      setError(null);
    } catch (err) {
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
      void run(() => api.deposit(n), `Deposited ${amount} ${asset}`);
    } else {
      void run(() => api.withdraw(n), `Withdrew ${amount} ${asset}`);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.bgGlow} aria-hidden />

      <header className={styles.topNav}>
        <Link href="/" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/proofyield-mark.svg" alt="" width={28} height={28} />
          ProofYield
        </Link>

        <nav className={styles.menu}>
          {(
            [
              ["vault", "Vault"],
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

        <div className={styles.topRight}>
          <span className={styles.mode}>
            <i className={status?.live ? styles.dotLive : styles.dotDemo} />
            {status?.live ? "Live" : status?.statusLabel ?? "Demo"}
          </span>
          <Link href="/" className={styles.siteLink}>
            Marketing
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        {error ? <div className={styles.bannerErr}>{error}</div> : null}
        {flash ? <div className={styles.bannerOk}>{flash}</div> : null}

        {tab === "vault" ? (
          <div className={styles.vaultLayout}>
            <section className={styles.vaultInfo}>
              <div className={styles.vaultHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/pyvusd-coin.png" alt="" width={48} height={48} className={styles.vaultCoin} />
                <div>
                  <h1 className={styles.vaultTitle}>ProofYield RWA Vault</h1>
                  <div className={styles.badges}>
                    <span className={styles.badge}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/pyvusd-coin.png" alt="" width={14} height={14} />
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
                      <dd>{status?.depositorShares?.toFixed(2) ?? "—"}</dd>
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
                      <span className={styles.ic}>①</span> Observe CouponPaid
                    </li>
                    <li>
                      <span className={styles.ic}>②</span> Attest on CC3
                    </li>
                    <li>
                      <span className={styles.ic}>③</span> Verify + accrue
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
                  <img src="/brand/pyusd-coin.png" alt="" width={22} height={22} />
                  <span>
                    {asset} → {share}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/pyvusd-coin.png" alt="" width={22} height={22} />
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
                        ? (Number(amount || 0) / status.sharePrice).toFixed(2)
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
              {proofs.length === 0 ? (
                <div className={styles.empty}>No proofs yet. Run Prove & harvest from Vault.</div>
              ) : (
                proofs.map((p) => {
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
            {sources.map((s) => (
              <article key={s.sourceId} className={styles.allocCard}>
                <div className={styles.allocTop}>
                  <div className={styles.allocId}>SRC {s.sourceId}</div>
                  <div className={styles.status}>{s.active ? "active" : "paused"}</div>
                </div>
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
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
