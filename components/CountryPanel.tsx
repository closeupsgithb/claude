import type { CSSProperties } from "react";
import type { NetworkSnapshot, PeriodSummary } from "@/lib/metricool";

type Props = {
  countryLabel: string;
  colorVar: "--series-es" | "--series-pt";
  data: NetworkSnapshot;
  reachLabel: string;
  previous?: PeriodSummary;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function ChangeChip({ label, current, previous, unit }: { label: string; current: number; previous: number; unit: "pct" | "pp" }) {
  let display: string;
  let direction: "up" | "down" | "flat";

  if (unit === "pp") {
    const diff = current - previous;
    direction = diff > 0.2 ? "up" : diff < -0.2 ? "down" : "flat";
    display = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}pp`;
  } else {
    const pct = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
    direction = pct > 1 ? "up" : pct < -1 ? "down" : "flat";
    display = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }

  const color = direction === "up" ? "var(--success)" : direction === "down" ? "var(--decline)" : "var(--text-muted)";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>
        {arrow} {display}
      </span>
    </span>
  );
}

export default function CountryPanel({ countryLabel, colorVar, data, reachLabel, previous }: Props) {
  const engagementRate = data.reach > 0 ? (data.interactions / data.reach) * 100 : 0;
  const deltaPositive = data.followersDelta > 0;

  return (
    <div
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, var(${colorVar}) 6%, var(--surface-1)), var(--surface-1) 90px)`,
        border: "1px solid var(--border)",
        borderTop: `3px solid var(${colorVar})`,
        borderRadius: 12,
        padding: "16px 18px",
        flex: "1 1 280px",
        minWidth: 260,
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(${colorVar})`, display: "inline-block" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{countryLabel}</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Metric
          label="Seguidores"
          value={`${formatNumber(data.followers)}${
            data.followersDelta !== 0 ? ` (${deltaPositive ? "+" : ""}${formatNumber(data.followersDelta)})` : ""
          }`}
        />
        <Metric label={reachLabel} value={formatNumber(data.reach)} />
        <Metric label="Interacciones" value={formatNumber(data.interactions)} />
        <Metric label="Tasa de interacción" value={`${engagementRate.toFixed(1)}%`} />
        <Metric label="Publicaciones" value={formatNumber(data.posts)} />
        <Metric label={data.secondaryLabel} value={formatNumber(data.secondary)} />
      </div>

      {previous && (
        <div style={comparisonRowStyle}>
          <span style={comparisonEyebrowStyle}>vs. periodo anterior</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            <ChangeChip label="Seguidores" current={data.followersDelta} previous={previous.followersGained} unit="pct" />
            <ChangeChip label={reachLabel} current={data.reach} previous={previous.reach} unit="pct" />
            <ChangeChip label="Interacciones" current={data.interactions} previous={previous.interactions} unit="pct" />
            <ChangeChip label="Tasa interacción" current={engagementRate} previous={previous.engagementRate} unit="pp" />
          </div>
        </div>
      )}
    </div>
  );
}

const comparisonRowStyle: CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px dashed var(--border)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const comparisonEyebrowStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};
