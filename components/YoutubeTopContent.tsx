"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { YoutubeVideoItem } from "@/lib/metricool";
import InfoTip from "@/components/InfoTip";

type Props = {
  items: YoutubeVideoItem[];
};

type SortKey = "views" | "likes" | "comments" | "watchMinutes" | "engagementRate";

const SORT_OPTIONS: { key: SortKey; label: string; tip?: string }[] = [
  { key: "views", label: "Visualizaciones" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comentarios" },
  { key: "watchMinutes", label: "Tiempo de visualización" },
  { key: "engagementRate", label: "Engagement", tip: "(Likes + comentarios + shares) ÷ visualizaciones." },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(iso));
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

function ShortIcon() {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="7" height="9" rx="1.5" stroke="currentColor" />
      <circle cx="4" cy="8" r="0.6" fill="currentColor" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M1 0.5 L9 5 L1 9.5 Z" />
    </svg>
  );
}

// YouTube's thumbnail CDN occasionally 503s on a valid URL (an upstream
// outage, not a missing thumbnail) — onError swaps to the same fallback
// used when there's genuinely no thumbnail, instead of a blank box.
function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div style={noImageStyle}>sin imagen</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={thumbStyle} onError={() => setFailed(true)} />;
}

export default function YoutubeTopContent({ items }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("views");

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
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Sin vídeos publicados en este periodo.</p>
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
              {opt.tip && <InfoTip text={opt.tip} />}
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
          const metricLabel = !hasValue
            ? "No disponible"
            : sortKey === "engagementRate"
            ? `${metricValue!.toFixed(1)}%`
            : sortKey === "watchMinutes"
            ? `${formatNumber(Math.round(metricValue!))} min`
            : formatNumber(metricValue!);

          return (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={cardLinkStyle} title={item.title}>
              <div style={thumbWrapStyle}>
                <Thumb src={item.thumbnail} />
                <span style={{ ...rankBadgeStyle }}>#{i + 1}</span>
                <span style={{ ...formatBadgeStyle, background: item.format === "short" ? "var(--brand-youtube)" : "rgba(11,11,11,0.72)" }}>
                  {item.format === "short" ? <ShortIcon /> : <VideoIcon />}
                  {item.format === "short" ? "SHORT" : "VÍDEO"}
                </span>
              </div>
              <div style={bodyStyle}>
                <div style={titleTextStyle}>{item.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", margin: "3px 0 8px" }}>
                  {formatDate(item.date)}
                  {item.durationSeconds !== null && ` · ${formatDuration(item.durationSeconds)}`}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{metricLabel}</div>
                <div style={progressTrackStyle}>
                  <div
                    style={{
                      ...progressFillStyle,
                      width: `${pct}%`,
                      background: hasValue ? "var(--series-yt)" : "var(--gridline)",
                    }}
                  />
                </div>
                <div style={progressCaptionStyle}>{hasValue ? (i === 0 ? "Líder del Top en esta métrica" : `${pctOfLeader}% del líder del Top`) : ""}</div>
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
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: active ? "var(--series-yt)" : "var(--surface-1)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    whiteSpace: "nowrap",
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
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
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
  aspectRatio: "16 / 9",
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

const formatBadgeStyle: CSSProperties = {
  position: "absolute",
  bottom: 6,
  left: 6,
  fontSize: 9.5,
  fontWeight: 700,
  padding: "3px 7px",
  borderRadius: 999,
  color: "#fff",
  letterSpacing: "0.02em",
  display: "flex",
  alignItems: "center",
  gap: 4,
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

const titleTextStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-primary)",
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
