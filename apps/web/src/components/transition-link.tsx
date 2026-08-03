"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  type ComponentProps,
  type MouseEvent,
} from "react";

type Props = ComponentProps<typeof Link>;

function hrefToString(href: Props["href"]): string {
  if (typeof href === "string") return href;
  if (href && typeof href === "object" && "pathname" in href) {
    const path = href.pathname ?? "";
    const query =
      href.query && typeof href.query === "object"
        ? `?${new URLSearchParams(href.query as Record<string, string>).toString()}`
        : "";
    const hash = href.hash ? `#${String(href.hash).replace(/^#/, "")}` : "";
    return `${path}${query}${hash}`;
  }
  return "/";
}

/** Soft-nav with fade+scale via the View Transitions API (landing ↔ app). */
export function TransitionLink({ href, onClick, ...props }: Props) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const url = hrefToString(href);
      if (!url.startsWith("/") || url.startsWith("//")) return;

      e.preventDefault();

      const navigate = () => {
        startTransition(() => {
          router.push(url);
        });
      };

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(navigate);
      } else {
        navigate();
      }
    },
    [href, onClick, router],
  );

  return <Link href={href} onClick={handleClick} {...props} />;
}
