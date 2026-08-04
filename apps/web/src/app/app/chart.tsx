"use client";

import { useCallback, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { formatUsd, type HistoryPoint } from "@/lib/api";
import styles from "./chart.module.css";

type Props = {
  points: HistoryPoint[];
  metric?: "tvl" | "sharePrice";
};

function formatValue(metric: "tvl" | "sharePrice", v: number): string {
  if (metric === "tvl") return formatUsd(v);
  return v.toFixed(4);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function VaultChart({ points, metric = "tvl" }: Props) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => (metric === "tvl" ? p.tvl : p.sharePrice));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, metric === "tvl" ? 1 : 0.0001);
    const w = 640;
    const h = 220;
    // Keep end marker fully inside the viewBox (was clipping / looking squashed).
    const padX = 18;
    const padY = 18;

    const coords = values.map((v, i) => {
      const x = padX + (i / Math.max(values.length - 1, 1)) * (w - padX * 2);
      const y = h - padY - ((v - min) / span) * (h - padY * 2);
      return [x, y] as const;
    });

    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const lastPt = coords[coords.length - 1];
    const firstPt = coords[0];
    const area = `${line} L${lastPt[0].toFixed(1)} ${h} L${firstPt[0].toFixed(1)} ${h} Z`;

    const last = values[values.length - 1];
    const first = values[0];
    const delta = ((last - first) / Math.max(Math.abs(first), 1e-9)) * 100;

    return { values, coords, line, area, w, h, padX, padY, delta };
  }, [points, metric]);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = wrapRef.current;
      if (!el || !chart || chart.coords.length === 0) return;
      const { coords, padX, w } = chart;
      const rect = el.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const x = padX + ratio * (w - padX * 2);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = Math.abs(coords[i][0] - x);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setHover(best);
    },
    [chart],
  );

  const onLeave = useCallback(() => setHover(null), []);

  if (!chart) {
    return <div className={styles.empty}>No history yet</div>;
  }

  const { values, coords, line, area, w, h, padY, delta } = chart;
  const active = hover ?? coords.length - 1;
  const [ax, ay] = coords[active];
  const tipLeft = Math.min(Math.max((ax / w) * 100, 12), 88);
  const tipValue = formatValue(metric, values[active]);
  const tipDate = formatDate(points[active].t);
  const fromFirst = ((values[active] - values[0]) / Math.max(Math.abs(values[0]), 1e-9)) * 100;

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onMove}
    >
      <svg className={styles.svg} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id={`chartFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-fill)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id={`chartStroke-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--blue)" />
            <stop offset="100%" stopColor="var(--chart-line)" />
          </linearGradient>
          <filter id={`glow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={0}
            x2={w}
            y1={padY + g * (h - padY * 2)}
            y2={padY + g * (h - padY * 2)}
            className={styles.grid}
          />
        ))}
        <path d={area} fill={`url(#chartFill-${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={`url(#chartStroke-${gid})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {hover !== null && (
          <g className={styles.crosshair}>
            <line x1={ax} x2={ax} y1={0} y2={h} className={styles.vLine} />
            <line x1={0} x2={w} y1={ay} y2={ay} className={styles.hLine} />
            <circle cx={ax} cy={ay} r="10" className={styles.pulse} filter={`url(#glow-${gid})`} />
            <circle cx={ax} cy={ay} r="5" className={styles.dot} />
            <circle cx={ax} cy={ay} r="2.2" className={styles.dotCore} />
          </g>
        )}

        {hover === null && (
          <circle
            cx={coords[coords.length - 1][0]}
            cy={coords[coords.length - 1][1]}
            r="4.5"
            fill="var(--chart-line)"
          />
        )}
      </svg>

      {hover !== null && (
        <div className={styles.tooltip} style={{ left: `${tipLeft}%` }}>
          <div className={styles.tipDate}>{tipDate}</div>
          <div className={styles.tipRow}>
            <span>{metric === "tvl" ? "TVL" : "NAV"}</span>
            <strong>{tipValue}</strong>
          </div>
          <div className={styles.tipRow}>
            <span>vs start</span>
            <strong className={fromFirst >= 0 ? styles.up : styles.down}>
              {fromFirst >= 0 ? "+" : ""}
              {fromFirst.toFixed(2)}%
            </strong>
          </div>
        </div>
      )}

      <div className={styles.meta}>
        <span>{metric === "tvl" ? "TVL" : "NAV"} · 30d</span>
        <span className={delta >= 0 ? styles.up : styles.down}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
