"use client";

import Link from "next/link";
import { useId } from "react";
import { THEME_META, useTheme } from "./theme";
import styles from "./brand-logo.module.css";

type Props = {
  href?: string;
  markSize?: number;
  className?: string;
  /** Use dark-surface lockup (white PROOF) — for footer / dark panels */
  onDark?: boolean;
};

export function BrandLogo({ href = "/", markSize = 30, className, onDark }: Props) {
  const { theme } = useTheme();
  const meta = THEME_META[theme];
  const logo = onDark ? (theme === "dark-gold" ? "l11" : "l01") : meta.logo;
  const mark = onDark ? (theme === "dark-gold" ? "ghost" : "tile") : meta.mark;
  const markSrc =
    mark === "ghost" ? "/brand/proofyield-mark-ghost.svg" : "/brand/proofyield-mark.svg";

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={markSrc}
        alt=""
        width={markSize}
        height={markSize}
        className={`${styles.mark} ${mark === "ghost" ? styles.markGhost : ""}`}
      />
      <span className={`${styles.word} ${styles[logo]}`}>
        <span className={styles.proof}>Proof</span>
        <span className={styles.yield}>Yield</span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.lock} ${className ?? ""}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${styles.lock} ${className ?? ""}`}>{inner}</div>;
}

/**
 * F-style (web.dev) celestial morph: Light sun → Dark crescent → Midnight gold full moon.
 * Click cycles themes; SVG states are driven by html[data-theme].
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme();
  const maskId = useId().replace(/:/g, "");
  const label = THEME_META[theme].label;

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${className ?? ""}`}
      title={`${label} theme — click to cycle`}
      aria-label={`${label} theme. Click to cycle Dark, Midnight, Light.`}
      aria-live="polite"
      onClick={cycle}
    >
      <svg
        className={styles.sunAndMoon}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <mask className={styles.moon} id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle className={styles.moonCut} cx="24" cy="10" r="6" fill="black" />
        </mask>
        <circle
          className={styles.sun}
          cx="12"
          cy="12"
          r="6"
          mask={`url(#${maskId})`}
          fill="currentColor"
        />
        <g className={styles.sunBeams} stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
        <g className={styles.stars} fill="currentColor">
          <circle cx="5" cy="6" r="0.9" />
          <circle cx="18.5" cy="5.5" r="0.7" />
          <circle cx="19" cy="15.5" r="0.85" />
          <circle cx="4.5" cy="16" r="0.65" />
        </g>
      </svg>
      <span className={styles.themeLabel}>{label}</span>
    </button>
  );
}
