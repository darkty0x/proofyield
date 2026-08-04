"use client";

import { TransitionLink } from "./transition-link";

/** Marketing nav — same order on landing + app shell. */
export const SITE_NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#engines", label: "Strategy" },
  { href: "/#markets", label: "Markets" },
  { href: "/#powered", label: "Infrastructure" },
  { href: "/#compare", label: "Yield" },
  { href: "/docs", label: "Docs" },
] as const;

type Props = {
  className?: string;
  /** Landing uses in-page anchors (`#how`); app uses `/#how` via TransitionLink. */
  mode?: "landing" | "app";
};

export function SiteNavLinks({ className, mode = "app" }: Props) {
  return (
    <nav className={className} aria-label="Primary">
      {SITE_NAV.map((item) => {
        const isHash = item.href.includes("#");
        const href =
          mode === "landing" && isHash ? item.href.replace("/#", "#") : item.href;
        if (mode === "landing" && isHash) {
          return (
            <a key={item.href} href={href}>
              {item.label}
            </a>
          );
        }
        return (
          <TransitionLink key={item.href} href={href}>
            {item.label}
          </TransitionLink>
        );
      })}
    </nav>
  );
}
