"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import CountryPanel from "@/components/CountryPanel";
import AdsBreakdown from "@/components/AdsBreakdown";
import TrendChart from "@/components/TrendChart";
import AreaChart from "@/components/AreaChart";
import FollowersChart from "@/components/FollowersChart";
import BarChart from "@/components/BarChart";
import TopContent from "@/components/TopContent";
import InsightBanner from "@/components/InsightBanner";
import ContentIntelligence from "@/components/ContentIntelligence";
import Logo from "@/components/Logo";
import YoutubeTopCards from "@/components/YoutubeTopCards";
import YoutubeTopContent from "@/components/YoutubeTopContent";
import YoutubeFormatComparison from "@/components/YoutubeFormatComparison";
import YoutubeBestTimes, { type RankedStat } from "@/components/YoutubeBestTimes";
import type {
  NetworkSnapshot,
  AdsBreakdown as AdsBreakdownType,
  ContentItem,
  ContentType,
  SeriesPoint,
  PeriodSummary,
  YoutubeChannelSnapshot,
  YoutubePeriodSummary,
  YoutubeVideoItem,
} from "@/lib/metricool";
import { analyzeContent, type AnalyzableContent } from "@/lib/contentAnalysis";

type ApiResponse = {
  generatedAt: string;
  from: string;
  to: string;
  days: number;
  es: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  pt: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  ads: AdsBreakdownType;
  posts: ContentItem[];
  youtube: YoutubeChannelSnapshot;
  previousPeriod: {
    from: string;
    to: string;
    es: { instagram: PeriodSummary; facebook: PeriodSummary };
    pt: { instagram: PeriodSummary; facebook: PeriodSummary };
    ads: AdsBreakdownType;
    youtube: YoutubePeriodSummary;
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

type YoutubeEvolutionMetric = "subscribers" | "views" | "interactions" | "watchTime";
const YOUTUBE_EVOLUTION_METRICS: { key: YoutubeEvolutionMetric; label: string }[] = [
  { key: "subscribers", label: "Suscriptores" },
  { key: "views", label: "Visualizaciones" },
  { key: "interactions", label: "Interacciones" },
  { key: "watchTime", label: "Tiempo de visualización" },
];

const WEEKDAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DAYPARTS = [
  { label: "00–06h", start: 0, end: 6 },
  { label: "06–12h", start: 6, end: 12 },
  { label: "12–15h", start: 12, end: 15 },
  { label: "15–19h", start: 15, end: 19 },
  { label: "19–24h", start: 19, end: 24 },
];

// A bucket only counts as real signal with at least this many publications
// behind it — kept in sync with YoutubeBestTimes' own threshold so the
// insight banner never claims a pattern the section itself won't show.
const MIN_COUNT_PER_BUCKET = 2;

function computeDayStats(videos: YoutubeVideoItem[]): RankedStat[] {
  const buckets = WEEKDAY_FULL.map((label) => ({ label, sum: 0, count: 0 }));
  videos.forEach((v) => {
    if (!v.date) return;
    const idx = (new Date(v.date).getDay() + 6) % 7;
    buckets[idx].sum += v.interactions;
    buckets[idx].count += 1;
  });
  return buckets.map((b) => ({ label: b.label, avg: b.count > 0 ? b.sum / b.count : 0, count: b.count }));
}

function computeHourStats(videos: YoutubeVideoItem[]): RankedStat[] {
  const buckets = DAYPARTS.map((d) => ({ ...d, sum: 0, count: 0 }));
  videos.forEach((v) => {
    if (!v.date || v.date.length < 13) return;
    const hour = parseInt(v.date.slice(11, 13), 10);
    if (Number.isNaN(hour)) return;
    const bucket = buckets.find((b) => hour >= b.start && hour < b.end);
    if (bucket) {
      bucket.sum += v.interactions;
      bucket.count += 1;
    }
  });
  return buckets.map((b) => ({ label: b.label, avg: b.count > 0 ? b.sum / b.count : 0, count: b.count }));
}

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

function buildYoutubeCsv(data: ApiResponse): string {
  const yt = data.youtube;
  const interactions = yt.likes + yt.comments + yt.shares;
  const rows: string[][] = [
    ["Métrica", "Valor"],
    ["Suscriptores", yt.subscribers !== null ? String(yt.subscribers) : "no disponible"],
    ["Suscriptores ganados (periodo)", yt.subscribersDelta !== null ? String(yt.subscribersDelta) : "no disponible"],
    ["Visualizaciones", String(yt.views)],
    ["Tiempo de visualización (min)", yt.watchMinutes.toFixed(1)],
    ["Likes", String(yt.likes)],
    ["Comentarios", String(yt.comments)],
    ["Shares", String(yt.shares)],
    ["Interacciones (likes+comentarios+shares)", String(interactions)],
    ["Publicaciones", String(yt.videosPublished)],
    ["Shorts publicados", String(yt.shortsPublished)],
    ["Vídeos publicados", String(yt.longFormPublished)],
    [],
    ["Top Contenidos"],
    ["Título", "Formato", "Fecha", "Visualizaciones", "Likes", "Comentarios", "Tiempo de visualización (min)", "Engagement (%)", "URL"],
    ...[...yt.videos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 20)
      .map((v) => [
        v.title.replace(/;/g, ","),
        v.format === "short" ? "Short" : "Vídeo",
        v.date ? v.date.slice(0, 10) : "",
        String(v.views),
        String(v.likes),
        String(v.comments),
        v.watchMinutes.toFixed(1),
        v.engagementRate !== null ? v.engagementRate.toFixed(1) : "no disponible",
        v.url,
      ]),
  ];
  return rows.map((r) => r.join(";")).join("\n");
}

type InsightCandidate = { text: string; weight: number };

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Surfaces only positive, notable signals from the period — growth, records,
// standout formats — each with the comparison behind it so the number isn't
// just asserted. Weak or declining metrics are simply not candidates here.
function buildInsightCandidates(data: ApiResponse, platform: "instagram" | "facebook"): InsightCandidate[] {
  const platformLabel = platform === "instagram" ? "Instagram" : "Facebook";
  const candidates: InsightCandidate[] = [];

  const countries: { label: string; current: NetworkSnapshot; previous: PeriodSummary }[] = [
    { label: "España", current: data.es[platform], previous: data.previousPeriod.es[platform] },
    { label: "Portugal", current: data.pt[platform], previous: data.previousPeriod.pt[platform] },
  ];

  // Follower momentum: only when this period's gain clearly beats the previous one.
  for (const c of countries) {
    if (c.current.followersDelta <= 0) continue;
    const change = pctChange(c.current.followersDelta, c.previous.followersGained);
    if (change >= 15) {
      candidates.push({
        text: `${c.label} aceleró su captación de seguidores en ${platformLabel}: +${change.toFixed(
          0
        )}% respecto al periodo anterior (${formatNumber(c.current.followersDelta)} vs +${formatNumber(c.previous.followersGained)}).`,
        weight: change,
      });
    }
  }

  // Reach momentum: only genuine growth.
  for (const c of countries) {
    const change = pctChange(c.current.reach, c.previous.reach);
    if (change >= 20) {
      candidates.push({
        text: `El alcance de ${c.label} en ${platformLabel} subió un ${change.toFixed(0)}% frente al periodo anterior (${formatNumber(
          c.current.reach
        )} vs ${formatNumber(c.previous.reach)}).`,
        weight: change * 0.9,
      });
    }
  }

  // Interaction momentum: only genuine growth.
  for (const c of countries) {
    const change = pctChange(c.current.interactions, c.previous.interactions);
    if (change >= 20) {
      candidates.push({
        text: `Las interacciones de ${c.label} en ${platformLabel} crecieron un ${change.toFixed(0)}% respecto al periodo anterior (${formatNumber(
          c.current.interactions
        )} vs ${formatNumber(c.previous.interactions)}).`,
        weight: change * 0.85,
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
      });
    }
  }

  // Standout post — the top performer of the period, when it clearly leads the pack.
  if (platformPosts.length >= 4) {
    const mean = platformPosts.reduce((a, p) => a + (p.engagementRate as number), 0) / platformPosts.length;
    const best = platformPosts.reduce((a, p) => ((p.engagementRate as number) > (a.engagementRate as number) ? p : a));
    if (mean > 0 && (best.engagementRate as number) > mean * 1.8) {
      candidates.push({
        text: `Una publicación de tipo ${best.type} en ${best.country === "es" ? "España" : "Portugal"} destacó con ${(best.engagementRate as number).toFixed(
          1
        )}% de interacción, muy por encima de la media del periodo (${mean.toFixed(1)}%).`,
        weight: (((best.engagementRate as number) - mean) / mean) * 40,
      });
    }
  }

  // Meta Ads efficiency trend (account-wide, since the ad account is shared) — only when it improved.
  const cpcChange = pctChange(data.ads.total.cpc, data.previousPeriod.ads.total.cpc);
  if (data.ads.total.clicks > 0 && data.previousPeriod.ads.total.clicks > 0 && cpcChange <= -12) {
    candidates.push({
      text: `El coste por clic en Meta Ads bajó un ${Math.abs(cpcChange).toFixed(0)}% respecto al periodo anterior (${data.ads.total.cpc.toFixed(
        2
      )}€ vs ${data.previousPeriod.ads.total.cpc.toFixed(2)}€).`,
      weight: Math.abs(cpcChange) * 0.8,
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
      });
    }
  }

  return candidates;
}

// YouTube equivalent of buildInsightCandidates, built on YouTube's own KPIs.
// Unlike the IG/FB engine (positive signals only), growth-tier candidates
// here are bidirectional — "is consumption up or down" is one of the
// questions this section must answer in the first few seconds, and a 30%
// drop is exactly the kind of thing marketing needs to see, not just wins.
//
// Weights carry a large per-category offset so the five categories sort in
// priority order (growth → content → format → theme → patterns) by default;
// the offsets are far enough apart that only a genuinely dramatic signal in
// a lower category can outrank a weaker one in a higher category.
const YT_TIER = { growth: 1000, content: 800, format: 600, theme: 400, pattern: 200 };

function buildYoutubeInsightCandidates(data: ApiResponse, analyzable: AnalyzableContent[], dayStats: RankedStat[]): InsightCandidate[] {
  const yt = data.youtube;
  const prev = data.previousPeriod.youtube;
  const candidates: InsightCandidate[] = [];

  // 1. Growth — subscribers, views, watch time.
  if (yt.subscribersDelta !== null && prev.subscribersGained !== null && yt.subscribersDelta > 0) {
    const change = pctChange(yt.subscribersDelta, prev.subscribersGained);
    if (change >= 15) {
      candidates.push({
        text: `El canal ganó ${formatNumber(yt.subscribersDelta)} suscriptores este periodo, un ${change.toFixed(
          0
        )}% más que en el periodo anterior (${formatNumber(prev.subscribersGained)}).`,
        weight: YT_TIER.growth + change,
      });
    }
  }

  const viewsChange = pctChange(yt.views, prev.views);
  if (yt.views > 0 && prev.views > 0 && Math.abs(viewsChange) >= 15) {
    candidates.push({
      text: `El canal generó ${formatNumber(yt.views)} visualizaciones durante los últimos ${data.days} días, un ${Math.abs(viewsChange).toFixed(
        0
      )}% ${viewsChange >= 0 ? "más" : "menos"} que en el periodo anterior.`,
      weight: YT_TIER.growth + Math.abs(viewsChange) * 0.9,
    });
  }

  const watchChange = pctChange(yt.watchMinutes, prev.watchMinutes);
  if (yt.watchMinutes > 0 && prev.watchMinutes > 0 && Math.abs(watchChange) >= 20) {
    candidates.push({
      text: `El tiempo de visualización ${watchChange >= 0 ? "creció" : "cayó"} un ${Math.abs(watchChange).toFixed(
        0
      )}% respecto al periodo anterior.`,
      weight: YT_TIER.growth + Math.abs(watchChange) * 0.7,
    });
  }

  // 2. Content — the top performer(s) of the period.
  const withViews = yt.videos.filter((v) => v.views > 0);
  if (withViews.length >= 2) {
    const byViews = [...withViews].sort((a, b) => b.views - a.views);
    const topViews = byViews[0];
    const runnerUpViews = byViews[1];
    const withEngagement = yt.videos.filter((v) => v.engagementRate !== null);
    const topEngagement = withEngagement.length > 0 ? withEngagement.reduce((a, v) => ((v.engagementRate as number) > (a.engagementRate as number) ? v : a)) : null;

    const sameVideo = topEngagement && topEngagement.id === topViews.id;
    const viewsLeadPct = runnerUpViews.views > 0 ? ((topViews.views - runnerUpViews.views) / runnerUpViews.views) * 100 : 100;

    candidates.push({
      text:
        `"${topViews.title}" fue el vídeo más visto del periodo con ${formatNumber(topViews.views)} visualizaciones` +
        (sameVideo && topEngagement
          ? ` y además obtuvo el mayor engagement, con un ${(topEngagement.engagementRate as number).toFixed(1)}%.`
          : "."),
      weight: YT_TIER.content + 50 + Math.min(200, viewsLeadPct),
    });

    if (!sameVideo && topEngagement && withEngagement.length >= 3) {
      const mean = withEngagement.reduce((a, v) => a + (v.engagementRate as number), 0) / withEngagement.length;
      if (mean > 0 && (topEngagement.engagementRate as number) > mean * 1.5) {
        candidates.push({
          text: `"${topEngagement.title}" (${topEngagement.format === "short" ? "Short" : "Vídeo"}) tuvo el mayor engagement del periodo, con un ${(
            topEngagement.engagementRate as number
          ).toFixed(1)}%, frente al ${mean.toFixed(1)}% de media.`,
          weight: YT_TIER.content + (((topEngagement.engagementRate as number) - mean) / mean) * 30,
        });
      }
    }
  }

  // 3. Format — Shorts vs. long-form, normalized per publication.
  const shorts = yt.videos.filter((v) => v.format === "short");
  const longForm = yt.videos.filter((v) => v.format === "video");
  if (shorts.length >= 2 && longForm.length >= 2) {
    const shortsViews = shorts.reduce((a, v) => a + v.views, 0) / shorts.length;
    const longViews = longForm.reduce((a, v) => a + v.views, 0) / longForm.length;
    const ratio = longViews > 0 ? shortsViews / longViews : 0;
    const hedge = shorts.length >= 3 && longForm.length >= 3 ? "" : ", aunque la muestra todavía es limitada";
    if (ratio >= 1.4) {
      candidates.push({
        text: `Los Shorts generan ${ratio.toFixed(1)}× más visualizaciones por publicación que los vídeos tradicionales este periodo${hedge}.`,
        weight: YT_TIER.format + ratio * 10,
      });
    } else if (ratio > 0 && ratio <= 0.72) {
      candidates.push({
        text: `Los vídeos tradicionales generan ${(1 / ratio).toFixed(1)}× más visualizaciones por publicación que los Shorts este periodo${hedge}.`,
        weight: YT_TIER.format + (1 / ratio) * 10,
      });
    }

    const shortsEng = shorts.map((v) => v.engagementRate).filter((v): v is number => v !== null);
    const longEng = longForm.map((v) => v.engagementRate).filter((v): v is number => v !== null);
    if (shortsEng.length > 0 && longEng.length > 0) {
      const shortsAvg = shortsEng.reduce((a, b) => a + b, 0) / shortsEng.length;
      const longAvg = longEng.reduce((a, b) => a + b, 0) / longEng.length;
      if (longAvg > shortsAvg * 1.2) {
        candidates.push({
          text: `Los vídeos largos concentraron mayor engagement medio que los Shorts este periodo (${longAvg.toFixed(1)}% vs ${shortsAvg.toFixed(
            1
          )}%)${hedge}.`,
          weight: YT_TIER.format + ((longAvg - shortsAvg) / shortsAvg) * 20,
        });
      } else if (shortsAvg > longAvg * 1.2) {
        candidates.push({
          text: `Los Shorts concentraron mayor engagement medio que los vídeos largos este periodo (${shortsAvg.toFixed(1)}% vs ${longAvg.toFixed(
            1
          )}%)${hedge}.`,
          weight: YT_TIER.format + ((shortsAvg - longAvg) / longAvg) * 20,
        });
      }
    }
  }

  // 4. Theme — reuses the same producto/técnica engine as Instagram/Facebook.
  const analysis = analyzeContent(analyzable);
  const topGroup = analysis.standouts[0] ?? analysis.mostMentioned;
  if (topGroup) {
    const subject = topGroup.kind === "técnica" ? topGroup.name : `"${topGroup.name}"`;
    const isStandout = analysis.standouts.length > 0;
    candidates.push({
      text: isStandout
        ? `Los contenidos relacionados con ${subject} obtuvieron un ${topGroup.avgEngagement.toFixed(
            1
          )}% de engagement medio, por encima del ${analysis.periodMeanEngagement.toFixed(1)}% del canal.`
        : `${subject} es el tema con más presencia este periodo (${topGroup.count} vídeos), aunque sin destacar aún claramente en engagement.`,
      weight: YT_TIER.theme + (isStandout ? (topGroup.avgEngagement / Math.max(0.1, analysis.periodMeanEngagement)) * 20 : 5),
    });
  }

  // 5. Patterns — best day of the week, normalized per publication.
  const qualifyingDays = dayStats.filter((d) => d.count >= MIN_COUNT_PER_BUCKET);
  if (qualifyingDays.length >= 2) {
    const sorted = [...qualifyingDays].sort((a, b) => b.avg - a.avg);
    const leader = sorted[0];
    const runnerUp = sorted[1];
    if (runnerUp.avg > 0) {
      const gapPct = ((leader.avg - runnerUp.avg) / runnerUp.avg) * 100;
      if (gapPct >= 15) {
        candidates.push({
          text: `El ${leader.label.toLowerCase()} presenta el mejor rendimiento medio por publicación del periodo, un ${gapPct.toFixed(
            0
          )}% por encima del resto de días.`,
          weight: YT_TIER.pattern + gapPct * 0.5,
        });
      }
    }
  }

  return candidates;
}

// Ranks candidates by how much they actually stand out this period and keeps
// the top ones — every candidate here is already a positive signal, so this
// is a pure "what mattered most" ranking, not a balance of good vs. bad news.
function selectInsights(candidates: InsightCandidate[], max = 5): string[] {
  return [...candidates]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max)
    .map((c) => c.text);
}

