"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo, ThemeToggle } from "@/components/brand-logo";
import { SiteNavLinks } from "@/components/site-nav";
import { TransitionLink } from "@/components/transition-link";
import { useTheme } from "@/components/theme";
import { api, formatApy, formatSupply, formatUsd, type HistoryPoint } from "@/lib/api";
import styles from "./landing.module.css";

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    // Paint anything already in view immediately (IO can miss first paint).
    requestAnimationFrame(() => {
      nodes.forEach((n) => {
        const rect = n.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          n.classList.add("in");
          io.unobserve(n);
        }
      });
    });
    return () => io.disconnect();
  }, []);
}

const POWERED = [
  {
    name: "Creditcoin",
    href: "https://creditcoin.org/",
    src: "/brand/partners/creditcoin-wordmark.png",
    invertOnDark: true,
    wide: true,
    blurb: "L1 for cross-chain builders",
  },
  {
    name: "Attestcoin",
    href: "https://docs.creditcoin.org/creditcoin-usc",
    src: "/brand/partners/attestcoin.svg",
    invertOnDark: true,
    wide: true,
    blurb: "Decentralized oracle / USC",
  },
  {
    name: "Credit Labs",
    href: "https://creditcoin.org/Fund",
    src: "/brand/partners/creditlabs.svg",
    invertOnDark: true,
    wide: true,
    blurb: "CEIP ecosystem fund",
  },
  {
    name: "DoraHacks",
    href: "https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail",
    src: "/brand/partners/dorahacks.svg",
    srcDark: "/brand/partners/dorahacks-dark.svg",
    invertOnDark: false,
    wide: true,
    blurb: "BUIDL CTC 2026 Fall",
  },
  {
    name: "Gluwa",
    href: "https://www.gluwa.com/",
    src: "/brand/partners/gluwa-wordmark.png",
    invertOnDark: true,
    wide: true,
    blurb: "Creditcoin technology",
  },
];

