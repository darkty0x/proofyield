"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
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
  if (abs >= 1) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
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
  // Match container aspect so the plot fills the card edge-to-edge (no letterbox).
  const [box, setBox] = useState({ w: 720, h: 260 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = (width: number, height: number) => {
      if (width < 40 || height < 40) return;
      setBox((prev) =>
        Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
          ? prev
          : { w: Math.round(width), h: Math.round(height) },
      );
    };
    apply(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      apply(cr.width, cr.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => (metric === "tvl" ? p.tvl : p.sharePrice));
    const minRaw = Math.min(...values);
    const maxRaw = Math.max(...values);
    // Pad flat series so a single-point / zero portfolio still draws in the plot.
    const pad =
      metric === "tvl"
        ? Math.max(maxRaw * 0.04, 50)
        : Math.max(Math.abs(maxRaw) * 0.002, 0.0005);
    const min = minRaw === maxRaw ? Math.max(0, minRaw - pad) : minRaw;
    const max = minRaw === maxRaw ? maxRaw + pad : maxRaw;
    const span = Math.max(max - min, metric === "tvl" ? 1 : 0.0001);

    const w = box.w;
    const h = box.h;
    const padL = w < 480 ? 44 : 56;
    const padR = 12;
    const padT = 18;
    const padB = 28;
    const plotW = Math.max(w - padL - padR, 1);
    const plotH = Math.max(h - padT - padB, 1);

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
  }, [points, metric, box.w, box.h]);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = wrapRef.current;
      if (!el || !chart || chart.coords.length === 0) return;
      const { coords, padL, plotW, w } = chart;
      const rect = el.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const x = ratio * w;
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

  if (points.length === 0) {
    return <div className={styles.empty}>No history yet</div>;
  }

  if (!chart) {
    return <div ref={wrapRef} className={styles.wrap} />;
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
        width="100%"
        height="100%"
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
          vectorEffect="non-scaling-stroke"
        />

        {hover !== null && (
          <g className={styles.crosshair}>
            <line
              x1={ax}
              x2={ax}
              y1={padT}
              y2={baseline}
              className={styles.vLine}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={padL}
              x2={padL + plotW}
              y1={ay}
              y2={ay}
              className={styles.hLine}
              vectorEffect="non-scaling-stroke"
            />
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