export default function Page() {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "youtube">("instagram");
  const [days, setDays] = useState(30);
  const [evolutionMetric, setEvolutionMetric] = useState<EvolutionMetric>("followers");
  const [youtubeEvolutionMetric, setYoutubeEvolutionMetric] = useState<YoutubeEvolutionMetric>("subscribers");
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
    const csv = platform === "youtube" ? buildYoutubeCsv(data) : buildCsv(data, platform, reachLabel);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shimano-iberia-${platform}-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const youtubeAnalyzable: AnalyzableContent[] = useMemo(() => {
    if (!data) return [];
    return data.youtube.videos.map((v) => ({
      id: v.id,
      content: `${v.title} ${v.description}`,
      engagementRate: v.engagementRate,
      interactions: v.interactions,
    }));
  }, [data]);

  const youtubeDayStats = useMemo(() => (data ? computeDayStats(data.youtube.videos) : []), [data]);
  const youtubeHourStats = useMemo(() => (data ? computeHourStats(data.youtube.videos) : []), [data]);

  const insights = useMemo(() => {
    if (!data) return [];
    if (platform === "youtube") return selectInsights(buildYoutubeInsightCandidates(data, youtubeAnalyzable, youtubeDayStats));
    return selectInsights(buildInsightCandidates(data, platform));
  }, [data, platform, youtubeAnalyzable, youtubeDayStats]);

  const weekdayData = useMemo(() => {
    if (!data || platform === "youtube") return { es: new Array(7).fill(0), pt: new Array(7).fill(0) };
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
    if (!data || platform === "youtube") return { types: [] as string[], es: [] as number[], pt: [] as number[] };
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

  const combinedFollowers = data && platform !== "youtube" ? data.es[platform].followers + data.pt[platform].followers : null;
  const combinedReach = data && platform !== "youtube" ? data.es[platform].reach + data.pt[platform].reach : null;
  const combinedInteractions = data && platform !== "youtube" ? data.es[platform].interactions + data.pt[platform].interactions : null;

  const platformPosts = data && platform !== "youtube" ? data.posts.filter((p) => p.network === platform) : [];

  function dailySeriesFromVideos(videos: ApiResponse["youtube"]["videos"], pick: (v: ApiResponse["youtube"]["videos"][number]) => number): SeriesPoint[] {
    const map = new Map<string, number>();
    videos.forEach((v) => {
      if (!v.date) return;
      const day = v.date.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + pick(v));
    });
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const youtubeDailyInteractions = useMemo(() => (data ? dailySeriesFromVideos(data.youtube.videos, (v) => v.interactions) : []), [data]);
  const youtubeDailyWatchMinutes = useMemo(() => (data ? dailySeriesFromVideos(data.youtube.videos, (v) => v.watchMinutes) : []), [data]);

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
          {(["instagram", "facebook", "youtube"] as const).map((p) => (
            <button key={p} onClick={() => setPlatform(p)} style={tabStyle(platform === p, p === "youtube" ? "--brand-youtube" : "--series-es")}>
              {p === "instagram" ? "Instagram" : p === "facebook" ? "Facebook" : "YouTube"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)} style={tabStyle(days === d, platform === "youtube" ? "--series-yt" : "--series-es")}>
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

      {data && platform !== "youtube" && (
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
            <SectionLabel>Producto y técnica</SectionLabel>
            <ContentIntelligence items={data.posts} />
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
              <FollowersChart esSeries={data.es[platform].followersSeries} ptSeries={data.pt[platform].followersSeries} />
            )}
            {evolutionMetric === "reach" && (
              <AreaChart
                title={`${reachLabel} diario`}
                subtitle={
                  platform === "instagram"
                    ? "Cuentas únicas que vieron el contenido cada día — indica cuánta gente nueva o recurrente está viendo lo que publica cada país."
                    : "Visualizaciones diarias del contenido — indica cuánta gente está viendo lo que publica cada país cada día."
                }
                esSeries={data.es[platform].reachSeries}
                ptSeries={data.pt[platform].reachSeries}
              />
            )}
            {evolutionMetric === "interactions" && (
              <AreaChart
                title="Interacciones diarias"
                subtitle="Likes, comentarios y compartidos sumados cada día — cuanto más alto, más está reaccionando la audiencia al contenido publicado ese día."
                esSeries={data.es[platform].interactionsSeries}
                ptSeries={data.pt[platform].interactionsSeries}
              />
            )}
            {evolutionMetric === "engagement" && (
              <TrendChart
                title="Evolución de la tasa de interacción"
                subtitle="Interacciones respecto al alcance de cada día (%) — mide si el contenido conecta con quien lo ve, más allá de a cuánta gente llega."
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

      {data && platform === "youtube" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <InsightBanner insights={insights} periodLabel={formatPeriodRange(data.from, data.to, data.days)} />

          <div>
            <SectionLabel>YouTube · Shimano Iberia</SectionLabel>
            <YoutubeTopCards
              subscribers={data.youtube.subscribers}
              subscribersDelta={data.youtube.subscribersDelta}
              subscribersGainedPrev={data.previousPeriod.youtube.subscribersGained}
              subscribersSince={data.youtube.subscribersSince}
              views={data.youtube.views}
              viewsPrev={data.previousPeriod.youtube.views}
              watchMinutes={data.youtube.watchMinutes}
              interactions={data.youtube.likes + data.youtube.comments + data.youtube.shares}
              interactionsPrev={data.previousPeriod.youtube.likes + data.previousPeriod.youtube.comments + data.previousPeriod.youtube.shares}
            />
          </div>

          <div>
            <SectionLabel>Contenido</SectionLabel>
            <YoutubeTopContent items={data.youtube.videos} />
          </div>

          <div>
            <SectionLabel>Formato</SectionLabel>
            <YoutubeFormatComparison videos={data.youtube.videos} />
          </div>

          <div>
            <SectionLabel>Producto y técnica</SectionLabel>
            <ContentIntelligence items={youtubeAnalyzable} />
          </div>

          <div>
            <SectionLabel>Evolución diaria</SectionLabel>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {YOUTUBE_EVOLUTION_METRICS.map((m) => (
                <button key={m.key} onClick={() => setYoutubeEvolutionMetric(m.key)} style={tabStyle(youtubeEvolutionMetric === m.key, "--series-yt")}>
                  {m.label}
                </button>
              ))}
            </div>
            {youtubeEvolutionMetric === "subscribers" && (
              <AreaChart
                title="Suscriptores"
                infoTip={
                  data.youtube.subscribersSince
                    ? `Histórico diario disponible desde el ${new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long" }).format(
                        new Date(data.youtube.subscribersSince)
                      )}.`
                    : "Todavía no hay suficiente histórico diario de suscriptores."
                }
                esSeries={data.youtube.subscribersSeries}
                esLabel="Suscriptores"
                esColorVar="--series-yt"
              />
            )}
            {youtubeEvolutionMetric === "views" && (
              <AreaChart
                title="Visualizaciones"
                infoTip="Visualizaciones diarias de todo el canal, no solo de los vídeos publicados en el periodo."
                esSeries={data.youtube.viewsSeries}
                esLabel="Visualizaciones"
                esColorVar="--series-yt"
              />
            )}
            {youtubeEvolutionMetric === "interactions" && (
              <AreaChart
                title="Interacciones por fecha de publicación"
                infoTip="Likes, comentarios y compartidos acumulados hasta hoy, agrupados por el día de publicación de cada vídeo."
                esSeries={youtubeDailyInteractions}
                esLabel="Interacciones"
                esColorVar="--series-yt"
              />
            )}
            {youtubeEvolutionMetric === "watchTime" && (
              <AreaChart
                title="Tiempo de visualización por fecha de publicación"
                infoTip="Minutos vistos acumulados hasta hoy, agrupados por el día de publicación de cada vídeo."
                esSeries={youtubeDailyWatchMinutes}
                esLabel="Minutos"
                esColorVar="--series-yt"
              />
            )}
          </div>

          <YoutubeBestTimes dayStats={youtubeDayStats} hourStats={youtubeHourStats} totalVideos={data.youtube.videos.length} />
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

function tabStyle(active: boolean, accentVar: string = "--series-es"): CSSProperties {
  return {
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: active ? `var(${accentVar})` : "var(--surface-1)",
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
