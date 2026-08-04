"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo, ThemeToggle } from "@/components/brand-logo";
import { DOC_NAV } from "@/content/docs";
import styles from "./docs.module.css";

type Props = {
  slug: string;
  children: React.ReactNode;
};

export function DocsShell({ slug, children }: Props) {
  const router = useRouter();

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <BrandLogo href="/" markSize={26} transition={false} />
          <span className={styles.docsMark}>Docs</span>
          <nav className={styles.topLinks} aria-label="Docs chrome">
            <Link href="/docs/overview">Whitepaper</Link>
            <Link href="/app">Vault app</Link>
            <a href="https://github.com/darkty0x/proofyield" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
        <div className={styles.topRight}>
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.aside} aria-label="Documentation">
          {DOC_NAV.map((group) => (
            <div key={group.group} className={styles.group}>
              <div className={styles.groupTitle}>{group.group}</div>
              <ul className={styles.navList}>
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/docs/${item.slug}`}
                      className={`${styles.navLink} ${slug === item.slug ? styles.navOn : ""}`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className={styles.main}>
          <div className={styles.mobileNav}>
            <label className={styles.srOnly} htmlFor="docs-jump">
              Jump to section
            </label>
            <select
              id="docs-jump"
              className={styles.mobileSelect}
              value={slug}
              onChange={(e) => router.push(`/docs/${e.target.value}`)}
            >
              {DOC_NAV.flatMap((g) =>
                g.items.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {g.group}: {item.title}
                  </option>
                )),
              )}
            </select>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
