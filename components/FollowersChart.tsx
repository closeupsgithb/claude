"use client";

import { useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { SeriesPoint } from "@/lib/metricool";

type Props = {
  esSeries: SeriesPoint[];
  ptSeries: SeriesPoint[];
  esLabel?: string;
  ptLabel?: string;
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 108;
const PAD_TOP = 24;
const PAD_BOTTOM = 30;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${formatNumber(n)}`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
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

function seriesPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

// Growth trend is a relative story ("who is growing faster"), not an absolute
// one — España and Portugal differ by 5x in follower count, so plotting raw
// totals on one axis flattens Portugal's line near zero. Indexing both series
// to "% change since day 1" puts them on a shared, comparable axis and makes
// the actual growth rate readable at a glance; absolute totals still appear
// via the end-of-line labels and the hover tooltip.
function indexToStart(series: SeriesPoint[]): SeriesPoint[] {
  if (series.length === 0) return [];
  const base = series[0].value;
  if (!base) return series.map((p) => ({ date: p.date, value: 0 }));
  return series.map((p) => ({ date: p.date, value: ((p.value - base) / base) * 100 }));
}

export default function FollowersChart({ esSeries, ptSeries, esLabel = "España", ptLabel = "Portugal" }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradId = useId();

  const esByDate = useMemo(() => new Map(esSeries.map((p) => [p.date, p.value])), [esSeries]);
  const ptByDate = useMemo(() => new Map(ptSeries.map((p) => [p.date, p.value])), [ptSeries]);

  const esIdx = useMemo(() => indexToStart(esSeries), [esSeries]);
  const ptIdx = useMemo(() => indexToStart(ptSeries), [ptSeries]);
  const esIdxByDate = useMemo(() => new Map(esIdx.map((p) => [p.date, p.value])), [esIdx]);
  const ptIdxByDate = useMemo(() => new Map(ptIdx.map((p) => [p.date, p.value])), [ptIdx]);

  const allDates = useMemo(() => {
    const set = new Set<string>();
    esSeries.forEach((p) => set.add(p.date));
    ptSeries.forEach((p) => set.add(p.date));
    return Array.from(set).sort();
  }, [esSeries, ptSeries]);

  if (allDates.length === 0) {
    return <div style={emptyStyle}>Evolución de seguidores — sin datos en este periodo.</div>;
  }

  const times = allDates.map((d) => new Date(d).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);

  const allValues = [...esIdx, ...ptIdx].map((p) => p.value);
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(0, ...allValues);
  const span = Math.max(rawMax - rawMin, 0.5);
  const domainMin = rawMin - span * 0.2;
  const domainMax = rawMax + span * 0.2;

  const xScale = (iso: string) => {
    const t = new Date(iso).getTime();
    if (maxT === minT) return PAD_LEFT;
    return PAD_LEFT + ((t - minT) / (maxT - minT)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  };
  const yScale = (v: number) => HEIGHT - PAD_BOTTOM - ((v - domainMin) / (domainMax - domainMin)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const esPoints = esIdx.map((p) => ({ x: xScale(p.date), y: yScale(p.value) }));
  const ptPoints = ptIdx.map((p) => ({ x: xScale(p.date), y: yScale(p.value) }));

  const zeroY = yScale(0);
  const gridValues = Array.from({ length: 5 }, (_, i) => domainMin + ((domainMax - domainMin) * i) / 4);

  const tickCount = Math.min(6, allDates.length);
  const xAxisTicks =
    allDates.length <= 1
      ? [0]
      : Array.from(new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (allDates.length - 1)) / (tickCount - 1)))));

  const hoverDate = hoverIdx !== null ? allDates[hoverIdx] : null;

  const esLast = esSeries.length ? esSeries[esSeries.length - 1] : null;
  const ptLast = ptSeries.length ? ptSeries[ptSeries.length - 1] : null;
  const esFirst = esSeries.length ? esSeries[0] : null;
  const ptFirst = ptSeries.length ? ptSeries[0] : null;
  const esDelta = esLast && esFirst ? esLast.value - esFirst.value : 0;
  const ptDelta = ptLast && ptFirst ? ptLast.value - ptFirst.value : 0;
  const esLastPct = esIdx.length ? esIdx[esIdx.length - 1].value : 0;
  const ptLastPct = ptIdx.length ? ptIdx[ptIdx.length - 1].value : 0;

  // Nudge end labels apart if the two lines finish close together, so they
  // never overlap regardless of how close the two growth rates end up.
  let esLabelY = yScale(esLastPct);
  let ptLabelY = yScale(ptLastPct);
  if (Math.abs(esLabelY - ptLabelY) < 26) {
    const mid = (esLabelY + ptLabelY) / 2;
    if (esLabelY <= ptLabelY) {
      esLabelY = mid - 13;
      ptLabelY = mid + 13;
    } else {
      esLabelY = mid + 13;
      ptLabelY = mid - 13;
    }
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Evolución de seguidores</h3>
          <p style={subtitleStyle}>Variación % respecto al inicio del periodo — permite comparar el ritmo de crecimiento entre países</p>
        </div>
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
          aria-label="Evolución de seguidores, variación porcentual respecto al inicio del periodo"
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
          <defs>
            <linearGradient id={`${gradId}-es`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-es)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--series-es)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${gradId}-pt`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-pt)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--series-pt)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridValues.map((v, i) => (
            <g key={i}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke="var(--gridline)" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {formatPct(Math.round(v * 10) / 10)}
              </text>
            </g>
          ))}

          {/* Zero line = starting point of the period, the reference every trend is read against */}
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={zeroY} y2={zeroY} stroke="var(--baseline)" strokeWidth={1.25} />

          <path
            d={esPoints.length ? `${seriesPath(esPoints)} L ${esPoints[esPoints.length - 1].x} ${zeroY} L ${esPoints[0].x} ${zeroY} Z` : ""}
            fill={`url(#${gradId}-es)`}
            stroke="none"
          />
          <path
            d={ptPoints.length ? `${seriesPath(ptPoints)} L ${ptPoints[ptPoints.length - 1].x} ${zeroY} L ${ptPoints[0].x} ${zeroY} Z` : ""}
            fill={`url(#${gradId}-pt)`}
            stroke="none"
          />
          <path d={seriesPath(esPoints)} fill="none" stroke="var(--series-es)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
          <path d={seriesPath(ptPoints)} fill="none" stroke="var(--series-pt)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

          {esPoints.length > 0 && <circle cx={esPoints[esPoints.length - 1].x} cy={esPoints[esPoints.length - 1].y} r={3.5} fill="var(--series-es)" />}
          {ptPoints.length > 0 && <circle cx={ptPoints[ptPoints.length - 1].x} cy={ptPoints[ptPoints.length - 1].y} r={3.5} fill="var(--series-pt)" />}

          {esLast && (
            <text x={WIDTH - PAD_RIGHT + 8} y={esLabelY + 3} fontSize={11} fontWeight={700} fill="var(--series-es)">
              {formatPct(esLastPct)}
            </text>
          )}
          {esLast && (
            <text x={WIDTH - PAD_RIGHT + 8} y={esLabelY + 15} fontSize={9.5} fill="var(--text-muted)">
              {formatSigned(esDelta)}
            </text>
          )}
          {ptLast && (
            <text x={WIDTH - PAD_RIGHT + 8} y={ptLabelY + 3} fontSize={11} fontWeight={700} fill="var(--series-pt)">
              {formatPct(ptLastPct)}
            </text>
          )}
          {ptLast && (
            <text x={WIDTH - PAD_RIGHT + 8} y={ptLabelY + 15} fontSize={9.5} fill="var(--text-muted)">
              {formatSigned(ptDelta)}
            </text>
          )}

          {hoverDate && (
            <line x1={xScale(hoverDate)} x2={xScale(hoverDate)} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3,3" />
          )}
          {hoverDate && esIdxByDate.has(hoverDate) && (
            <circle cx={xScale(hoverDate)} cy={yScale(esIdxByDate.get(hoverDate)!)} r={4} fill="var(--series-es)" stroke="var(--surface-1)" strokeWidth={1.5} />
          )}
          {hoverDate && ptIdxByDate.has(hoverDate) && (
            <circle cx={xScale(hoverDate)} cy={yScale(ptIdxByDate.get(hoverDate)!)} r={4} fill="var(--series-pt)" stroke="var(--surface-1)" strokeWidth={1.5} />
          )}

          {xAxisTicks.map((idx) => {
            const d = allDates[idx];
            const isFirst = idx === 0;
            const isLast = idx === allDates.length - 1;
            return (
              <g key={idx}>
                <line x1={xScale(d)} x2={xScale(d)} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM + 4} stroke="var(--baseline)" strokeWidth={1} />
                <text x={xScale(d)} y={HEIGHT - 10} fontSize={10} fill="var(--text-muted)" textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}>
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
                    <td style={tdStyle}>{esByDate.has(d) ? formatNumber(esByDate.get(d)!) : "–"}</td>
                    <td style={tdStyle}>{ptByDate.has(d) ? formatNumber(ptByDate.get(d)!) : "–"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {hoverDate && !showTable && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {formatDateFull(hoverDate)} — {esLabel}: <strong>{esByDate.has(hoverDate) ? formatNumber(esByDate.get(hoverDate)!) : "sin dato"}</strong> ·{" "}
          {ptLabel}: <strong>{ptByDate.has(hoverDate) ? formatNumber(ptByDate.get(hoverDate)!) : "sin dato"}</strong>
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

const headerStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 };
const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };
const subtitleStyle: CSSProperties = { margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" };
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
