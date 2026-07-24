"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type Slice = { label: string; value: number; colorVar: string };

type Props = {
  title: string;
  slices: Slice[];
  formatValue?: (n: number) => string;
};

const SIZE = 160;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function defaultFormat(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function DonutChart({ title, slices, formatValue = defaultFormat }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = slices.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>Sin inversión registrada en este periodo.</p>
      </div>
    );
  }

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total;
      const dash = frac * C;
      const arc = { ...s, dash, offset, i, pct: frac * 100 };
      offset += dash;
      return arc;
    });

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={title}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--gridline)" strokeWidth={STROKE} />
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={`var(${a.colorVar})`}
                strokeWidth={STROKE}
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                strokeDashoffset={-a.offset}
                opacity={hoverIdx === null || hoverIdx === a.i ? 1 : 0.35}
                onMouseEnter={() => setHoverIdx(a.i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ cursor: "pointer", transition: "opacity 120ms" }}
              />
            ))}
          </g>
          <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--text-primary)">
            {formatValue(total)}
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 12} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
            total
          </text>
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {arcs.map((a) => (
            <div
              key={a.label}
              onMouseEnter={() => setHoverIdx(a.i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(${a.colorVar})`, display: "inline-block" }} />
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{a.label}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {formatValue(a.value)} · {a.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 16px 12px",
  boxShadow: "var(--card-shadow)",
  height: "100%",
};

const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };
