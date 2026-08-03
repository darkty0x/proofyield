"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

/** Material Design Icons (Iconify @iconify-json/mdi) — moon phases, outline so Dark isn't a solid white blob */
function FullMoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function HalfMoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.75a8.25 8.25 0 1 0 0 16.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M12 3.75v16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SmallMoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.4 3.1a8.25 8.25 0 1 0 5.5 13.4A7.1 7.1 0 0 1 15.4 3.1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ORDER: ThemeId[] = ["dark", "dark-gold", "light"];

const ICONS: Record<ThemeId, () => ReactNode> = {
  dark: FullMoonIcon,
  "dark-gold": HalfMoonIcon,
  light: SmallMoonIcon,
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const ActiveIcon = ICONS[theme];

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
        <span className={styles.ddIcon} aria-hidden>
          <ActiveIcon />
        </span>
        <span className={styles.ddLabel}>{THEME_META[theme].label}</span>
        <svg className={styles.ddCaret} width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <ul id={listId} className={styles.ddMenu} role="listbox" aria-label="Color theme">
          {ORDER.map((id) => {
            const active = theme === id;
            const Icon = ICONS[id];
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
                  <span className={styles.ddIcon} aria-hidden>
                    <Icon />
                  </span>
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
