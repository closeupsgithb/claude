"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import CountryPanel from "@/components/CountryPanel";
import AdsBreakdown from "@/components/AdsBreakdown";
import TrendChart from "@/components/TrendChart";
import AreaChart from "@/components/AreaChart";
import BarChart from "@/components/BarChart";
import TopContent from "@/components/TopContent";
import InsightBanner from "@/components/InsightBanner";
import Logo from "@/components/Logo";
import type { NetworkSnapshot, AdsBreakdown as AdsBreakdownType, ContentItem, SeriesPoint } from "@/lib/metricool";

type ApiResponse = {
  generatedAt: string;
  days: number;
  es: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  pt: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  ads: AdsBreakdownType;
  posts: ContentItem[];
};

type ApiError = { error: "MISSING_CREDENTIALS" | "UPSTREAM_ERROR"; detail?: string };

const REFRESH_MS = 5 * 60 * 1000;
const DAY_OPTIONS = [7, 30, 90];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function engagementRateSeries(reach: SeriesPoint[], interactions: SeriesPoint[]): SeriesPoint[] {
  const interByDate = new Map(interactions.map((p) => [p.date, p.value]));
  return reach
    .map((p) => {
      const i = interByDate.get(p.date);
      if (i === undefined || p.value === 0) return null;
      return { date: p.date, value: (i / p.value) * 100 };
    })
    .filter((p): p is SeriesPoint => p !== null);
}

function buildCsv(data: ApiResponse, platform: "instagram" | "facebook", reachLabel: string): string {
  const es = data.es[platform];
  const pt = data.pt[platform];
  const rows: string[][] = [
    ["Métrica", "España", "Portugal"],
    ["Seguidores", String(es.followers), String(pt.followers)],
    [reachLabel, String(es.reach), String(pt.reach)],
    ["Interacciones", String(es.interactions), String(pt.interactions)],
    ["Publicaciones", String(es.posts), String(pt.posts)],
    [es.secondaryLabel, String(es.secondary), String(pt.secondary)],
    [],
    ["Meta Ads — por país"],
    ["Inversión (€) España", data.ads.es.spend.toFixed(2)],
    ["Inversión (€) Portugal", data.ads.pt.spend.toFixed(2)],
    ["CTR España (%)", data.ads.es.ctr.toFixed(2)],
    ["CTR Portugal (%)", data.ads.pt.ctr.toFixed(2)],
    ["CPC España (€)", data.ads.es.cpc.toFixed(2)],
    ["CPC Portugal (€)", data.ads.pt.cpc.toFixed(2)],
  ];
  return rows.map((r) => r.join(";")).join("\n");
}

function buildInsights(data: ApiResponse, platform: "instagram" | "facebook"): string[] {
  const insights: string[] = [];
  const es = data.es[platform];
  const pt = data.pt[platform];

  if (es.followersDelta !== pt.followersDelta) {
    const leader = es.followersDelta >= pt.followersDelta ? "España" : "Portugal";
    const delta = Math.max(es.followersDelta, pt.followersDelta);
    insights.push(`${leader} lidera el crecimiento de seguidores en ${platform === "instagram" ? "Instagram" : "Facebook"} con +${formatNumber(delta)} en el periodo.`);
  }

  const esEng = es.reach > 0 ? (es.interactions / es.reach) * 100 : 0;
  const ptEng = pt.reach > 0 ? (pt.interactions / pt.reach) * 100 : 0;
  if (esEng > 0 || ptEng > 0) {
    const leader = esEng >= ptEng ? "España" : "Portugal";
    const rate = Math.max(esEng, ptEng);
    insights.push(`${leader} tiene la tasa de interacción más alta (${rate.toFixed(1)}%).`);
  }

  const platformPosts = data.posts.filter((p) => p.network === platform && p.engagementRate !== null);
  if (platformPosts.length > 0) {
    const byType = new Map<string, { sum: number; count: number }>();
    platformPosts.forEach((p) => {
      const cur = byType.get(p.type) ?? { sum: 0, count: 0 };
      cur.sum += p.engagementRate as number;
      cur.count += 1;
      byType.set(p.type, cur);
    });
    let bestType = "";
    let bestAvg = -1;
    byType.forEach((v, k) => {
      const avg = v.sum / v.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestType = k;
      }
    });
    if (bestType) {
      insights.push(`El formato "${bestType}" genera la mejor interacción media (${bestAvg.toFixed(1)}%) en ${platform === "instagram" ? "Instagram" : "Facebook"}.`);
    }
  }

  if (data.ads.es.clicks > 0 && data.ads.pt.clicks > 0) {
    const cheaper = data.ads.es.cpc <= data.ads.pt.cpc ? "España" : "Portugal";
    insights.push(`${cheaper} tiene el coste por clic más eficiente en Meta Ads.`);
  }

  return insights.slice(0, 4);
}

