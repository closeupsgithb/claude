import type { Sql } from "@/lib/db";

/* ──────────────────────────────────────────────────────────────────────────
   Datos del informe. Todo sale del histórico guardado en Neon (series_daily y
   content_items), de modo que el informe de cualquier mes o trimestre se puede
   generar aunque Metricool/el dashboard solo muestren 90 días.
   ────────────────────────────────────────────────────────────────────────── */

export type PeriodKind = "mes" | "trimestre";

export type Period = {
  kind: PeriodKind;
  id: string; // 2026-10 | 2026-Q3
  label: string; // Octubre 2026 | 3.er trimestre 2026
  prevLabel: string; // Septiembre | 2.º trimestre
  a: string; // inicio (AAAA-MM-DD)
  b: string; // fin efectivo (último día con datos dentro del periodo)
  ap: string; // inicio del periodo anterior
  bp: string; // fin del periodo anterior (mismos días)
  enCurso: boolean;
  nDias: number;
};

export type Net = "instagram" | "facebook";
export type Country = "es" | "pt";

export type Piece = {
  id: string;
  source: string;
  country: string;
  date: string;
  type: string;
  reach: number | null;
  views: number | null;
  interactions: number;
  content: string;
  url: string | null;
  image: string | null;
  extra: Record<string, number | null> | null;
};

export type AccountMetrics = {
  net: Net;
  country: Country;
  followersIni: number | null;
  followersFin: number | null;
  netos: number | null;
  netosPrev: number | null;
  alcanceTotal: number;
  interaccionesTotal: number;
  interaccionesTotalPrev: number;
  piezas: number;
  piezasPrev: number;
  alcanceMedianoPieza: number | null;
  alcanceMedianoPiezaPrev: number | null;
  tasa: number | null;
  tasaPrev: number | null;
  semanas: Array<{ inicio: string; fin: string; valor: number | null; actual: boolean }>;
  followersDaily: Array<{ day: string; value: number }>; // desde el inicio del periodo anterior
  followersAtPrevStart: number | null;
  followersAtStart: number | null;
};

export type Youtube = {
  subsFin: number | null;
  subsIni: number | null;
  netos: number | null;
  netosPrev: number | null;
  vistas: number;
  vistasPrev: number;
  vistasHasta: string | null;
  piezas: number;
  piezasPrev: number;
  cortos: { n: number; vistas: number; vistasPieza: number | null };
  largos: { n: number; vistas: number; vistasPieza: number | null };
  pctVistasCortos: number | null;
  pctTiempoCortos: number | null;
  semanas: Array<{ inicio: string; fin: string; valor: number | null; actual: boolean }>;
  subsDaily: Array<{ day: string; value: number }>;
  top: Piece[];
};

export type Ads = {
  inversion: number;
  inversionPrev: number;
  impresiones: number;
  impresionesPrev: number;
  clics: number;
  clicsPrev: number;
  ctr: number | null;
  ctrPrev: number | null;
  cpc: number | null;
  cpcPrev: number | null;
  spendDaily: Array<{ day: string; value: number }>;
};

export type ReportData = {
  period: Period;
  generatedAt: string;
  accounts: AccountMetrics[];
  youtube: Youtube;
  ads: Ads;
  top: Record<string, Piece[]>; // clave net:country
  hero: Piece | null;
  formatosIg: { reel: { n: number; tasa: number | null; alcance: number | null }; carrusel: { n: number; tasa: number | null; alcance: number | null } };
};

/* ───────────────────────── utilidades de fechas ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => ymd(new Date(parse(s).getTime() + n * 86400000));
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
const lastOfMonth = (y: number, m: number) => ymd(new Date(Date.UTC(y, m, 0)));

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function resolvePeriod(kind: PeriodKind, id: string, finDatos: string): Period {
  if (kind === "mes") {
    const [y, m] = id.split("-").map(Number);
    const a = `${y}-${pad(m)}-01`;
    const fullEnd = lastOfMonth(y, m);
    const b = fullEnd < finDatos ? fullEnd : finDatos;
    const n = daysBetween(a, b) + 1;
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const ap = `${py}-${pad(pm)}-01`;
    const pEnd = lastOfMonth(py, pm);
    const bpCand = addDays(ap, n - 1);
    const bp = bpCand < pEnd ? bpCand : pEnd;
    return { kind, id, label: `${MESES[m - 1]} ${y}`, prevLabel: MESES[pm - 1], a, b, ap, bp, enCurso: b < fullEnd, nDias: n };
  }
  const [ys, qs] = id.split("-Q");
  const y = Number(ys);
  const q = Number(qs);
  const startM = (q - 1) * 3 + 1;
  const a = `${y}-${pad(startM)}-01`;
  const fullEnd = lastOfMonth(y, startM + 2);
  const b = fullEnd < finDatos ? fullEnd : finDatos;
  const n = daysBetween(a, b) + 1;
  const py = q === 1 ? y - 1 : y;
  const pq = q === 1 ? 4 : q - 1;
  const pStartM = (pq - 1) * 3 + 1;
  const ap = `${py}-${pad(pStartM)}-01`;
  const pEnd = lastOfMonth(py, pStartM + 2);
  const bpCand = addDays(ap, n - 1);
  const bp = bpCand < pEnd ? bpCand : pEnd;
  return { kind, id, label: `${q}.º trimestre ${y}`, prevLabel: `${pq}.º trimestre${py !== y ? ` ${py}` : ""}`, a, b, ap, bp, enCurso: b < fullEnd, nDias: n };
}

/* ───────────────────────── carga desde Neon ───────────────────────── */

