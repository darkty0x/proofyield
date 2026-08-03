"use client";

import Link from "next/link";
import { THEME_META, useTheme } from "./theme";
import styles from "./brand-logo.module.css";

type Props = {
  href?: string;
  markSize?: number;
  className?: string;
};

export function BrandLogo({ href = "/", markSize = 30, className }: Props) {
  const { theme } = useTheme();
  const meta = THEME_META[theme];
  const markSrc =
    meta.mark === "ghost" ? "/brand/proofyield-mark-ghost.svg" : "/brand/proofyield-mark.svg";

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={markSrc}
        alt=""
        width={markSize}
        height={markSize}
        className={`${styles.mark} ${meta.mark === "ghost" ? styles.markGhost : ""}`}
      />
      <span className={`${styles.word} ${styles[meta.logo]}`}>
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

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme();
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={cycle}
      aria-label={`Theme: ${THEME_META[theme].label}. Click to switch.`}
      title={`Theme: ${THEME_META[theme].label}`}
    >
      {THEME_META[theme].label}
    </button>
  );
}
