import type { DocBlock } from "@/content/docs";
import styles from "./docs.module.css";

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className={styles.article}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className={styles.p}>
                {linkify(b.text)}
              </p>
            );
          case "h2":
            return (
              <h2 key={i} className={styles.h2}>
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className={styles.h3}>
                {b.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className={styles.list}>
                {b.items.map((item) => (
                  <li key={item}>{linkify(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className={styles.list}>
                {b.items.map((item) => (
                  <li key={item}>{linkify(item)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={i} className={styles.code}>
                {b.text}
              </pre>
            );
          case "quote":
            return (
              <blockquote key={i} className={styles.quote}>
                {b.text}
              </blockquote>
            );
          case "callout":
            return (
              <aside key={i} className={styles.callout}>
                <div className={styles.calloutTitle}>{b.title}</div>
                <p className={styles.p}>{linkify(b.text)}</p>
              </aside>
            );
          case "table":
            return (
              <div key={i} className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {b.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{linkify(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
