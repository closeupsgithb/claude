import type { NetworkSnapshot } from "@/lib/metricool";

type Props = {
  countryLabel: string;
  colorVar: "--series-es" | "--series-pt";
  data: NetworkSnapshot;
  reachLabel: string;
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

export default function CountryPanel({ countryLabel, colorVar, data, reachLabel }: Props) {
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
    </div>
  );
}
