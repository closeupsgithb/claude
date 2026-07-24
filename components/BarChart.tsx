"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type Props = {
  title: string;
  categories: string[];
  esValues: number[];
  ptValues: number[];
  esLabel?: string;
  ptLabel?: string;
  formatValue?: (n: number) => string;
};

const WIDTH = 720;
const HEIGHT = 220;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function defaultFormat(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

export default function BarChart({ title, categories, esValues, ptValues, esLabel = "España", ptLabel = "Portugal", formatValue = defaultFormat }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (categories.length === 0) {
    return (
      <div style={emptyStyle}>
        {title} — sin datos en este periodo.
      </div>
    );
  }

  const maxV = Math.max(1, ...esValues, ...ptValues) * 1.15;
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const groupW = plotW / categories.length;
  const barW = Math.min(22, groupW * 0.32);
  const gap = 3;

  const yScale = (v: number) => HEIGHT - PAD_BOTTOM - (v / maxV) * plotH;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => (maxV * i) / gridLines);

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Legend esLabel={esLabel} ptLabel={ptLabel} />
          <button onClick={() => setShowTable((s) => !s)} style={toggleButtonStyle}>
            {showTable ? "Ver gráfico" : "Ver tabla"}
          </button>
        </div>
      </div>

      {!showTable ? (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={title}>
          {gridValues.map((v, i) => (
            <g key={i}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke="var(--gridline)" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {formatValue(v)}
              </text>
            </g>
          ))}

          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} stroke="var(--baseline)" strokeWidth={1} />

          {categories.map((cat, i) => {
            const cx = PAD_LEFT + groupW * i + groupW / 2;
            const esV = esValues[i] ?? 0;
            const ptV = ptValues[i] ?? 0;
            const isHover = hoverIdx === i;
            return (
              <g
                key={cat}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ cursor: "pointer" }}
              >
                <rect x={cx - gap - barW} y={PAD_TOP} width={barW + gap * 2 + barW} height={plotH} fill="transparent" />
                <rect
                  x={cx - gap - barW}
                  y={yScale(esV)}
                  width={barW}
                  height={Math.max(0, HEIGHT - PAD_BOTTOM - yScale(esV))}
                  rx={2}
                  fill="var(--series-es)"
                  opacity={isHover ? 1 : 0.9}
                />
                <rect
                  x={cx + gap}
                  y={yScale(ptV)}
                  width={barW}
                  height={Math.max(0, HEIGHT - PAD_BOTTOM - yScale(ptV))}
                  rx={2}
                  fill="var(--series-pt)"
                  opacity={isHover ? 1 : 0.9}
                />
                <text x={cx} y={HEIGHT - 10} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                  {cat}
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
                <th style={thStyle}>Categoría</th>
                <th style={thStyle}>{esLabel}</th>
                <th style={thStyle}>{ptLabel}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat}>
                  <td style={tdStyle}>{cat}</td>
                  <td style={tdStyle}>{formatValue(esValues[i] ?? 0)}</td>
                  <td style={tdStyle}>{formatValue(ptValues[i] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hoverIdx !== null && !showTable && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {categories[hoverIdx]} — {esLabel}: <strong>{formatValue(esValues[hoverIdx] ?? 0)}</strong> · {ptLabel}:{" "}
          <strong>{formatValue(ptValues[hoverIdx] ?? 0)}</strong>
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

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
  flexWrap: "wrap",
  gap: 8,
};

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

const emptyStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px",
  fontSize: 13,
  color: "var(--text-muted)",
};

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
