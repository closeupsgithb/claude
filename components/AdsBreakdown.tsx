import type { AdsBreakdown as AdsBreakdownType, SeriesPoint } from "@/lib/metricool";
import DonutChart from "@/components/DonutChart";
import MiniLineChart from "@/components/MiniLineChart";

type Props = {
  ads: AdsBreakdownType;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function buildRatioSeries(numerator: SeriesPoint[], denominator: SeriesPoint[], scale: number): SeriesPoint[] {
  const denomByDate = new Map(denominator.map((p) => [p.date, p.value]));
  return numerator
    .map((p) => {
      const d = denomByDate.get(p.date);
      if (!d || d === 0) return null;
      return { date: p.date, value: (p.value / d) * scale };
    })
    .filter((p): p is SeriesPoint => p !== null);
}

function Row({ label, t }: { label: string; t: AdsBreakdownType["es"] }) {
  return (
    <tr>
      <td style={{ ...tdStyle, fontWeight: 600 }}>{label}</td>
      <td style={tdStyle}>{formatCurrency(t.spend)}</td>
      <td style={tdStyle}>{formatNumber(t.reach)}</td>
      <td style={tdStyle}>{formatNumber(t.impressions)}</td>
      <td style={tdStyle}>{formatNumber(t.clicks)}</td>
      <td style={tdStyle}>{t.ctr.toFixed(2)}%</td>
      <td style={tdStyle}>{formatCurrency(t.cpc)}</td>
      <td style={tdStyle}>{formatCurrency(t.cpm)}</td>
    </tr>
  );
}

export default function AdsBreakdown({ ads }: Props) {
  const cpcSeries = buildRatioSeries(ads.spendSeries, ads.clicksSeries, 1);
  const cpmSeries = buildRatioSeries(ads.spendSeries, ads.impressionsSeries, 1000);
  const hasUnclassified = ads.unclassified.spend > 0;

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600 }}>
          Meta Ads · Paid Media
        </span>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={thStyle}>País</th>
              <th style={thStyle}>Inversión</th>
              <th style={thStyle}>Alcance</th>
              <th style={thStyle}>Impresiones</th>
              <th style={thStyle}>Clics</th>
              <th style={thStyle}>CTR</th>
              <th style={thStyle}>CPC</th>
              <th style={thStyle}>CPM</th>
            </tr>
          </thead>
          <tbody>
            <Row label="España" t={ads.es} />
            <Row label="Portugal" t={ads.pt} />
            {hasUnclassified && <Row label="Sin clasificar" t={ads.unclassified} />}
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>Total Iberia</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatCurrency(ads.total.spend)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatNumber(ads.total.reach)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatNumber(ads.total.impressions)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatNumber(ads.total.clicks)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{ads.total.ctr.toFixed(2)}%</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatCurrency(ads.total.cpc)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, borderTop: "2px solid var(--baseline)" }}>{formatCurrency(ads.total.cpm)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr)", gap: 14 }}>
        <DonutChart
          title="Reparto de inversión"
          slices={[
            { label: "España", value: ads.es.spend, colorVar: "--series-es" },
            { label: "Portugal", value: ads.pt.spend, colorVar: "--series-pt" },
            ...(hasUnclassified ? [{ label: "Sin clasificar", value: ads.unclassified.spend, colorVar: "--series-other" }] : []),
          ]}
        />
        <MiniLineChart title="Evolución CPC (coste por clic)" series={cpcSeries} colorVar="--series-es" formatValue={formatCurrency} />
        <MiniLineChart title="Evolución CPM (coste por mil)" series={cpmSeries} colorVar="--series-pt" formatValue={formatCurrency} />
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  padding: "8px 10px",
  color: "var(--text-muted)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  borderBottom: "1px solid var(--gridline)",
};

const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--gridline)",
  color: "var(--text-primary)",
  whiteSpace: "nowrap" as const,
};
