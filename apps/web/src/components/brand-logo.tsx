"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { THEME_META, useTheme, type ThemeId } from "./theme";
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

const ORDER: ThemeId[] = ["dark", "dark-gold", "light"];

const SWATCH: Record<ThemeId, string> = {
  dark: "#3d8bff",
  "dark-gold": "#f0c14a",
  light: "#e8ecf2",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`${styles.dd} ${className ?? ""}`} ref={rootRef}>
      <button
        type="button"
        className={styles.ddTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`${styles.ddSwatch} ${theme === "light" ? styles.ddSwatchLight : ""}`}
          style={{ background: SWATCH[theme] }}
          aria-hidden
        />
        <span className={styles.ddLabel}>{THEME_META[theme].label}</span>
        <svg className={styles.ddCaret} width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul id={listId} className={styles.ddMenu} role="listbox" aria-label="Color theme">
          {ORDER.map((id) => {
            const active = theme === id;
            return (
              <li key={id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`${styles.ddOption} ${active ? styles.ddOptionOn : ""}`}
                  onClick={() => {
                    setTheme(id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`${styles.ddSwatch} ${id === "light" ? styles.ddSwatchLight : ""}`}
                    style={{ background: SWATCH[id] }}
                    aria-hidden
                  />
                  <span>{THEME_META[id].label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
