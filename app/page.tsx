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
import type { NetworkSnapshot, AdsBreakdown as AdsBreakdownType, ContentItem, ContentType, SeriesPoint, PeriodSummary } from "@/lib/metricool";

type ApiResponse = {
  generatedAt: string;
  from: string;
  to: string;
  days: number;
  es: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  pt: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  ads: AdsBreakdownType;
  posts: ContentItem[];
  previousPeriod: {
    from: string;
    to: string;
    es: { instagram: PeriodSummary; facebook: PeriodSummary };
    pt: { instagram: PeriodSummary; facebook: PeriodSummary };
    ads: AdsBreakdownType;
  };
};

type ApiError = { error: "MISSING_CREDENTIALS" | "UPSTREAM_ERROR"; detail?: string };

const REFRESH_MS = 5 * 60 * 1000;
const DAY_OPTIONS = [7, 30, 90];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type EvolutionMetric = "followers" | "reach" | "interactions" | "engagement";
const EVOLUTION_METRICS: { key: EvolutionMetric; label: (reachLabel: string) => string }[] = [
  { key: "followers", label: () => "Seguidores" },
  { key: "reach", label: (reachLabel) => reachLabel },
  { key: "interactions", label: () => "Interacciones" },
  { key: "engagement", label: () => "Tasa de interacción" },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatPeriodRange(from: string, to: string, days: number): string {
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });
  return `Últimos ${days} días · ${fmt.format(new Date(from))} – ${fmt.format(new Date(to))}`;
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

type InsightCandidate = { text: string; weight: number; negative: boolean };

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(iso));
}

