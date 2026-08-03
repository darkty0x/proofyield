"use client";

import Link from "next/link";
import { THEME_META, useTheme, type ThemeId } from "./theme";
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

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      <path
        d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M19.2 4.8l-1.7 1.7M6.5 17.5l-1.7 1.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ORDER: ThemeId[] = ["dark", "dark-gold", "light"];
const LABELS: Record<ThemeId, string> = {
  dark: "Dark",
  "dark-gold": "Gold",
  light: "Light",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const index = Math.max(0, ORDER.indexOf(theme));

  return (
    <div
      className={`${styles.toggleGroup} ${className ?? ""}`}
      role="group"
      aria-label="Color theme"
    >
      <span
        className={styles.toggleThumb}
        style={{ transform: `translateX(${index * 100}%)` }}
        aria-hidden
      />
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={`${styles.toggleBtn} ${theme === id ? styles.toggleOn : ""}`}
          onClick={() => setTheme(id)}
          aria-label={`${LABELS[id]} theme`}
          aria-pressed={theme === id}
          title={LABELS[id]}
        >
          {id === "dark" ? <MoonIcon /> : null}
          {id === "light" ? <SunIcon /> : null}
          {/* gold = middle slot, no icon */}
        </button>
      ))}
    </div>
  );
}
