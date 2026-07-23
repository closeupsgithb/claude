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
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

export default function TrendChart({ title, esSeries, ptSeries, esLabel = "España", ptLabel = "Portugal" }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const allDates = useMemo(() => {
    const set = new Set<string>();
    esSeries.forEach((p) => set.add(p.date));
    ptSeries.forEach((p) => set.add(p.date));
    return Array.from(set).sort();
  }, [esSeries, ptSeries]);

  const { minT, maxT, maxV } = useMemo(() => {
    const times = allDates.map((d) => new Date(d).getTime());
    const values = [...esSeries, ...ptSeries].map((p) => p.value);
    return {
      minT: Math.min(...times),
      maxT: Math.max(...times),
      maxV: Math.max(1, ...values),
    };
  }, [allDates, esSeries, ptSeries]);

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    if (maxT === minT) return PAD_LEFT;
    return PAD_LEFT + ((t - minT) / (maxT - minT)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  };

  const yScale = (v: number) => {
    const domainMax = maxV * 1.15;
    return HEIGHT - PAD_BOTTOM - (v / domainMax) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
  };

  const buildPath = (series: SeriesPoint[]) =>
    series.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`).join(" ");

  const esPath = buildPath(esSeries);
  const ptPath = buildPath(ptSeries);

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => (maxV * 1.15 * i) / gridLines);

  const hoverDate = hoverIdx !== null ? allDates[hoverIdx] : null;
  const hoverEs = hoverDate ? esSeries.find((p) => p.date === hoverDate) : undefined;
  const hoverPt = hoverDate ? ptSeries.find((p) => p.date === hoverDate) : undefined;

  if (allDates.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px",
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        {title} — sin datos en este periodo.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 16px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Legend esLabel={esLabel} ptLabel={ptLabel} />
          <button
            onClick={() => setShowTable((s) => !s)}
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
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
            if (allDates.length === 0) return;
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
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {formatNumber(Math.round(v))}
              </text>
            </g>
          ))}

          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} stroke="var(--baseline)" strokeWidth={1} />

          <path d={esPath} fill="none" stroke="var(--series-es)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={ptPath} fill="none" stroke="var(--series-pt)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hoverDate && (
            <line
              x1={xScale(hoverDate)}
              x2={xScale(hoverDate)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          )}
          {hoverEs && <circle cx={xScale(hoverEs.date)} cy={yScale(hoverEs.value)} r={4} fill="var(--series-es)" />}
          {hoverPt && <circle cx={xScale(hoverPt.date)} cy={yScale(hoverPt.value)} r={4} fill="var(--series-pt)" />}

          {allDates.length > 0 && (
            <>
              <text x={PAD_LEFT} y={HEIGHT - 8} fontSize={10} fill="var(--text-muted)">
                {formatDateShort(allDates[0])}
              </text>
              <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 8} fontSize={10} fill="var(--text-muted)" textAnchor="end">
                {formatDateShort(allDates[allDates.length - 1])}
              </text>
            </>
          )}
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
                .map((d) => {
                  const es = esSeries.find((p) => p.date === d);
                  const pt = ptSeries.find((p) => p.date === d);
                  return (
                    <tr key={d}>
                      <td style={tdStyle}>{formatDateShort(d)}</td>
                      <td style={tdStyle}>{es ? formatNumber(es.value) : "–"}</td>
                      <td style={tdStyle}>{pt ? formatNumber(pt.value) : "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {hoverDate && !showTable && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {formatDateFull(hoverDate)} — {esLabel}: <strong>{hoverEs ? formatNumber(hoverEs.value) : "sin dato"}</strong> · {ptLabel}:{" "}
          <strong>{hoverPt ? formatNumber(hoverPt.value) : "sin dato"}</strong>
        </div>
      )}
    </div>
  );
}

function Legend({ esLabel, ptLabel }: { esLabel: string; ptLabel: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--series-es)", display: "inline-block" }} />
        {esLabel}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--series-pt)", display: "inline-block" }} />
        {ptLabel}
      </span>
    </div>
  );
}

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

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--gridline)",
  color: "var(--text-primary)",
};
