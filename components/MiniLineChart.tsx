"use client";

import { useMemo, useState } from "react";
import type { SeriesPoint } from "@/lib/metricool";

type Props = {
  title: string;
  series: SeriesPoint[];
  colorVar?: string;
  formatValue?: (n: number) => string;
};

const WIDTH = 340;
const HEIGHT = 140;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

function defaultFormat(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" }).format(d);
}

export default function MiniLineChart({ title, series, colorVar = "--series-es", formatValue = defaultFormat }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { minT, maxT, maxV } = useMemo(() => {
    const times = series.map((p) => new Date(p.date).getTime());
    return {
      minT: Math.min(...times),
      maxT: Math.max(...times),
      maxV: Math.max(0.01, ...series.map((p) => p.value)),
    };
  }, [series]);

  if (series.length === 0) {
    return (
      <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, fontSize: 13, color: "var(--text-muted)" }}>
        {title} — sin datos.
      </div>
    );
  }

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    if (maxT === minT) return PAD_LEFT;
    return PAD_LEFT + ((t - minT) / (maxT - minT)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  };
  const yScale = (v: number) => HEIGHT - PAD_BOTTOM - (v / (maxV * 1.15)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const path = series.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${xScale(series[series.length - 1].date).toFixed(1)} ${HEIGHT - PAD_BOTTOM} L ${xScale(series[0].date).toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`;

  const hover = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", boxShadow: "var(--card-shadow)" }}>
      <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{title}</h4>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
          let nearest = 0;
          let best = Infinity;
          series.forEach((p, i) => {
            const dx = Math.abs(xScale(p.date) - x);
            if (dx < best) {
              best = dx;
              nearest = i;
            }
          });
          setHoverIdx(nearest);
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} stroke="var(--baseline)" strokeWidth={1} />
        <path d={areaPath} fill={`var(${colorVar})`} opacity={0.12} stroke="none" />
        <path d={path} fill="none" stroke={`var(${colorVar})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover && <circle cx={xScale(hover.date)} cy={yScale(hover.value)} r={4} fill={`var(${colorVar})`} />}
        <text x={PAD_LEFT} y={HEIGHT - 6} fontSize={9} fill="var(--text-muted)">
          {formatDateShort(series[0].date)}
        </text>
        {series.length > 2 && (
          <text x={(PAD_LEFT + (WIDTH - PAD_RIGHT)) / 2} y={HEIGHT - 6} fontSize={9} fill="var(--text-muted)" textAnchor="middle">
            {formatDateShort(series[Math.floor(series.length / 2)].date)}
          </text>
        )}
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 6} fontSize={9} fill="var(--text-muted)" textAnchor="end">
          {formatDateShort(series[series.length - 1].date)}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        {hover ? (
          <>
            {formatDateShort(hover.date)}: <strong>{formatValue(hover.value)}</strong>
          </>
        ) : (
          <>
            Última: <strong>{formatValue(series[series.length - 1].value)}</strong>
          </>
        )}
      </div>
    </div>
  );
}