type SeriesMap = Map<string, Array<{ day: string; value: number }>>;

async function loadSeries(sql: Sql, from: string, to: string): Promise<SeriesMap> {
  const rows = (await sql.query(
    `SELECT country, source, metric, to_char(day, 'YYYY-MM-DD') AS day, value
       FROM series_daily WHERE day >= $1::date AND day <= $2::date ORDER BY day`,
    [from, to]
  )) as Array<{ country: string; source: string; metric: string; day: string; value: number }>;
  const m: SeriesMap = new Map();
  for (const r of rows) {
    const k = `${r.country}|${r.source}|${r.metric}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push({ day: r.day, value: Number(r.value) });
  }
  return m;
}

async function loadContent(sql: Sql, from: string, to: string): Promise<Piece[]> {
  const rows = (await sql.query(
    `SELECT id, source, country, to_char(published_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD"T"HH24:MI:SS') AS date,
            type, reach, views, interactions, content, url, image, extra
       FROM content_items
      WHERE published_at >= $1::date AND published_at < ($2::date + 1)
      ORDER BY published_at`,
    [from, to]
  )) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    source: String(r.source),
    country: String(r.country),
    date: String(r.date),
    type: String(r.type ?? ""),
    reach: r.reach == null ? null : Number(r.reach),
    views: r.views == null ? null : Number(r.views),
    interactions: Number(r.interactions ?? 0),
    content: String(r.content ?? ""),
    url: (r.url as string) ?? null,
    image: (r.image as string) ?? null,
    extra: (r.extra as Record<string, number | null>) ?? null,
  }));
}

export async function latestDay(sql: Sql): Promise<string | null> {
  const r = (await sql.query(
    `SELECT to_char(max(day), 'YYYY-MM-DD') AS d FROM series_daily WHERE source IN ('instagram','facebook') AND metric = 'followers'`
  )) as Array<{ d: string | null }>;
  return r[0]?.d ?? null;
}

/** Periodos con datos suficientes (para el selector del dashboard). */
export async function availablePeriods(sql: Sql): Promise<{ meses: string[]; trimestres: string[]; desde: string | null; hasta: string | null }> {
  const r = (await sql.query(
    `SELECT to_char(min(day), 'YYYY-MM-DD') AS d0, to_char(max(day), 'YYYY-MM-DD') AS d1 FROM series_daily WHERE source IN ('instagram','facebook') AND metric = 'followers'`
  )) as Array<{ d0: string | null; d1: string | null }>;
  const d0 = r[0]?.d0;
  const d1 = r[0]?.d1;
  if (!d0 || !d1) return { meses: [], trimestres: [], desde: null, hasta: null };
  const meses: string[] = [];
  const trimestres: string[] = [];
  // Un periodo es elegible si el periodo anterior empieza dentro del histórico (así la comparación es completa).
  const idx = (s: string) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1; // meses desde el año 0
  const startIdx = (s: string) => idx(s) + (Number(s.slice(8, 10)) > 1 ? 1 : 0); // primer mes que empieza completo
  const first = startIdx(d0);
  const last = idx(d1);
  for (let k = first + 1; k <= last; k++) meses.push(`${Math.floor(k / 12)}-${pad((k % 12) + 1)}`);
  for (let k = first + 3; k <= last; k++) {
    if (k % 12 % 3 !== 0) continue; // primer mes de trimestre
    trimestres.push(`${Math.floor(k / 12)}-Q${(k % 12) / 3 + 1}`);
  }
  return { meses: meses.reverse(), trimestres: trimestres.reverse(), desde: d0, hasta: d1 };
}

/* ───────────────────────── cálculos ───────────────────────── */

const inRange = (day: string, a: string, b: string) => day >= a && day <= b;
const sumRange = (s: Array<{ day: string; value: number }> | undefined, a: string, b: string) =>
  (s ?? []).filter((p) => inRange(p.day, a, b)).reduce((t, p) => t + p.value, 0);
const lastAtOrBefore = (s: Array<{ day: string; value: number }> | undefined, d: string) => {
  const f = (s ?? []).filter((p) => p.day <= d);
  return f.length ? f[f.length - 1].value : null;
};
const lastBefore = (s: Array<{ day: string; value: number }> | undefined, d: string) => {
  const f = (s ?? []).filter((p) => p.day < d);
  return f.length ? f[f.length - 1].value : null;
};
const firstFrom = (s: Array<{ day: string; value: number }> | undefined, d: string) => (s ?? []).find((p) => p.day >= d)?.value ?? null;
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const v = [...xs].sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

function netGain(s: Array<{ day: string; value: number }> | undefined, a: string, b: string) {
  const ini = lastBefore(s, a) ?? firstFrom(s, a);
  const fin = lastAtOrBefore(s, b);
  return { ini, fin, netos: ini != null && fin != null ? fin - ini : null };
}

function weeks(s: Array<{ day: string; value: number }> | undefined, b: string, n: number, aStart: string) {
  const out: Array<{ inicio: string; fin: string; valor: number | null; actual: boolean }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const f = addDays(b, -7 * i);
    const i0 = addDays(f, -7);
    const v1 = lastAtOrBefore(s, f);
    const v0 = lastAtOrBefore(s, i0);
    out.push({ inicio: addDays(i0, 1), fin: f, valor: v1 != null && v0 != null ? v1 - v0 : null, actual: f >= aStart });
  }
  return out;
}

function piecesStats(pieces: Piece[], net: Net, country: Country, a: string, b: string) {
  const ps = pieces.filter((p) => p.source === net && p.country === country && inRange(p.date.slice(0, 10), a, b));
  const withReach = ps.filter((p) => p.reach);
  const totReach = withReach.reduce((t, p) => t + (p.reach ?? 0), 0);
  const tasa = totReach ? (withReach.reduce((t, p) => t + p.interactions, 0) / totReach) * 100 : null;
  return { ps, count: ps.length, medianReach: median(withReach.map((p) => p.reach as number)), tasa };
}

export async function buildReport(sql: Sql, kind: PeriodKind, id: string): Promise<ReportData | { error: string }> {
  const fin = await latestDay(sql);
  if (!fin) return { error: "SIN_DATOS" };
  const period = resolvePeriod(kind, id, fin);
  if (period.a > fin) return { error: "PERIODO_FUTURO" };

  const [series, pieces] = await Promise.all([loadSeries(sql, addDays(period.ap, -8), period.b), loadContent(sql, period.ap, period.b)]);
  const g = (country: string, source: string, metric: string) => series.get(`${country}|${source}|${metric}`);

  const nWeeks = Math.min(14, Math.max(8, Math.ceil(period.nDias / 7) + 4));
  const accounts: AccountMetrics[] = [];
  for (const [net, country] of [
    ["instagram", "es"],
    ["instagram", "pt"],
    ["facebook", "es"],
    ["facebook", "pt"],
  ] as Array<[Net, Country]>) {
    const f = g(country, net, "followers");
    const cur = netGain(f, period.a, period.b);
    const prev = netGain(f, period.ap, period.bp);
    const st = piecesStats(pieces, net, country, period.a, period.b);
    const stp = piecesStats(pieces, net, country, period.ap, period.bp);
    accounts.push({
      net,
      country,
      followersIni: cur.ini,
      followersFin: cur.fin,
      netos: cur.netos,
      netosPrev: prev.netos,
      alcanceTotal: sumRange(g(country, net, "reach"), period.a, period.b),
      interaccionesTotal: sumRange(g(country, net, "interactions"), period.a, period.b),
      interaccionesTotalPrev: sumRange(g(country, net, "interactions"), period.ap, period.bp),
      piezas: st.count,
      piezasPrev: stp.count,
      alcanceMedianoPieza: st.medianReach,
      alcanceMedianoPiezaPrev: stp.medianReach,
      tasa: st.tasa,
      tasaPrev: stp.tasa,
      semanas: weeks(f, period.b, nWeeks, period.a),
      followersDaily: (f ?? []).filter((p) => p.day >= period.ap),
      followersAtPrevStart: lastBefore(f, period.ap) ?? firstFrom(f, period.ap),
      followersAtStart: lastBefore(f, period.a) ?? firstFrom(f, period.a),
    });
  }

  // YouTube: las visualizaciones llegan con 1-2 días de retraso; se comparan los mismos días en ambos periodos.
  const subs = g("all", "youtube", "subscribers");
  const views = g("all", "youtube", "views");
  const finViews = (views ?? []).filter((p) => p.day <= period.b).map((p) => p.day).pop() ?? period.b;
  const nv = daysBetween(period.a, finViews) + 1;
  const bvPrev = addDays(period.ap, nv - 1) < period.bp ? addDays(period.ap, nv - 1) : period.bp;
  const subsCur = netGain(subs, period.a, period.b);
  const subsPrev = netGain(subs, period.ap, period.bp);
  const vids = pieces.filter((p) => p.source === "youtube");
  const vCur = vids.filter((p) => inRange(p.date.slice(0, 10), period.a, period.b));
  const vPrev = vids.filter((p) => inRange(p.date.slice(0, 10), period.ap, period.bp));
  const isShort = (p: Piece) => p.type === "short";
  const agg = (L: Piece[]) => ({ n: L.length, vistas: L.reduce((t, p) => t + (p.views ?? 0), 0), vistasPieza: L.length ? L.reduce((t, p) => t + (p.views ?? 0), 0) / L.length : null });
  const cortos = agg(vCur.filter(isShort));
  const largos = agg(vCur.filter((p) => !isShort(p)));
  const totalViews = vCur.reduce((t, p) => t + (p.views ?? 0), 0);
  const totalWatch = vCur.reduce((t, p) => t + Number(p.extra?.watchMinutes ?? 0), 0);
  const shortWatch = vCur.filter(isShort).reduce((t, p) => t + Number(p.extra?.watchMinutes ?? 0), 0);
  const youtube: Youtube = {
    subsFin: subsCur.fin,
    subsIni: subsCur.ini,
    netos: subsCur.netos,
    netosPrev: subsPrev.netos,
    vistas: sumRange(views, period.a, finViews),
    vistasPrev: sumRange(views, period.ap, bvPrev),
    vistasHasta: finViews,
    piezas: vCur.length,
    piezasPrev: vPrev.length,
    cortos,
    largos,
    pctVistasCortos: totalViews ? (cortos.vistas / totalViews) * 100 : null,
    pctTiempoCortos: totalWatch ? (shortWatch / totalWatch) * 100 : null,
    semanas: weeks(subs, period.b, nWeeks, period.a),
    subsDaily: (subs ?? []).filter((p) => p.day >= period.ap),
    top: [...vCur].sort((x, y) => (y.views ?? 0) - (x.views ?? 0)).slice(0, 3),
  };

  const sp = g("all", "ads", "spend");
  const im = g("all", "ads", "impressions");
  const cl = g("all", "ads", "clicks");
  const adsTot = (a: string, b: string) => {
    const spend = sumRange(sp, a, b);
    const imp = sumRange(im, a, b);
    const clk = sumRange(cl, a, b);
    return { spend, imp, clk, ctr: imp ? (clk / imp) * 100 : null, cpc: clk ? spend / clk : null };
  };
  const ac = adsTot(period.a, period.b);
  const ap = adsTot(period.ap, period.bp);
  const ads: Ads = {
    inversion: ac.spend,
    inversionPrev: ap.spend,
    impresiones: ac.imp,
    impresionesPrev: ap.imp,
    clics: ac.clk,
    clicsPrev: ap.clk,
    ctr: ac.ctr,
    ctrPrev: ap.ctr,
    cpc: ac.cpc,
    cpcPrev: ap.cpc,
    spendDaily: (sp ?? []).filter((p) => p.day >= period.ap),
  };

  const inCur = pieces.filter((p) => inRange(p.date.slice(0, 10), period.a, period.b));
  const top: Record<string, Piece[]> = {};
  for (const net of ["instagram", "facebook"] as Net[]) {
    for (const c of ["es", "pt"] as Country[]) {
      top[`${net}:${c}`] = inCur
        .filter((p) => p.source === net && p.country === c)
        .sort((x, y) => y.interactions - x.interactions)
        .slice(0, 2);
    }
  }
  const hero = inCur.filter((p) => p.source === "instagram" && p.image).sort((x, y) => y.interactions - x.interactions)[0] ?? null;

  const fmt = (t: string) => {
    const L = pieces.filter((p) => p.source === "instagram" && p.type === t && p.reach);
    return {
      n: L.length,
      alcance: median(L.map((p) => p.reach as number)),
      tasa: median(L.map((p) => (p.reach ? (p.interactions / (p.reach as number)) * 100 : 0))),
    };
  };

  return { period, generatedAt: new Date().toISOString(), accounts, youtube, ads, top, hero, formatosIg: { reel: fmt("Reel"), carrusel: fmt("Carrusel") } };
}