function NavSpark({ points }: { points: HistoryPoint[] }) {
  const d = useMemo(() => {
    const pts = points.length
      ? points.map((p) => p.sharePrice)
      : [1, 1.0012, 1.0021, 1.0034, 1.0048];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(max - min, 0.0004);
    const line = pts
      .map((v, i) => {
        const x = (i / Math.max(pts.length - 1, 1)) * 280;
        const y = 72 - ((v - min) / span) * 56;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    const lastX = 280;
    const lastY = 72 - ((pts[pts.length - 1] - min) / span) * 56;
    const area = `${line} L${lastX.toFixed(1)} 80 L0 80 Z`;
    return { line, area, lastX, lastY };
  }, [points]);

  return (
    <svg className={styles.navSpark} viewBox="0 0 280 80" fill="none" aria-hidden>
      <defs>
        <linearGradient id="navStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3d8bff" />
          <stop offset="100%" stopColor="#8fd3ff" />
        </linearGradient>
        <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(61, 139, 255, 0.28)" />
          <stop offset="100%" stopColor="rgba(61, 139, 255, 0)" />
        </linearGradient>
      </defs>
      <path d={d.area} fill="url(#navFill)" />
      <path
        d={d.line}
        stroke="url(#navStroke)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={d.lastX} cy={d.lastY} r="3.5" fill="#3d8bff" />
    </svg>
  );
}

export default function LandingPage() {
  const { theme } = useTheme();
  const darkSurface = theme !== "light";
  const [apy, setApy] = useState("8.42%");
  const [tvl, setTvl] = useState("$1.26M");
  const [nav, setNav] = useState("1.0048");
  const [supply, setSupply] = useState("10M");
  const [updatedAgo, setUpdatedAgo] = useState("just now");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  useReveal();

  const partnerSrc = (p: (typeof POWERED)[number]) =>
    darkSurface && p.srcDark ? p.srcDark : p.src;
  const partnerLogoClass = (p: (typeof POWERED)[number], base: string) =>
    `${base}${darkSurface && p.invertOnDark ? ` ${styles.logoOnDark}` : ""}`;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, h] = await Promise.all([api.status(), api.history(30)]);
        if (!alive) return;
        setApy(formatApy(s.promisedApyBps ?? s.apyBps));
        setTvl(formatUsd(s.tvl));
        setNav(s.sharePrice.toFixed(4));
        setHistory(h.items);
        if (s.tokenSupply) {
          setSupply(formatSupply(s.tokenSupply));
        }
        if (s.lastSuccessAt) {
          const sec = Math.max(0, Math.round((Date.now() - new Date(s.lastSuccessAt).getTime()) / 1000));
          setUpdatedAgo(sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`);
        } else {
          setUpdatedAgo("live");
        }
      } catch {
        /* keep seeded defaults */
      }
    };
    void load();
    const t = setInterval(() => void load(), 12_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const compareRows = [
    {
      name: "ProofYield pyvUSD",
      tags: ["RWA", "ATTESTCOIN"],
      rate: apy,
      bar: 100,
      hot: true,
      icon: "/brand/pyvusd-flat.png",
    },
    {
      name: "US Treasuries",
      tags: ["TRADFI"],
      rate: "4.3%",
      bar: 51,
      hot: false,
      icon: "/brand/pyusd-flat.png",
    },
    {
      name: "Fintech savings",
      tags: ["TRADFI"],
      rate: "4.0%",
      bar: 47,
      hot: false,
      icon: "/brand/proofyield-mark.svg",
    },
    {
      name: "Banks",
      tags: ["TRADFI"],
      rate: "0.4%",
      bar: 8,
      hot: false,
      icon: "/brand/creditcoin.png",
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <BrandLogo />
          <SiteNavLinks className={styles.navLinks} mode="landing" />
          <div className={styles.navRight}>
            <ThemeToggle />
            <TransitionLink href="/app" className={styles.navCta}>
              Start earning
            </TransitionLink>
          </div>
        </div>
      </header>

      <div className={styles.heroFrame}>
        <section className={styles.hero}>
          <div className={styles.pillars} aria-hidden>
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className={styles.pillar}
                style={{
                  animationDelay: `${i * 0.35}s`,
                  ["--glow" as string]: i % 2 === 0 ? "0.55" : "0.28",
                }}
              />
            ))}
            <div className={styles.heroVeil} />
          </div>

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.partnerRow}>
                <span className={styles.partnerLive}>
                  <i />
                  <Image
                    src="/brand/creditcoin.png"
                    alt=""
                    width={16}
                    height={16}
                    className={styles.partnerIcon}
                  />
                  Attestcoin · live on Creditcoin CC3
                </span>
                <span className={styles.partner}>RWA · DeFi · AI</span>
              </div>
              <h1 className={styles.h1}>
                Deposit once.
                <br />
                <em>Read every proof.</em>
              </h1>
              <p className={styles.sub}>
                ProofYield is the RWA yield vault for Creditcoin. An AI allocator routes capital to
                real-world coupons. Share price only moves after Sepolia cashflows are verified by
                Attestcoin — no bridges, no centralized oracles, no emission farming.
              </p>
              <div className={styles.ctaRow}>
                <TransitionLink href="/app" className={styles.ctaPrimary}>
                  <span>Open vault</span>
                  <span className={styles.ctaArrow} aria-hidden>
                    ↑
                  </span>
                </TransitionLink>
                <a href="#how" className={styles.ctaGhost}>
                  See how it works
                </a>
              </div>
            </div>

            <div className={styles.statUnion} aria-label="Live vault metrics">
              <article className={styles.statCardApy}>
                <div className={styles.statCardTop}>
                  <span className={styles.statPill}>Promised</span>
                  <span className={styles.statLive}>
                    <i /> Live
                  </span>
                </div>
                <div className={styles.statValue}>{apy}</div>
                <div className={styles.statLabelRow}>
                  <span className={styles.statLabel}>APY</span>
                  <span className={styles.statHint}>RWA coupons · Attestcoin-gated</span>
                </div>
                <div className={styles.statBar} aria-hidden>
                  <span style={{ width: "84%" }} />
                </div>
              </article>

              <article className={styles.statCardTvl}>
                <div className={styles.statCardTop}>
                  <span className={styles.statPillDark}>Vault</span>
                </div>
                <div className={styles.statValue}>{tvl}</div>
                <div className={styles.statLabelRow}>
                  <span className={styles.statLabel}>TVL</span>
                  <span className={styles.statHint}>NAV {nav}</span>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>

      {/* HOW IT WORKS — Atoma-style crystal cards */}
      <section className={`${styles.section} ${styles.centerHead} reveal`} id="how">
        <h2 className={styles.h2Center}>Deposit once. Earn with proofs.</h2>
        <p className={styles.leadCenter}>
          Deposit pyUSD, let Attestcoin-gated RWA coupons raise NAV, and redeem shares anytime at live
          price — no bridge trust required.
        </p>
        <div className={`${styles.howNums} reveal-stagger`}>
          {["1", "2", "3"].map((n) => (
            <div key={n} className={`${styles.howNum} reveal-item`} data-from="scale">
              {n}
            </div>
          ))}
        </div>
        <div className={`${styles.howGrid} reveal-stagger`}>
          {[
            {
              t: "Mint pyvUSD",
              d: "Deposit pyUSD, receive ERC-4626 vault shares at the current NAV.",
              img: "/brand/crystal/crystal-mint.jpg",
            },
            {
              t: "Hold & accrue",
              d: "AI routes coupons. Attestcoin proofs clear on CC3. Every accepted harvest lifts share price.",
              img: "/brand/crystal/crystal-hold.jpg",
            },
            {
              t: "Redeem anytime",
              d: "Burn pyvUSD for pyUSD at live NAV. Proven yield stays in the vault accounting.",
              img: "/brand/crystal/crystal-redeem.jpg",
            },
          ].map((c, i) => (
            <article
              key={c.t}
              className={`${styles.howCard} reveal-item`}
              data-from={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <h3>{c.t}</h3>
              <p>{c.d}</p>
              <div className={styles.howArt}>
                <Image src={c.img} alt="" width={420} height={420} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* STRATEGY ENGINES */}
      <section className={`${styles.sectionWide} reveal`} id="engines">
        <div className={styles.enginesHead}>
          <div>
            <h2 className={styles.h2}>Three engines, one proven vault</h2>
          </div>
          <span className={styles.livePill}>
            <i /> Live · updates {updatedAgo}
          </span>
        </div>
        <div className={`${styles.enginesFlow} reveal-stagger`}>
          <div className={`${styles.engineStack} reveal-item`} data-from="left">
            {[
              {
                n: "01",
                t: "RWA coupons",
                d: "T-bill proxies, invoice pools, receivables emit CouponPaid on Sepolia.",
                img: "/brand/crystal/crystal-engine-funding.jpg",
              },
              {
                n: "02",
                t: "AI allocator",
                d: "Risk scores, TVL caps, and desk weights accept or reject each coupon.",
                img: "/brand/crystal/crystal-engine-stat.jpg",
              },
              {
                n: "03",
                t: "Attestcoin proofs",
                d: "Inclusion proofs verify on Creditcoin — fake coupons never reach NAV.",
                img: "/brand/crystal/crystal-engine-points.jpg",
              },
            ].map((e) => (
              <article key={e.n} className={styles.engineCard}>
                <div className={styles.engineCopy}>
                  <span className={styles.miniPill}>Engine {e.n}</span>
                  <h3>{e.t}</h3>
                  <p>{e.d}</p>
                </div>
                <div className={styles.engineArt}>
                  <Image src={e.img} alt="" width={520} height={220} />
                </div>
              </article>
            ))}
          </div>

          <div className={`${styles.engineMid} reveal-item`} data-from="scale" aria-hidden>
            <div className={styles.engineLines} />
            <div className={styles.engineNode}>
              <div className={styles.nodeGlyph}>&lt;/&gt;</div>
              <div className={styles.nodeLabel}>Attestcoin</div>
            </div>
          </div>

          <aside className={`${styles.engineResult} reveal-item`} data-from="right">
            <div className={styles.engineResultTop}>
              <Image
                src="/brand/pyvusd-flat.png"
                alt=""
                width={52}
                height={52}
                className={styles.engineCoin}
              />
              <div>
                <div className={styles.engineResultLabel}>Promised APY</div>
                <div className={styles.engineResultSub}>Paid into NAV in pyUSD</div>
              </div>
            </div>
            <div className={styles.engineApy}>{apy}</div>
            <div className={styles.engineStats}>
              <div>
                <span>TVL</span>
                <strong>{tvl}</strong>
              </div>
              <div>
                <span>Supply</span>
                <strong>{supply}</strong>
              </div>
              <div>
                <span>NAV</span>
                <strong>{nav}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* RWA MARKETS */}
      <section className={`${styles.section} ${styles.centerHead} reveal`} id="markets">
        <h2 className={styles.h2Center}>
          Allocating across <em>real cashflow</em> markets
        </h2>
        <div className={`${styles.marketGrid} reveal-stagger`}>
          {[
            {
              t: "Treasuries",
              d: "T-bill proxy desk",
              img: "/brand/crystal/crystal-equities.jpg",
            },
            {
              t: "Trade finance",
              d: "Invoice pools",
              img: "/brand/crystal/crystal-commodities.jpg",
            },
            {
              t: "Receivables",
              d: "Emerging-market cashflows",
              img: "/brand/crystal/crystal-fx.jpg",
            },
          ].map((m, i) => (
            <article
              key={m.t}
              className={`${styles.marketCard} reveal-item`}
              data-from={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <div className={styles.marketArt}>
                <Image src={m.img} alt="" width={640} height={360} />
              </div>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
            </article>
          ))}
        </div>
        <p className={styles.marketFoot}>AI-weighted across desks — only Attestcoin-proven coupons accrue</p>
      </section>

      {/* POWERED BY */}
      <section className={`${styles.section} ${styles.centerHead} reveal`} id="powered">
        <h2 className={styles.h2Center}>Built on Creditcoin infrastructure</h2>
        <p className={styles.leadCenter}>
          The vault executes on Creditcoin CC3 with Attestcoin proofs, aiming for Credit Labs CEIP
          after BUIDL CTC 2026 Fall.
        </p>
        <div className={`${styles.poweredFeature} reveal-stagger`}>
          {POWERED.slice(0, 2).map((p, i) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className={`${styles.poweredCard} reveal-item`}
              data-from={i === 0 ? "left" : "right"}
            >
              <Image
                src={partnerSrc(p)}
                alt={p.name}
                width={220}
                height={56}
                className={partnerLogoClass(p, styles.poweredLogo)}
              />
              <div className={styles.logoBlurb}>{p.blurb}</div>
            </a>
          ))}
        </div>
        <div className={styles.poweredStrip}>
          {POWERED.map((p) => (
            <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className={styles.stripItem}>
              <Image
                src={partnerSrc(p)}
                alt={p.name}
                width={180}
                height={44}
                className={partnerLogoClass(p, styles.stripLogo)}
              />
            </a>
          ))}
        </div>
      </section>

      {/* TRANSPARENCY */}
      <section className={`${styles.section} reveal`} id="transparency">
        <div className={`${styles.transparency} reveal-stagger`}>
          <div className={`${styles.transparencyCopy} reveal-item`} data-from="left">
            <h2 className={styles.h2Light}>Transparency</h2>
            <p className={styles.leadLight}>
              Every coupon observation, Attestcoin proof, and NAV update can be inspected in the vault
              app — share price never moves on faith.
            </p>
            <TransitionLink href="/app" className={styles.glassCta}>
              <span>Open vault app</span>
              <span className={styles.ctaArrow} aria-hidden>
                →
              </span>
            </TransitionLink>
          </div>
          <div className={`${styles.transparencyCard} reveal-item`} data-from="right">
            <div className={styles.navLabel}>NAV per share</div>
            <div className={styles.navValueBig}>
              <Image
                src="/brand/pyvusd-flat.png"
                alt=""
                width={48}
                height={48}
                className={styles.navCoin}
              />
              <span className={styles.navValueText}>
                {nav}
                <small>pyUSD</small>
              </span>
            </div>
            <NavSpark points={history} />
            <div className={styles.navUpdate}>Last update {updatedAgo}</div>
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className={`${styles.section} reveal`} id="compare">
        <div className={styles.compareHead}>
          <div>
            <h2 className={styles.h2}>Stable yield — built to beat the bank.</h2>
          </div>
          <p className={styles.lead}>
            Hands-free RWA yield on Creditcoin. The vault compounds only after Attestcoin clears a
            coupon — {apy} promised target on {tvl} TVL from a {supply} pyUSD test supply.
          </p>
        </div>
        <div className={`${styles.compareBars} reveal-stagger`}>
          {compareRows.map((row, i) => (
            <div
              key={row.name}
              className={`${styles.compareBarRow} ${row.hot ? styles.compareBarHot : ""} reveal-item`}
              data-from="left"
              style={{ ["--reveal-i" as string]: i }}
            >
              <div className={styles.compareLeft}>
                <div className={styles.compareIcon}>
                  <Image src={row.icon} alt="" width={28} height={28} />
                </div>
                <div>
                  <div className={styles.compareName}>{row.name}</div>
                  <div className={styles.compareTags}>
                    {row.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.barViz}>
                <div className={styles.barFillWide} style={{ width: `${row.bar}%` }} />
              </div>
              <div className={styles.compareRate}>{row.rate}</div>
            </div>
          ))}
        </div>
        <div className={styles.compareBanner}>✦ Proven yield only</div>
        <p className={styles.marketFoot}>RWA DESKS ON SEPOLIA · PROOFS ON CREDITCOIN CC3 · UPDATES LIVE</p>
      </section>

      {/* ASSET + ATTESTCOIN brief */}
      <section className={`${styles.section} reveal`} id="asset">
        <div className={`${styles.assetGrid} reveal-stagger`}>
          <div className={`${styles.coinStage} reveal-item`} data-from="left">
            <div className={styles.coinGlow} aria-hidden />
            <div className={styles.coinPair}>
              <Image
                src="/brand/tokens-pair.png"
                alt="pyUSD and pyvUSD"
                width={840}
                height={560}
                className={styles.coinPairImg}
                priority
              />
              <div className={styles.coinCaptions}>
                <div className={styles.coinCaption}>
                  <strong>pyUSD</strong>
                  <span>Deposit asset</span>
                </div>
                <div className={styles.coinCaption}>
                  <strong>pyvUSD</strong>
                  <span>Vault share</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles.assetCopy} reveal-item`} data-from="right">
            <h2 className={styles.assetTitle}>
              <span className={styles.assetSymbol}>pyvUSD</span>
              <span className={styles.assetSub}>ProofYield vault share</span>
            </h2>
            <p className={styles.assetLead}>
              Deposit <strong>pyUSD</strong>, mint <strong>pyvUSD</strong> ERC-4626 shares at live NAV.
              Holdings compound only when Attestcoin-proven RWA coupons accrue into the vault.
            </p>
            <dl className={styles.assetMeta}>
              <div>
                <dt>Symbol</dt>
                <dd>pyvUSD</dd>
              </div>
              <div>
                <dt>Standard</dt>
                <dd>ERC-4626</dd>
              </div>
              <div>
                <dt>pyUSD supply</dt>
                <dd>{supply}</dd>
              </div>
              <div>
                <dt>Promised APY</dt>
                <dd>{apy}</dd>
              </div>
              <div>
                <dt>TVL</dt>
                <dd>{tvl}</dd>
              </div>
              <div>
                <dt>NAV</dt>
                <dd>{nav}</dd>
              </div>
            </dl>
            <TransitionLink href="/app" className={styles.assetCta}>
              Mint pyvUSD in the vault
              <span aria-hidden>→</span>
            </TransitionLink>
          </div>
        </div>
      </section>

      <section className={`${styles.section} reveal`} id="usc">
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>No bridges. No oracles. Synchronous proofs.</h2>
          <p className={styles.lead}>
            Same model Creditcoin ships on{" "}
            <a href="https://creditcoin.org/" target="_blank" rel="noreferrer">
              creditcoin.org
            </a>{" "}
            — foreign-chain inclusion verified cryptographically on CC3.
          </p>
        </div>
        <div className={`${styles.feature3} reveal-stagger`}>
          {[
            {
              t: "No bridges. No oracles.",
              d: "Bridges concentrate risk. Centralized oracles can be corrupted. Attestcoin distributes trust.",
            },
            {
              t: "Synchronous verification",
              d: "Once attested, proofs verify in the same Creditcoin transaction — about one block (~15s).",
            },
            {
              t: "Built for RWA yield",
              d: "ProofYield gates every NAV increase on Sepolia→CC3 inclusion proofs.",
            },
          ].map((f, i) => (
            <article
              key={f.t}
              className={`${styles.featureCard} reveal-item`}
              data-from={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.finalCta} reveal`}>
        <h2 className={styles.h2}>Launch into Creditcoin — not a void.</h2>
        <p className={styles.lead}>
          Deposit, prove, and earn on the L1 built for cross-chain builders. Then compose pyvUSD
          across the CTC ecosystem.
        </p>
        <div className={styles.ctaRow}>
          <TransitionLink href="/app" className={styles.ctaDark}>
            Enter the vault
          </TransitionLink>
          <a href="https://creditcoin.org/" target="_blank" rel="noreferrer" className={styles.ctaOutline}>
            Explore Creditcoin
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <BrandLogo onDark />
            </div>
            <p className={styles.footerTag}>
              Deposit once. Earn RWA yield with Attestcoin proofs on Creditcoin.
            </p>
          </div>

          <div className={styles.footerCols}>
            <div>
              <h3 className={styles.footerColTitle}>Product</h3>
              <nav className={styles.footerColLinks}>
                <TransitionLink href="/app">Vault app</TransitionLink>
                <a href="#how">How it works</a>
                <a href="#compare">Yield</a>
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
                <a href="#usc">Proof model</a>
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
                <a href="https://github.com/darkty0x/proofyield" target="_blank" rel="noreferrer">
                  GitHub
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
