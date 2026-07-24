"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ContentItem, ContentType } from "@/lib/metricool";

type Props = {
  items: ContentItem[];
};

type SortKey = "interactions" | "reach" | "engagementRate" | "views";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "interactions", label: "Interacciones" },
  { key: "views", label: "Visualizaciones" },
  { key: "reach", label: "Alcance" },
  { key: "engagementRate", label: "Tasa de interacción" },
];

const TYPE_STYLE: Record<ContentType, { bg: string; fg: string; icon: "play" | "stack" | "square" }> = {
  Reel: { bg: "#E1306C", fg: "#ffffff", icon: "play" },
  Vídeo: { bg: "#1877F2", fg: "#ffffff", icon: "play" },
  Carrusel: { bg: "#eda100", fg: "#1a1200", icon: "stack" },
  Imagen: { bg: "#6b7280", fg: "#ffffff", icon: "square" },
};

function TypeIcon({ icon }: { icon: "play" | "stack" | "square" }) {
  if (icon === "play") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
        <path d="M1 0.5 L9 5 L1 9.5 Z" />
      </svg>
    );
  }
  if (icon === "stack") {
    return (
      <svg width="10" height="9" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="0.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="4.5" y="0.5" width="6" height="6" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" />
    </svg>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(iso));
}

export default function TopContent({ items }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("interactions");

  const hasUnreliableReach = useMemo(() => items.some((i) => i.reach === null), [items]);

  const sorted = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      })
      .slice(0, 8);
  }, [items, sortKey]);

  const topValue = Math.max(1, ...sorted.map((s) => s[sortKey] ?? 0));

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
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
          const hasValue = metricValue !== null;
          const pctOfLeader = hasValue ? Math.round((metricValue! / topValue) * 100) : 0;
          const pct = hasValue ? Math.max(4, pctOfLeader) : 0;
          const metricLabel = !hasValue ? "No disponible" : sortKey === "engagementRate" ? `${metricValue!.toFixed(1)}%` : formatNumber(metricValue!);
          const typeStyle = TYPE_STYLE[item.type];
          const countryColorVar = item.country === "es" ? "--series-es" : "--series-pt";

          return (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={cardLinkStyle}>
              <div style={thumbWrapStyle}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" style={thumbStyle} />
                ) : (
                  <div style={noImageStyle}>sin imagen</div>
                )}
                <span style={{ ...typeBadgeStyle, background: typeStyle.bg, color: typeStyle.fg }}>
                  <TypeIcon icon={typeStyle.icon} />
                  {item.type}
                </span>
                <span style={networkBadgeStyle(item.network)}>{item.network === "instagram" ? "IG" : "FB"}</span>
                <span style={{ ...rankBadgeStyle }}>#{i + 1}</span>
              </div>
              <div style={bodyStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: `var(${countryColorVar})` }}>
                    {item.country === "es" ? "España" : "Portugal"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(item.date)}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{metricLabel}</div>
                <div style={progressTrackStyle}>
                  <div
                    style={{
                      ...progressFillStyle,
                      width: `${pct}%`,
                      background: hasValue ? `var(${countryColorVar})` : "var(--gridline)",
                    }}
                  />
                </div>
                <div style={progressCaptionStyle}>{hasValue ? (i === 0 ? "Líder del Top en esta métrica" : `${pctOfLeader}% del líder del Top`) : ""}</div>
              </div>
            </a>
          );
        })}
      </div>

      {hasUnreliableReach && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "12px 0 0" }}>
          El alcance de los Reels de Facebook no está disponible de forma fiable en la API de Metricool — se muestra
          &quot;No disponible&quot; en lugar de forzar un valor.
        </p>
      )}
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
    whiteSpace: "nowrap",
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
    lineHeight: 1.4,
  };
}

const cardStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "18px 18px 20px",
  boxShadow: "var(--card-shadow)",
};

const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" };

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
  flexWrap: "wrap",
  gap: 8,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 14,
  alignItems: "stretch",
};

const cardLinkStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  textDecoration: "none",
  color: "inherit",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
  background: "var(--page-plane)",
  transition: "transform 150ms ease, box-shadow 150ms ease",
};

const thumbWrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  background: "var(--gridline)",
  flexShrink: 0,
};

const thumbStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const noImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  color: "var(--text-muted)",
};

const typeBadgeStyle: CSSProperties = {
  position: "absolute",
  bottom: 6,
  left: 6,
  fontSize: 9.5,
  fontWeight: 700,
  padding: "3px 7px",
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  gap: 4,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
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

const bodyStyle: CSSProperties = {
  padding: "10px 11px 12px",
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
};

const progressTrackStyle: CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: "var(--gridline)",
  overflow: "hidden",
  marginTop: "auto",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: 2,
};

const progressCaptionStyle: CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  marginTop: 4,
};
