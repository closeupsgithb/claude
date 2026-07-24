"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { SeriesPoint } from "@/lib/metricool";

type Props = {
  title: string;
  esSeries: SeriesPoint[];
  ptSeries: SeriesPoint[];
  esLabel?: string;
  ptLabel?: string;
};

const WIDTH = 720;
const HEIGHT = 220;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" }).format(d);
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(d);
  const rest = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(d);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${rest}`;
}

export default function AreaChart({ title, esSeries, ptSeries, esLabel = "España", ptLabel = "Portugal" }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const allDates = useMemo(() => {
    const set = new Set<string>();
    esSeries.forEach((p) => set.add(p.date));
    ptSeries.forEach((p) => set.add(p.date));
    return Array.from(set).sort();
  }, [esSeries, ptSeries]);

  const esByDate = useMemo(() => new Map(esSeries.map((p) => [p.date, p.value])), [esSeries]);
  const ptByDate = useMemo(() => new Map(ptSeries.map((p) => [p.date, p.value])), [ptSeries]);

  const { minT, maxT, maxStack } = useMemo(() => {
    const times = allDates.map((d) => new Date(d).getTime());
    const stacks = allDates.map((d) => (esByDate.get(d) ?? 0) + (ptByDate.get(d) ?? 0));
    return {
      minT: Math.min(...times),
      maxT: Math.max(...times),
      maxStack: Math.max(1, ...stacks),
    };
  }, [allDates, esByDate, ptByDate]);

  if (allDates.length === 0) {
    return (
      <div style={emptyStyle}>
        {title} — sin datos en este periodo.
      </div>
    );
  }

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    if (maxT === minT) return PAD_LEFT;
    return PAD_LEFT + ((t - minT) / (maxT - minT)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  };
  const domainMax = maxStack * 1.15;
  const yScale = (v: number) => HEIGHT - PAD_BOTTOM - (v / domainMax) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const esTop = allDates.map((d) => esByDate.get(d) ?? 0);
  const stackTop = allDates.map((d, i) => esTop[i] + (ptByDate.get(d) ?? 0));

  const baseline = HEIGHT - PAD_BOTTOM;
  const esAreaPath =
    allDates.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d).toFixed(1)} ${yScale(esTop[i]).toFixed(1)}`).join(" ") +
    ` L ${xScale(allDates[allDates.length - 1]).toFixed(1)} ${baseline} L ${xScale(allDates[0]).toFixed(1)} ${baseline} Z`;

  const ptAreaPath =
    allDates.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d).toFixed(1)} ${yScale(stackTop[i]).toFixed(1)}`).join(" ") +
    " " +
    allDates
      .slice()
      .reverse()
      .map((d, i) => `L ${xScale(d).toFixed(1)} ${yScale(esTop[allDates.length - 1 - i]).toFixed(1)}`)
      .join(" ") +
    " Z";

  const gridValues = Array.from({ length: 5 }, (_, i) => (domainMax * i) / 4);

  const tickCount = Math.min(6, allDates.length);
  const xAxisTicks =
    allDates.length <= 1
      ? [0]
      : Array.from(new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (allDates.length - 1)) / (tickCount - 1)))));

  const hoverDate = hoverIdx !== null ? allDates[hoverIdx] : null;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Legend esLabel={esLabel} ptLabel={ptLabel} />
          <button onClick={() => setShowTable((s) => !s)} style={toggleButtonStyle}>
            {showTable ? "Ver gráfico" : "Ver tabla"}
          </button>
        </div>
      </div>

      {!showTable ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={title}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
            let nearest = 0;
            let best = Infinity;
            allDates.forEach((d, i) => {
              const dx = Math.abs(xScale(d) - x);
              if (dx < best) {
                best = dx;
                nearest = i;
              }
            });
            setHoverIdx(nearest);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {gridValues.map((v, i) => (
            <g key={i}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke="var(--gridline)" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {formatNumber(Math.round(v))}
              </text>
            </g>
          ))}

          <path d={esAreaPath} fill="var(--series-es)" opacity={0.85} stroke="none" />
          <path d={ptAreaPath} fill="var(--series-pt)" opacity={0.85} stroke="none" />

          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={baseline} y2={baseline} stroke="var(--baseline)" strokeWidth={1} />

          {hoverDate && (
            <line
              x1={xScale(hoverDate)}
              x2={xScale(hoverDate)}
              y1={PAD_TOP}
              y2={baseline}
              stroke="var(--surface-1)"
              strokeWidth={2}
              strokeDasharray="3,3"
            />
          )}

          {xAxisTicks.map((idx) => {
            const d = allDates[idx];
            const isFirst = idx === 0;
            const isLast = idx === allDates.length - 1;
            return (
              <g key={idx}>
                <line x1={xScale(d)} x2={xScale(d)} y1={baseline} y2={baseline + 4} stroke="var(--baseline)" strokeWidth={1} />
                <text
                  x={xScale(d)}
                  y={HEIGHT - 8}
                  fontSize={10}
                  fill="var(--text-muted)"
                  textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                >
                  {formatDateShort(d)}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>{esLabel}</th>
                <th style={thStyle}>{ptLabel}</th>
              </tr>
            </thead>
            <tbody>
              {allDates
                .slice()
                .reverse()
                .map((d) => (
                  <tr key={d}>
                    <td style={tdStyle}>{formatDateShort(d)}</td>
                    <td style={tdStyle}>{formatNumber(esByDate.get(d) ?? 0)}</td>
                    <td style={tdStyle}>{formatNumber(ptByDate.get(d) ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {hoverDate && !showTable && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {formatDateFull(hoverDate)} — {esLabel}: <strong>{formatNumber(esByDate.get(hoverDate) ?? 0)}</strong> · {ptLabel}:{" "}
          <strong>{formatNumber(ptByDate.get(hoverDate) ?? 0)}</strong>
        </div>
      )}
    </div>
  );
}

function Legend({ esLabel, ptLabel }: { esLabel: string; ptLabel: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--series-es)", display: "inline-block" }} />
        {esLabel}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--series-pt)", display: "inline-block" }} />
        {ptLabel}
      </span>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 16px 12px",
  boxShadow: "var(--card-shadow)",
};

const headerStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 };
const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };
const toggleButtonStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "3px 8px",
  cursor: "pointer",
};
const emptyStyle: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, fontSize: 13, color: "var(--text-muted)" };
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  color: "var(--text-muted)",
  fontWeight: 500,
  borderBottom: "1px solid var(--gridline)",
  position: "sticky",
  top: 0,
  background: "var(--surface-1)",
};
const tdStyle: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid var(--gridline)", color: "var(--text-primary)" };
