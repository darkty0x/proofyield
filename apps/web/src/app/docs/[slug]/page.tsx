import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, getDoc, getDocIndex } from "@/content/docs";
import { DocBlocks } from "../doc-body";
import { DocsShell } from "../docs-shell";
import styles from "../docs.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: "Docs · ProofYield" };
  return {
    title: `${doc.title} · ProofYield Docs`,
    description: doc.summary,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const idx = getDocIndex(slug);
  const prev = idx > 0 ? DOCS[idx - 1] : null;
  const next = idx >= 0 && idx < DOCS.length - 1 ? DOCS[idx + 1] : null;

  return (
    <DocsShell slug={slug}>
      <p className={styles.crumb}>
        {doc.group} / <span>{doc.title}</span>
      </p>
      <h1 className={styles.h1}>{doc.title}</h1>
      <p className={styles.lede}>{doc.summary}</p>
      <DocBlocks blocks={doc.body} />

      <nav className={styles.pager} aria-label="Doc pagination">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className={styles.pageLink}>
            <span>Previous</span>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`} className={`${styles.pageLink} ${styles.pageNext}`}>
            <span>Next</span>
            <strong>{next.title}</strong>
          </Link>
        ) : null}
      </nav>
    </DocsShell>
  );
}
