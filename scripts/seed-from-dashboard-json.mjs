// Carga en Neon un JSON del dashboard (respuesta de /api/metrics) para rellenar el histórico
// sin pasar por Metricool. Uso: node --env-file=.env.local scripts/seed-from-dashboard-json.mjs ruta.json
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const file = process.argv[2];
if (!file) throw new Error("Falta la ruta del JSON");
const d = JSON.parse(readFileSync(file, "utf-8"));
const sql = neon(process.env.DATABASE_URL);

const series = [];
const push = (country, source, metric, pts) => {
  for (const p of pts || []) if (p.value != null) series.push([country, source, metric, p.date.slice(0, 10), p.value]);
};
for (const c of ["es", "pt"]) {
  for (const n of ["instagram", "facebook"]) {
    push(c, n, "followers", d[c][n].followersSeries);
    push(c, n, "reach", d[c][n].reachSeries);
    push(c, n, "interactions", d[c][n].interactionsSeries);
  }
}
push("all", "ads", "spend", d.ads.spendSeries);
push("all", "ads", "impressions", d.ads.impressionsSeries);
push("all", "ads", "clicks", d.ads.clicksSeries);
push("all", "youtube", "subscribers", d.youtube.subscribersSeries);
push("all", "youtube", "views", d.youtube.viewsSeries);

const CH = 2000;
for (let i = 0; i < series.length; i += CH) {
  const part = series.slice(i, i + CH);
  await sql.query(
    `INSERT INTO series_daily (country, source, metric, day, value)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::date[], $5::float8[])
     ON CONFLICT (country, source, metric, day) DO UPDATE SET value = EXCLUDED.value, captured_at = now()`,
    [part.map((r) => r[0]), part.map((r) => r[1]), part.map((r) => r[2]), part.map((r) => r[3]), part.map((r) => r[4])]
  );
}

const content = [];
for (const p of d.posts) {
  content.push({
    id: `${p.network}:${p.country}:${p.id}`, source: p.network, country: p.country, published_at: p.date, type: p.type,
    reach: p.reach, views: p.views, interactions: p.interactions, engagement_rate: p.engagementRate, content: p.content,
    url: p.url, image: p.image, extra: null,
  });
}
for (const v of d.youtube.videos || []) {
  content.push({
    id: `youtube:all:${v.id}`, source: "youtube", country: "all", published_at: v.date, type: v.format,
    reach: null, views: v.views, interactions: v.interactions, engagement_rate: v.engagementRate, content: v.title,
    url: v.url, image: v.thumbnail,
    extra: { likes: v.likes, comments: v.comments, shares: v.shares, watchMinutes: v.watchMinutes, averageViewDuration: v.averageViewDuration, durationSeconds: v.durationSeconds },
  });
}
const rnd = (x) => (x == null ? null : Math.round(x));
for (let i = 0; i < content.length; i += 300) {
  const part = content.slice(i, i + 300);
  await sql.query(
    `INSERT INTO content_items (id, source, country, published_at, type, reach, views, interactions, engagement_rate, content, url, image, extra)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[], $5::text[], $6::int[], $7::int[], $8::int[], $9::float8[], $10::text[], $11::text[], $12::text[], $13::jsonb[])
     ON CONFLICT (id) DO UPDATE SET reach = EXCLUDED.reach, views = EXCLUDED.views, interactions = EXCLUDED.interactions,
       engagement_rate = EXCLUDED.engagement_rate, content = EXCLUDED.content, image = EXCLUDED.image, extra = EXCLUDED.extra, updated_at = now()`,
    [
      part.map((r) => r.id), part.map((r) => r.source), part.map((r) => r.country), part.map((r) => r.published_at), part.map((r) => r.type),
      part.map((r) => rnd(r.reach)), part.map((r) => rnd(r.views)), part.map((r) => rnd(r.interactions)), part.map((r) => r.engagement_rate),
      part.map((r) => r.content), part.map((r) => r.url), part.map((r) => r.image), part.map((r) => (r.extra ? JSON.stringify(r.extra) : null)),
    ]
  );
}
await sql.query(`INSERT INTO ingest_log (kind, range_from, range_to, rows_series, rows_content, note) VALUES ('seed', $1, $2, $3, $4, $5)`, [
  d.from.slice(0, 10), d.to.slice(0, 10), series.length, content.length, "Carga inicial desde dashboard_2026-10-26.json",
]);
console.log(`OK: ${series.length} filas de series y ${content.length} piezas`);
