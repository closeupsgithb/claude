import {
  BRAND_ID,
  fetchAdsBreakdown,
  fetchNetworkSnapshot,
  fetchTopPosts,
  fetchYoutubeChannelSnapshot,
  type CountryKey,
  type NetworkKey,
  type SeriesPoint,
} from "@/lib/metricool";
import type { Sql } from "@/lib/db";

export type SeriesRow = { country: string; source: string; metric: string; day: string; value: number };
export type ContentRow = {
  id: string;
  source: string;
  country: string;
  published_at: string;
  type: string | null;
  reach: number | null;
  views: number | null;
  interactions: number | null;
  engagement_rate: number | null;
  content: string | null;
  url: string | null;
  image: string | null;
  extra: Record<string, unknown> | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function pushSeries(rows: SeriesRow[], country: string, source: string, metric: string, pts: SeriesPoint[]) {
  for (const p of pts) {
    if (p.value == null || Number.isNaN(p.value)) continue;
    rows.push({ country, source, metric, day: p.date.slice(0, 10), value: p.value });
  }
}

/** Descarga de Metricool una ventana (máx. ~90 días) y la convierte en filas para la base de datos. */
export async function collectWindow(from: Date, to: Date) {
  const f = iso(from);
  const t = iso(to);
  const series: SeriesRow[] = [];
  const content: ContentRow[] = [];

  const accounts: Array<[CountryKey, NetworkKey]> = [
    ["es", "instagram"],
    ["es", "facebook"],
    ["pt", "instagram"],
    ["pt", "facebook"],
  ];

  const [snaps, ads, esPosts, ptPosts, yt] = await Promise.all([
    Promise.all(accounts.map(([c, n]) => fetchNetworkSnapshot(n, BRAND_ID[c], f, t))),
    fetchAdsBreakdown(f, t),
    fetchTopPosts("es", f, t),
    fetchTopPosts("pt", f, t),
    fetchYoutubeChannelSnapshot(f, t),
  ]);

  accounts.forEach(([c, n], i) => {
    pushSeries(series, c, n, "followers", snaps[i].followersSeries);
    pushSeries(series, c, n, "reach", snaps[i].reachSeries);
    pushSeries(series, c, n, "interactions", snaps[i].interactionsSeries);
  });
  pushSeries(series, "all", "ads", "spend", ads.spendSeries);
  pushSeries(series, "all", "ads", "impressions", ads.impressionsSeries);
  pushSeries(series, "all", "ads", "clicks", ads.clicksSeries);
  pushSeries(series, "all", "youtube", "subscribers", yt.subscribersSeries);
  pushSeries(series, "all", "youtube", "views", yt.viewsSeries);

  for (const p of [...esPosts, ...ptPosts]) {
    content.push({
      id: `${p.network}:${p.country}:${p.id}`,
      source: p.network,
      country: p.country,
      published_at: p.date,
      type: p.type,
      reach: p.reach,
      views: p.views,
      interactions: p.interactions,
      engagement_rate: p.engagementRate,
      content: p.content,
      url: p.url,
      image: p.image,
      extra: null,
    });
  }
  for (const v of yt.videos) {
    content.push({
      id: `youtube:all:${v.id}`,
      source: "youtube",
      country: "all",
      published_at: v.date,
      type: v.format,
      reach: null,
      views: v.views,
      interactions: v.interactions,
      engagement_rate: v.engagementRate,
      content: v.title,
      url: v.url,
      image: v.thumbnail,
      extra: {
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        watchMinutes: v.watchMinutes,
        averageViewDuration: v.averageViewDuration,
        durationSeconds: v.durationSeconds,
      },
    });
  }
  return { series, content };
}

/** Guarda sin duplicar: si la fila ya existe, se actualiza con el dato más reciente. */
export async function storeRows(sql: Sql, series: SeriesRow[], content: ContentRow[]) {
  const CH = 2000;
  for (let i = 0; i < series.length; i += CH) {
    const part = series.slice(i, i + CH);
    await sql.query(
      `INSERT INTO series_daily (country, source, metric, day, value)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::date[], $5::float8[])
       ON CONFLICT (country, source, metric, day)
       DO UPDATE SET value = EXCLUDED.value, captured_at = now()`,
      [part.map((r) => r.country), part.map((r) => r.source), part.map((r) => r.metric), part.map((r) => r.day), part.map((r) => r.value)]
    );
  }
  for (let i = 0; i < content.length; i += 300) {
    const part = content.slice(i, i + 300);
    await sql.query(
      `INSERT INTO content_items (id, source, country, published_at, type, reach, views, interactions, engagement_rate, content, url, image, extra)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[], $5::text[], $6::int[], $7::int[], $8::int[], $9::float8[], $10::text[], $11::text[], $12::text[], $13::jsonb[])
       ON CONFLICT (id)
       DO UPDATE SET reach = EXCLUDED.reach, views = EXCLUDED.views, interactions = EXCLUDED.interactions,
                     engagement_rate = EXCLUDED.engagement_rate, content = EXCLUDED.content, image = EXCLUDED.image,
                     extra = EXCLUDED.extra, updated_at = now()`,
      [
        part.map((r) => r.id),
        part.map((r) => r.source),
        part.map((r) => r.country),
        part.map((r) => r.published_at),
        part.map((r) => r.type),
        part.map((r) => (r.reach == null ? null : Math.round(r.reach))),
        part.map((r) => (r.views == null ? null : Math.round(r.views))),
        part.map((r) => (r.interactions == null ? null : Math.round(r.interactions))),
        part.map((r) => r.engagement_rate),
        part.map((r) => r.content),
        part.map((r) => r.url),
        part.map((r) => r.image),
        part.map((r) => (r.extra ? JSON.stringify(r.extra) : null)),
      ]
    );
  }
}

/** Ingesta un rango largo troceándolo en ventanas de 80 días (Metricool limita cada petición). */
export async function ingestRange(sql: Sql, from: Date, to: Date, kind: string) {
  const WIN = 80 * DAY_MS;
  let cursor = from.getTime();
  let totalSeries = 0;
  let totalContent = 0;
  while (cursor < to.getTime()) {
    const end = Math.min(cursor + WIN, to.getTime());
    const { series, content } = await collectWindow(new Date(cursor), new Date(end));
    await storeRows(sql, series, content);
    totalSeries += series.length;
    totalContent += content.length;
    cursor = end;
  }
  await sql.query(
    `INSERT INTO ingest_log (kind, range_from, range_to, rows_series, rows_content) VALUES ($1, $2, $3, $4, $5)`,
    [kind, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10), totalSeries, totalContent]
  );
  return { rowsSeries: totalSeries, rowsContent: totalContent };
}
