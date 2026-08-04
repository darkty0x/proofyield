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

/** Compact axis label — keep NAV readable, TVL short. */
function formatAxisY(metric: "tvl" | "sharePrice", v: number): string {
  if (metric === "sharePrice") {
    if (v >= 10) return v.toFixed(2);
    return v.toFixed(4);
  }
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAxisX(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
    const h = 240;
    // Room for Y labels (left) and X labels (bottom).
    const padL = 56;
    const padR = 16;
    const padT = 14;
    const padB = 32;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const coords = values.map((v, i) => {
      const x = padL + (i / Math.max(values.length - 1, 1)) * plotW;
      const y = padT + plotH - ((v - min) / span) * plotH;
      return [x, y] as const;
    });

    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const lastPt = coords[coords.length - 1];
    const firstPt = coords[0];
    const baseline = padT + plotH;
    const area = `${line} L${lastPt[0].toFixed(1)} ${baseline.toFixed(1)} L${firstPt[0].toFixed(1)} ${baseline.toFixed(1)} Z`;

    const last = values[values.length - 1];
    const first = values[0];
    const delta = ((last - first) / Math.max(Math.abs(first), 1e-9)) * 100;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const value = min + span * (1 - t);
      const y = padT + t * plotH;
      return { t, y, value, label: formatAxisY(metric, value) };
    });

    const xIdx =
      points.length <= 2
        ? [0, points.length - 1]
        : points.length <= 4
          ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
          : [
              0,
              Math.floor((points.length - 1) / 3),
              Math.floor(((points.length - 1) * 2) / 3),
              points.length - 1,
            ];
    const xTicks = [...new Set(xIdx.filter((i) => i >= 0))].map((i) => ({
      i,
      x: coords[i][0],
      label: formatAxisX(points[i].t),
    }));

    return {
      values,
      coords,
      line,
      area,
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      baseline,
      delta,
      yTicks,
      xTicks,
      min,
      max,
    };
  }, [points, metric]);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = wrapRef.current;
      if (!el || !chart || chart.coords.length === 0) return;
      const { coords, padL, plotW, w } = chart;
      const rect = el.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const x = ratio * w;
      // Clamp to plot band for nicer edge targeting.
      const clamped = Math.min(Math.max(x, padL), padL + plotW);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = Math.abs(coords[i][0] - clamped);
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

  const { values, coords, line, area, w, h, padL, padT, padB, plotW, plotH, baseline, delta, yTicks, xTicks } =
    chart;
  const active = hover ?? coords.length - 1;
  const [ax, ay] = coords[active];
  const tipLeft = Math.min(Math.max((ax / w) * 100, 14), 86);
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
      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${metric === "tvl" ? "TVL" : "NAV"} chart over 30 days`}
      >
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

        {/* Plot frame */}
        <line x1={padL} x2={padL + plotW} y1={baseline} y2={baseline} className={styles.axisLine} />
        <line x1={padL} x2={padL} y1={padT} y2={baseline} className={styles.axisLine} />

        {yTicks.map((tick) => (
          <g key={`y-${tick.t}`}>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={tick.y}
              y2={tick.y}
              className={styles.grid}
            />
            <text
              x={padL - 8}
              y={tick.y}
              className={styles.axisLabelY}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`x-${tick.i}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={baseline}
              y2={baseline + 4}
              className={styles.axisTick}
            />
            <text
              x={tick.x}
              y={h - padB + 18}
              className={styles.axisLabelX}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#chartFill-${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={`url(#chartStroke-${gid})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hover !== null && (
          <g className={styles.crosshair}>
            <line x1={ax} x2={ax} y1={padT} y2={baseline} className={styles.vLine} />
            <line x1={padL} x2={padL + plotW} y1={ay} y2={ay} className={styles.hLine} />
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
