"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.56 1.56M17.39 17.39l1.56 1.56M18.95 5.05l-1.56 1.56M6.61 17.39l-1.56 1.56"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.8l1.7 5.2h5.5l-4.4 3.2 1.7 5.2L12 13.2 7.5 16.4l1.7-5.2-4.4-3.2h5.5L12 2.8z"
        fill="currentColor"
      />
    </svg>
  );
}

const ICONS: Record<ThemeId, { icon: () => ReactNode; label: string }> = {
  dark: { icon: MoonIcon, label: "Dark" },
  "dark-gold": { icon: GoldIcon, label: "Gold" },
  light: { icon: SunIcon, label: "Light" },
};

const ORDER: ThemeId[] = ["dark", "dark-gold", "light"];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`${styles.toggleGroup} ${className ?? ""}`}
      role="group"
      aria-label="Color theme"
    >
      {ORDER.map((id) => {
        const item = ICONS[id];
        const active = theme === id;
        const Icon = item.icon;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.toggleBtn} ${active ? styles.toggleOn : ""}`}
            onClick={() => setTheme(id)}
            aria-label={`${item.label} theme`}
            aria-pressed={active}
            title={item.label}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
