"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ContentItem } from "@/lib/metricool";

type Props = {
  items: ContentItem[];
};

type SortKey = "interactions" | "reach" | "engagementRate";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "interactions", label: "Interacciones" },
  { key: "reach", label: "Alcance" },
  { key: "engagementRate", label: "Tasa de interacción" },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(iso));
}

export default function TopContent({ items }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("interactions");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 8);
  }, [items, sortKey]);

  const topValue = sorted[0]?.[sortKey] ?? 1;

  if (items.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Top Contenidos</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Sin publicaciones en este periodo.</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Top Contenidos</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setSortKey(opt.key)} style={pillStyle(sortKey === opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={gridStyle}>
        {sorted.map((item, i) => {
          const metricValue = item[sortKey];
          const pct = Math.max(4, (metricValue / topValue) * 100);
          const metricLabel = sortKey === "engagementRate" ? `${metricValue.toFixed(1)}%` : formatNumber(metricValue);
          return (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={cardLinkStyle}>
              <div style={thumbWrapStyle}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" style={thumbStyle} />
                ) : (
                  <div style={{ ...thumbStyle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
                    sin imagen
                  </div>
                )}
                <span style={rankBadgeStyle}>#{i + 1}</span>
                <span style={networkBadgeStyle(item.network)}>{item.network === "instagram" ? "IG" : "FB"}</span>
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                  <span style={{ color: `var(${item.country === "es" ? "--series-es" : "--series-pt"})`, fontWeight: 600 }}>
                    {item.country === "es" ? "España" : "Portugal"}
                  </span>
                  <span>{formatDate(item.date)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{item.type}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{metricLabel}</div>
                <div style={progressTrackStyle}>
                  <div style={{ ...progressFillStyle, width: `${pct}%`, background: `var(${item.country === "es" ? "--series-es" : "--series-pt"})` }} />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function pillStyle(active: boolean): CSSProperties {
  return {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--series-es)" : "var(--surface-1)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  };
}

function networkBadgeStyle(network: string): CSSProperties {
  return {
    position: "absolute",
    top: 6,
    right: 6,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
    background: network === "instagram" ? "#E1306C" : "#1877F2",
    color: "#fff",
  };
}

const cardStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 16px 18px",
  boxShadow: "var(--card-shadow)",
};

const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
  flexWrap: "wrap",
  gap: 8,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 12,
};

const cardLinkStyle: CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--page-plane)",
  transition: "transform 120ms, box-shadow 120ms",
};

const thumbWrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  background: "var(--gridline)",
};

const thumbStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const rankBadgeStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  left: 6,
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
};

const progressTrackStyle: CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: "var(--gridline)",
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: 2,
};