function buildInsightCandidates(data: ApiResponse, platform: "instagram" | "facebook"): InsightCandidate[] {
  const platformLabel = platform === "instagram" ? "Instagram" : "Facebook";
  const candidates: InsightCandidate[] = [];

  const countries: { label: string; current: NetworkSnapshot; previous: PeriodSummary }[] = [
    { label: "España", current: data.es[platform], previous: data.previousPeriod.es[platform] },
    { label: "Portugal", current: data.pt[platform], previous: data.previousPeriod.pt[platform] },
  ];

  // Follower momentum: how this period's gain compares to the previous one.
  for (const c of countries) {
    const stagnant = c.current.followersDelta <= 0;
    const change = pctChange(c.current.followersDelta, c.previous.followersGained);
    if (stagnant) {
      candidates.push({
        text: `${c.label} apenas ganó seguidores en ${platformLabel} este periodo (${c.current.followersDelta >= 0 ? "+" : ""}${formatNumber(
          c.current.followersDelta
        )}, frente a +${formatNumber(c.previous.followersGained)} en el anterior) — merece revisar qué cambió en el contenido publicado.`,
        weight: 60,
        negative: true,
      });
    } else if (Math.abs(change) >= 15) {
      const improving = change > 0;
      candidates.push({
        text: `${c.label} ${improving ? "aceleró" : "frenó"} su captación de seguidores en ${platformLabel}: ${
          improving ? "+" : ""
        }${change.toFixed(0)}% respecto al periodo anterior (${formatNumber(c.current.followersDelta)} vs +${formatNumber(c.previous.followersGained)}).`,
        weight: Math.abs(change),
        negative: !improving,
      });
    }
  }

  // Reach momentum.
  for (const c of countries) {
    const change = pctChange(c.current.reach, c.previous.reach);
    if (Math.abs(change) >= 20) {
      const improving = change > 0;
      candidates.push({
        text: `El alcance de ${c.label} en ${platformLabel} ${improving ? "subió" : "cayó"} un ${Math.abs(change).toFixed(
          0
        )}% frente al periodo anterior (${formatNumber(c.current.reach)} vs ${formatNumber(c.previous.reach)}).`,
        weight: Math.abs(change) * 0.9,
        negative: !improving,
      });
    }
  }

  // Interaction momentum.
  for (const c of countries) {
    const change = pctChange(c.current.interactions, c.previous.interactions);
    if (Math.abs(change) >= 20) {
      const improving = change > 0;
      candidates.push({
        text: `Las interacciones de ${c.label} en ${platformLabel} ${improving ? "crecieron" : "bajaron"} un ${Math.abs(change).toFixed(
          0
        )}% respecto al periodo anterior (${formatNumber(c.current.interactions)} vs ${formatNumber(c.previous.interactions)}).`,
        weight: Math.abs(change) * 0.85,
        negative: !improving,
      });
    }
  }

  // Best content format — only surfaced when there's a real gap vs. the runner-up.
  const platformPosts = data.posts.filter((p) => p.network === platform && p.engagementRate !== null);
  if (platformPosts.length >= 3) {
    const byType = new Map<ContentType, { sum: number; count: number }>();
    platformPosts.forEach((p) => {
      const cur = byType.get(p.type) ?? { sum: 0, count: 0 };
      cur.sum += p.engagementRate as number;
      cur.count += 1;
      byType.set(p.type, cur);
    });
    const ranked = Array.from(byType.entries())
      .map(([type, v]) => ({ type, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg);
    if (ranked.length >= 2 && ranked[0].avg > ranked[1].avg * 1.25) {
      candidates.push({
        text: `El formato "${ranked[0].type}" es el que mejor funciona en ${platformLabel} (${ranked[0].avg.toFixed(1)}% de interacción media sobre ${
          ranked[0].count
        } publicaciones), muy por encima de "${ranked[1].type}" (${ranked[1].avg.toFixed(1)}%).`,
        weight: (ranked[0].avg / Math.max(0.1, ranked[1].avg)) * 12,
        negative: false,
      });
    }
  }

  // Underperforming post — flagged only when it falls well below the period average.
  if (platformPosts.length >= 4) {
    const mean = platformPosts.reduce((a, p) => a + (p.engagementRate as number), 0) / platformPosts.length;
    const worst = platformPosts.reduce((a, p) => ((p.engagementRate as number) < (a.engagementRate as number) ? p : a));
    if (mean > 0 && (worst.engagementRate as number) < mean * 0.4) {
      candidates.push({
        text: `Una publicación de tipo ${worst.type} en ${worst.country === "es" ? "España" : "Portugal"} (${formatShortDate(
          worst.date
        )}) tuvo solo ${(worst.engagementRate as number).toFixed(1)}% de interacción, muy por debajo de la media del periodo (${mean.toFixed(1)}%).`,
        weight: ((mean - (worst.engagementRate as number)) / mean) * 45,
        negative: true,
      });
    }
  }

  // Meta Ads efficiency trend (account-wide, since the ad account is shared).
  const cpcChange = pctChange(data.ads.total.cpc, data.previousPeriod.ads.total.cpc);
  if (data.ads.total.clicks > 0 && data.previousPeriod.ads.total.clicks > 0 && Math.abs(cpcChange) >= 12) {
    const improving = cpcChange < 0;
    candidates.push({
      text: `El coste por clic en Meta Ads ${improving ? "bajó" : "subió"} un ${Math.abs(cpcChange).toFixed(0)}% respecto al periodo anterior (${data.ads.total.cpc.toFixed(
        2
      )}€ vs ${data.previousPeriod.ads.total.cpc.toFixed(2)}€).`,
      weight: Math.abs(cpcChange) * 0.8,
      negative: !improving,
    });
  } else if (data.ads.es.clicks > 0 && data.ads.pt.clicks > 0) {
    const cheaperCpc = data.ads.es.cpc <= data.ads.pt.cpc ? "España" : "Portugal";
    const gap = pctChange(Math.max(data.ads.es.cpc, data.ads.pt.cpc), Math.min(data.ads.es.cpc, data.ads.pt.cpc));
    if (gap >= 20) {
      candidates.push({
        text: `${cheaperCpc} consigue clics notablemente más baratos en Meta Ads que el otro mercado (${Math.min(
          data.ads.es.cpc,
          data.ads.pt.cpc
        ).toFixed(2)}€ vs ${Math.max(data.ads.es.cpc, data.ads.pt.cpc).toFixed(2)}€ por clic).`,
        weight: gap * 0.5,
        negative: false,
      });
    }
  }

  return candidates;
}

// Ranks candidates by how much they actually stand out this period, then makes
// sure the result isn't purely good news — if a real negative signal exists it
// gets a guaranteed seat, matching how an analyst would actually flag risks.
function selectInsights(candidates: InsightCandidate[], max = 5): string[] {
  const sorted = [...candidates].sort((a, b) => b.weight - a.weight);
  const selected = sorted.slice(0, max);

  const hasNegative = selected.some((c) => c.negative);
  if (!hasNegative) {
    const bestNegative = sorted.find((c) => c.negative && !selected.includes(c));
    if (bestNegative && selected.length > 0) {
      selected[selected.length - 1] = bestNegative;
    }
  }

  return selected.map((c) => c.text);
}

export default function Page() {
  const [platform, setPlatform] = useState<"instagram" | "facebook">("instagram");
  const [days, setDays] = useState(30);
  const [evolutionMetric, setEvolutionMetric] = useState<EvolutionMetric>("followers");
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

  const insights = useMemo(() => (data ? selectInsights(buildInsightCandidates(data, platform)) : []), [data, platform]);

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
          <InsightBanner insights={insights} periodLabel={formatPeriodRange(data.from, data.to, data.days)} />

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
              <CountryPanel
                countryLabel="España"
                colorVar="--series-es"
                data={data.es[platform]}
                reachLabel={reachLabel}
                previous={data.previousPeriod.es[platform]}
              />
              <CountryPanel
                countryLabel="Portugal"
                colorVar="--series-pt"
                data={data.pt[platform]}
                reachLabel={reachLabel}
                previous={data.previousPeriod.pt[platform]}
              />
            </section>
          </div>

          <div>
            <SectionLabel>Contenido</SectionLabel>
            <TopContent items={platformPosts} />
          </div>

          <div>
            <SectionLabel>Evolución diaria</SectionLabel>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {EVOLUTION_METRICS.map((m) => (
                <button key={m.key} onClick={() => setEvolutionMetric(m.key)} style={tabStyle(evolutionMetric === m.key)}>
                  {m.label(reachLabel)}
                </button>
              ))}
            </div>
            {evolutionMetric === "followers" && (
              <TrendChart title="Evolución de seguidores" esSeries={data.es[platform].followersSeries} ptSeries={data.pt[platform].followersSeries} />
            )}
            {evolutionMetric === "reach" && (
              <AreaChart title={`${reachLabel} diario`} esSeries={data.es[platform].reachSeries} ptSeries={data.pt[platform].reachSeries} />
            )}
            {evolutionMetric === "interactions" && (
              <AreaChart
                title="Interacciones diarias"
                esSeries={data.es[platform].interactionsSeries}
                ptSeries={data.pt[platform].interactionsSeries}
              />
            )}
            {evolutionMetric === "engagement" && (
              <TrendChart
                title="Evolución de la tasa de interacción"
                esSeries={engagementRateSeries(data.es[platform].reachSeries, data.es[platform].interactionsSeries)}
                ptSeries={engagementRateSeries(data.pt[platform].reachSeries, data.pt[platform].interactionsSeries)}
              />
            )}
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
      <span style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>{value !== null ? formatNumber(value) : "–"}</span>
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