export default function Page() {
  const [platform, setPlatform] = useState<"instagram" | "facebook">("instagram");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics?days=${days}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json as ApiError);
        setData(null);
      } else {
        setData(json as ApiResponse);
        setError(null);
      }
    } catch {
      setError({ error: "UPSTREAM_ERROR", detail: "No se pudo contactar con el servidor." });
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const reachLabel = platform === "instagram" ? "Alcance" : "Visualizaciones de contenido";

  const exportCsv = () => {
    if (!data) return;
    const csv = buildCsv(data, platform, reachLabel);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shimano-iberia-${platform}-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insights = useMemo(() => (data ? buildInsights(data, platform) : []), [data, platform]);

  const weekdayData = useMemo(() => {
    if (!data) return { es: new Array(7).fill(0), pt: new Array(7).fill(0) };
    const es = new Array(7).fill(0);
    const pt = new Array(7).fill(0);
    data.posts
      .filter((p) => p.network === platform && p.date)
      .forEach((p) => {
        const idx = (new Date(p.date).getDay() + 6) % 7;
        if (p.country === "es") es[idx] += p.interactions;
        else pt[idx] += p.interactions;
      });
    return { es, pt };
  }, [data, platform]);

  const contentTypeData = useMemo(() => {
    if (!data) return { types: [] as string[], es: [] as number[], pt: [] as number[] };
    const map = new Map<string, { es: number[]; pt: number[] }>();
    data.posts
      .filter((p) => p.network === platform && p.engagementRate !== null)
      .forEach((p) => {
        const entry = map.get(p.type) ?? { es: [], pt: [] };
        if (p.country === "es") entry.es.push(p.engagementRate as number);
        else entry.pt.push(p.engagementRate as number);
        map.set(p.type, entry);
      });
    const types = Array.from(map.keys());
    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      types,
      es: types.map((t) => avg(map.get(t)!.es)),
      pt: types.map((t) => avg(map.get(t)!.pt)),
    };
  }, [data, platform]);

  const combinedFollowers = data ? data.es[platform].followers + data.pt[platform].followers : null;
  const combinedReach = data ? data.es[platform].reach + data.pt[platform].reach : null;
  const combinedInteractions = data ? data.es[platform].interactions + data.pt[platform].interactions : null;

  const platformPosts = data ? data.posts.filter((p) => p.network === platform) : [];

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 64px" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={logoChipStyle}>
            <Logo />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em" }}>Iberia · Social Performance</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>España y Portugal · datos en tiempo real</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {data && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Actualizado {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt))}
            </span>
          )}
          <button onClick={exportCsv} disabled={!data} style={secondaryButtonStyle}>
            Exportar CSV
          </button>
          <button onClick={load} disabled={loading} style={secondaryButtonStyle}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["instagram", "facebook"] as const).map((p) => (
            <button key={p} onClick={() => setPlatform(p)} style={tabStyle(platform === p)}>
              {p === "instagram" ? "Instagram" : "Facebook"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)} style={tabStyle(days === d)}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {error?.error === "MISSING_CREDENTIALS" && (
        <div style={noticeStyle}>
          <strong>Faltan credenciales de Metricool.</strong> Añade las variables de entorno{" "}
          <code>METRICOOL_USER_TOKEN</code> y <code>METRICOOL_USER_ID</code> en Vercel → Settings → Environment
          Variables, y vuelve a desplegar.
        </div>
      )}
      {error?.error === "UPSTREAM_ERROR" && (
        <div style={noticeStyle}>
          <strong>No se pudieron obtener los datos de Metricool.</strong>
          {error.detail && <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{error.detail}</div>}
        </div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <InsightBanner insights={insights} />

          <div>
            <SectionLabel>{`Total Iberia · ${platform === "instagram" ? "Instagram" : "Facebook"}`}</SectionLabel>
            <section
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 24,
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 18px",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <TotalStat label="Seguidores" value={combinedFollowers} />
              <TotalStat label={reachLabel} value={combinedReach} />
              <TotalStat label="Interacciones" value={combinedInteractions} />
            </section>
          </div>

          <div>
            <SectionLabel>España frente a Portugal</SectionLabel>
            <section style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <CountryPanel countryLabel="España" colorVar="--series-es" data={data.es[platform]} reachLabel={reachLabel} />
              <CountryPanel countryLabel="Portugal" colorVar="--series-pt" data={data.pt[platform]} reachLabel={reachLabel} />
            </section>
          </div>

          <div>
            <SectionLabel>Contenido</SectionLabel>
            <TopContent items={platformPosts} />
          </div>

          <div>
            <SectionLabel>Evolución diaria</SectionLabel>
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <TrendChart
                title="Evolución de seguidores"
                esSeries={data.es[platform].followersSeries}
                ptSeries={data.pt[platform].followersSeries}
              />
              <AreaChart title={`${reachLabel} diario`} esSeries={data.es[platform].reachSeries} ptSeries={data.pt[platform].reachSeries} />
              <AreaChart
                title="Interacciones diarias"
                esSeries={data.es[platform].interactionsSeries}
                ptSeries={data.pt[platform].interactionsSeries}
              />
              <TrendChart
                title="Evolución de la tasa de interacción"
                esSeries={engagementRateSeries(data.es[platform].reachSeries, data.es[platform].interactionsSeries)}
                ptSeries={engagementRateSeries(data.pt[platform].reachSeries, data.pt[platform].interactionsSeries)}
              />
            </section>
          </div>

          <div>
            <SectionLabel>Análisis de patrones</SectionLabel>
            <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 14 }}>
              <BarChart title="Interacciones por día de la semana" categories={WEEKDAY_LABELS} esValues={weekdayData.es} ptValues={weekdayData.pt} />
              <BarChart
                title="Interacción media por tipo de contenido"
                categories={contentTypeData.types}
                esValues={contentTypeData.es}
                ptValues={contentTypeData.pt}
                formatValue={(n) => `${n.toFixed(1)}%`}
              />
            </section>
          </div>

          <div>
            <SectionLabel>Inversión publicitaria</SectionLabel>
            <AdsBreakdown ads={data.ads} />
          </div>
        </div>
      )}

      {!data && !error && loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Cargando datos…</p>}
    </main>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

function TotalStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{value !== null ? formatNumber(value) : "–"}</span>
    </div>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: active ? "var(--series-es)" : "var(--surface-1)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  };
}

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 24,
};

const logoChipStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 8,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  border: "1px solid var(--border)",
  boxShadow: "var(--card-shadow)",
};

const secondaryButtonStyle: CSSProperties = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-1)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
  marginBottom: 10,
  paddingLeft: 2,
};

const noticeStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "14px 16px",
  fontSize: 13,
  color: "var(--text-secondary)",
  marginBottom: 20,
};
