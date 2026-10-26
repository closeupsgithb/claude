import { BRAND, logoSvg } from "./brand";
import { FONT_FACE_CSS } from "./fonts";
import type { AccountMetrics, Net, Piece, ReportData } from "./data";

/* ──────────────────────────────────────────────────────────────────────────
   Plantilla del informe. Genera HTML autocontenido (A4) que se convierte en PDF.
   Solo cifras: ningún texto escrito a mano; las frases son automáticas y se
   construyen a partir de los datos del periodo.
   ────────────────────────────────────────────────────────────────────────── */

export type Assets = { hero: string | null; thumbs: Record<string, string> };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number | null | undefined, dec = 0) =>
  v == null || Number.isNaN(v) ? "—" : v.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true });
// toLocaleString('es-ES') no agrupa los miles de 4 cifras: se fuerza para que 1.583 se vea igual en todos los servidores.
const num = (v: number | null | undefined, dec = 0) => {
  if (v == null || Number.isNaN(v)) return "—";
  const [i, d] = Math.abs(v).toFixed(dec).split(".");
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (v < 0 ? "-" : "") + g + (d ? "," + d : "");
};
const sg = (v: number | null) => (v == null ? "—" : (v >= 0 ? "+" : "-") + num(Math.abs(v)));
const pct = (c: number | null, p: number | null) => (c == null || p == null || p === 0 ? null : ((c - p) / Math.abs(p)) * 100);
const dp = (v: number | null) => (v == null ? "—" : (v >= 0 ? "+" : "-") + num(Math.abs(v)) + "%");
void n;

const MES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const lab = (iso: string) => `${Number(iso.slice(8, 10))} ${MES_ABR[Number(iso.slice(5, 7)) - 1]}`;

const NET_NAME: Record<Net, string> = { instagram: "Instagram", facebook: "Facebook" };
const COUNTRY_NAME = { es: "España", pt: "Portugal" } as const;
const PLAT = (k: "ig" | "fb" | "yt") => BRAND[k];
const netKey = (n_: Net) => (n_ === "instagram" ? "ig" : "fb");

const flag = (c: "es" | "pt") => `<span class="flag ${c}"></span>`;
const chip = (c: "es" | "pt", name?: string) => `<div class="chip">${flag(c)}${esc(name ?? COUNTRY_NAME[c])}</div>`;
const delta = (v: number | null, suffix = "%", inverse = false) => {
  if (v == null) return `<small class="muted">sin comparación</small>`;
  const good = inverse ? v <= 0 : v >= 0;
  return `<small class="${good ? "up" : "dn"}">${v >= 0 ? "+" : "-"}${num(Math.abs(v))}${suffix}</small>`;
};

/* ───────────────────────── gráficos SVG ───────────────────────── */

function weeklyBars(weeks: AccountMetrics["semanas"], col: { strong: string; soft: string }, w = 360, h = 190) {
  const vals = weeks.map((x) => x.valor ?? 0);
  const max = Math.max(...vals, 1);
  const base = h - 26;
  const top = 18;
  const bw = w / weeks.length;
  let out = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">`;
  for (let g = 0; g <= 3; g++) {
    const y = base - ((base - top) * g) / 3;
    out += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${BRAND.line}" stroke-width="1" ${g === 0 ? "" : 'stroke-dasharray="3 4"'}/>`;
  }
  weeks.forEach((x, i) => {
    const v = x.valor ?? 0;
    const bh = Math.max(((base - top) * v) / max, 1.5);
    const bx = i * bw + bw * 0.16;
    const bwid = bw * 0.68;
    out += `<rect x="${bx.toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${bwid.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${x.actual ? col.strong : col.soft}"/>`;
    out += `<text x="${(bx + bwid / 2).toFixed(1)}" y="${(base - bh - 4).toFixed(1)}" font-size="9.5" font-weight="700" text-anchor="middle" fill="${BRAND.ink}">${num(x.valor)}</text>`;
    out += `<text x="${(bx + bwid / 2).toFixed(1)}" y="${base + 13}" font-size="8" text-anchor="middle" fill="${BRAND.slate}">${lab(x.inicio)}</text>`;
  });
  return out + "</svg>";
}

function groupedBars(groups: Array<{ label: string; col: { strong: string; soft: string }; prev: number | null; cur: number | null }>, w = 540, h = 230) {
  const max = Math.max(...groups.flatMap((g) => [g.prev ?? 0, g.cur ?? 0]), 1);
  const base = h - 40;
  const top = 24;
  const gw = w / groups.length;
  let out = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">`;
  for (let g = 0; g <= 3; g++) {
    const y = base - ((base - top) * g) / 3;
    out += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${BRAND.line}" ${g === 0 ? "" : 'stroke-dasharray="3 4"'}/>`;
  }
  groups.forEach((g, i) => {
    const bw = 64;
    [
      { v: g.prev, fill: g.col.soft, t: "Anterior" },
      { v: g.cur, fill: g.col.strong, t: "Actual" },
    ].forEach((b, j) => {
      const x = i * gw + gw / 2 - bw - 5 + j * (bw + 10);
      const bh = Math.max((((b.v ?? 0) * (base - top)) / max), 1.5);
      out += `<rect x="${x.toFixed(1)}" y="${(base - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="4" fill="${b.fill}"/>`;
      out += `<text x="${(x + bw / 2).toFixed(1)}" y="${(base - bh - 6).toFixed(1)}" font-size="12" font-weight="700" text-anchor="middle" fill="${BRAND.ink}">${sg(b.v)}</text>`;
      out += `<text x="${(x + bw / 2).toFixed(1)}" y="${base + 14}" font-size="9" text-anchor="middle" fill="${BRAND.slate}">${b.t}</text>`;
    });
    out += `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${base + 32}" font-size="12.5" font-weight="700" text-anchor="middle" fill="${g.col.strong}">${esc(g.label)}</text>`;
  });
  return out + "</svg>";
}

function spark(vals: number[], color: string, w = 210, h = 50) {
  if (vals.length < 2) return "";
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const rg = hi - lo || 1;
  const pts = vals.map((v, k) => [(k * w) / (vals.length - 1), h - 5 - ((v - lo) / rg) * (h - 12)] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polygon points="0,${h} ${line} ${w},${h}" fill="${color}" opacity=".14"/><polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.8" fill="${color}"/></svg>`;
}

function areaChart(series: Array<{ day: string; value: number }>, aStart: string, col: { strong: string; soft: string }, w = 520, h = 170) {
  if (series.length < 2) return "";
  const vals = series.map((p) => p.value);
  const max = Math.max(...vals, 1);
  const top = 14;
  const base = h - 22;
  const pt = (i: number, v: number) => [(i * w) / (series.length - 1), base - (v / max) * (base - top)] as const;
  const split = Math.max(series.findIndex((p) => p.day >= aStart), 0);
  const seg = (from: number, to: number, c: string) => {
    const pts = series.slice(from, to + 1).map((p, k) => pt(from + k, p.value));
    if (pts.length < 2) return "";
    const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    return `<polygon points="${pts[0][0].toFixed(1)},${base} ${line} ${pts[pts.length - 1][0].toFixed(1)},${base}" fill="${c}" opacity=".16"/><polyline points="${line}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>`;
  };
  let out = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">`;
  out += `<line x1="0" y1="${base}" x2="${w}" y2="${base}" stroke="${BRAND.line}"/>`;
  out += seg(0, split, col.soft) + seg(split, series.length - 1, col.strong);
  out += `<text x="2" y="${h - 6}" font-size="8" fill="${BRAND.slate}">${lab(series[0].day)}</text><text x="${w - 2}" y="${h - 6}" font-size="8" text-anchor="end" fill="${BRAND.slate}">${lab(series[series.length - 1].day)}</text>`;
  return out + "</svg>";
}

/* ───────────────────────── piezas de maquetación ───────────────────────── */

const legend = (col: { strong: string; soft: string }, prev: string, cur: string) =>
  `<div class="leg"><i style="background:${col.soft}"></i>${esc(prev)} &nbsp; <i style="background:${col.strong}"></i>${esc(cur)}</div>`;

const kpi = (value: string, label: string, deltaHtml: string, color: string) =>
  `<div class="card kpi" style="border-top:4px solid ${color}"><b style="color:${color}">${value}</b><span>${label}</span>${deltaHtml}</div>`;

function page(opts: { title: string; sub: string; band: string; bandColor: string; body: string; n: number; footer: string }) {
  return `<section class="page">
  <div class="band" style="background:${opts.bandColor}"><span>${esc(opts.band)}</span><span class="logo">${logoSvg("#fff", 14)}</span></div>
  <div class="in"><h1>${esc(opts.title)}</h1><p class="sub">${esc(opts.sub)}</p><div class="rule" style="background:${opts.bandColor}"></div>${opts.body}</div>
  <div class="foot"><span>${esc(opts.footer)}</span><span>${opts.n}</span></div></section>`;
}

const concl = (color: string, tint: string, text: string, head = "Conclusión") =>
  `<div class="concl" style="background:${tint};border-color:${color}"><b style="color:${color}">${esc(head)}</b>${text}</div>`;

/* ───────────────────────── informe ───────────────────────── */

export function renderReportHtml(d: ReportData, assets: Assets): string {
  const p = d.period;
  const isQ = p.kind === "trimestre";
  const prevTag = esc(p.prevLabel);
  const cur = (p.kind === "mes" ? p.label.split(" ")[0] : p.label.replace(/ \d{4}$/, "")).toLowerCase();
  const footer = `COSMIC TRAVELER TEAM · Shimano Iberia · ${p.label}`;
  const rangeTxt = `${lab(p.a)} – ${lab(p.b)}${p.enCurso ? " (periodo en curso)" : ""}`;
  const cmpTxt = `${isQ ? "mismos días del" : "mismos días de"} ${p.prevLabel.toLowerCase()}`;

  const acc = (net: Net, c: "es" | "pt") => d.accounts.find((x) => x.net === net && x.country === c)!;
  const igNet = (acc("instagram", "es").netos ?? 0) + (acc("instagram", "pt").netos ?? 0);
  const igPrev = (acc("instagram", "es").netosPrev ?? 0) + (acc("instagram", "pt").netosPrev ?? 0);
  const fbNet = (acc("facebook", "es").netos ?? 0) + (acc("facebook", "pt").netos ?? 0);
  const fbPrev = (acc("facebook", "es").netosPrev ?? 0) + (acc("facebook", "pt").netosPrev ?? 0);
  const yt = d.youtube;

  /* Snapshot de seguidores (página 2) */
  type Row = { plat: "ig" | "fb" | "yt"; name: string; c: "es" | "pt"; v0: number | null; v1: number | null; vh: number | null; daily: number[] };
  const rows: Row[] = [
    ...d.accounts.map((a) => ({
      plat: netKey(a.net) as "ig" | "fb",
      name: NET_NAME[a.net],
      c: a.country,
      v0: a.followersAtPrevStart,
      v1: a.followersAtStart,
      vh: a.followersFin,
      daily: a.followersDaily.map((x) => x.value),
    })),
    { plat: "yt" as const, name: "YouTube", c: "es" as const, v0: null, v1: yt.subsIni, vh: yt.subsFin, daily: yt.subsDaily.map((x) => x.value) },
  ];
  // YouTube: valor al inicio del periodo anterior desde la serie diaria
  if (yt.subsDaily.length) rows[rows.length - 1].v0 = yt.subsDaily[0].value;
  const tot0 = rows.reduce((t, r) => t + (r.v0 ?? 0), 0);
  const tot1 = rows.reduce((t, r) => t + (r.v1 ?? 0), 0);
  const toth = rows.reduce((t, r) => t + (r.vh ?? 0), 0);
  const snapRows = rows
    .map((r) => {
      const col = PLAT(r.plat).strong;
      return `<tr><td class="w1"><span class="pill" style="background:${col}">${r.name}</span><div class="ctry">${flag(r.c)}${COUNTRY_NAME[r.c]}</div></td>
      <td class="w2">${spark(r.daily, col, 190, 44)}</td>
      <td class="r muted">${num(r.v0)}</td><td class="r muted">${num(r.v1)}</td>
      <td class="r"><b class="big" style="color:${col}">${num(r.vh)}</b></td>
      <td class="r"><span class="up b">${r.vh != null && r.v0 != null ? sg(r.vh - r.v0) : "—"}</span></td></tr>`;
    })
    .join("");

  const interTot = d.accounts.reduce((t, a) => t + a.interaccionesTotal, 0);
  const netTot = igNet + fbNet + (yt.netos ?? 0);

  /* Portada */
  const hero = assets.hero
    ? `<img class="hero" src="${assets.hero}"><div class="veil"></div>`
    : `<div class="veil flat"></div>`;
  const cover = `<section class="page cover">${hero}
  <div class="cover-in">
    <div class="cover-top">${logoSvg("#fff", 22)}</div>
    <div class="cover-mid">
      <div class="eyebrow">Informe ${isQ ? "trimestral" : "mensual"} · Redes sociales</div>
      <div class="cover-title">Resultados de<br>${esc(p.label.toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</div>
      <div class="cover-sub">Shimano Iberia · Instagram, Facebook y YouTube · España y Portugal</div>
      <div class="cover-rule"></div>
      <div class="cover-range">${rangeTxt}<br><span>Comparado con ${cmpTxt}</span></div>
    </div>
    <div class="cover-kpis">
      <div><b>${num(toth)}</b><span>Seguidores en todas las plataformas</span></div>
      <div><b>${sg(netTot)}</b><span>Crecimiento neto en el periodo</span></div>
      <div><b>${num(interTot)}</b><span>Interacciones en Instagram y Facebook</span></div>
    </div>
    <div class="cover-foot">COSMIC TRAVELER TEAM</div>
  </div></section>`;

  /* Página 2: seguidores por plataforma y país */
  const p2 = page({
    title: "Seguidores por plataforma y país",
    sub: "De un vistazo: dónde estábamos y dónde estamos hoy",
    band: "Panorama",
    bandColor: BRAND.navy,
    n: 2,
    footer,
    body: `<div class="card" style="padding:6px 16px 8px"><table class="snap"><thead><tr><th></th><th>Evolución</th><th class="r">${lab(addIso(p.ap))}</th><th class="r">${lab(p.a)}</th><th class="r">Hoy</th><th class="r">Desde ${lab(addIso(p.ap))}</th></tr></thead><tbody>${snapRows}
    <tr class="tot"><td colspan="2">Total en todas las plataformas</td><td class="r muted">${num(tot0)}</td><td class="r muted">${num(tot1)}</td><td class="r"><b class="big" style="color:${BRAND.navy}">${num(toth)}</b></td><td class="r"><span class="up b">${sg(toth - tot0)}</span></td></tr></tbody></table></div>
    <p class="note">Último dato disponible: ${lab(p.b)}. Los suscriptores de YouTube se redondean a centenas en la plataforma.</p>
    ${concl(BRAND.navy, "#E6F0F8", `Entre las cinco cuentas se suman <b>${num(toth)}</b> seguidores y suscriptores, <b>${sg(toth - tot0)}</b> desde el ${lab(addIso(p.ap))}.`, "Lectura")}`,
  });

  /* Página 3: resumen */
  const best = [
    { k: "Instagram", v: pct(igNet, igPrev) },
    { k: "YouTube", v: pct(yt.netos, yt.netosPrev) },
    { k: "Facebook", v: pct(fbNet, fbPrev) },
  ];
  const p3 = page({
    title: `Resumen ${isQ ? "del trimestre" : "del mes"}`,
    sub: `Seguidores y suscriptores netos · ${rangeTxt} frente a ${cmpTxt}`,
    band: "Resumen",
    bandColor: BRAND.navy,
    n: 3,
    footer,
    body: `<div class="kpis">
      ${kpi(sg(igNet), "Instagram · seguidores netos", delta(pct(igNet, igPrev)), PLAT("ig").strong)}
      ${kpi(sg(yt.netos), "YouTube · suscriptores netos", delta(pct(yt.netos, yt.netosPrev)), PLAT("yt").strong)}
      ${kpi(sg(fbNet), "Facebook · seguidores netos", delta(pct(fbNet, fbPrev)), PLAT("fb").strong)}
    </div>
    <div class="card" style="padding:12px 16px 6px"><div class="ct">Crecimiento por plataforma</div>${groupedBars([
      { label: "Instagram", col: PLAT("ig"), prev: igPrev, cur: igNet },
      { label: "Facebook", col: PLAT("fb"), prev: fbPrev, cur: fbNet },
      { label: "YouTube", col: PLAT("yt"), prev: yt.netosPrev, cur: yt.netos },
    ])}<div class="leg">Color claro: ${prevTag} · Color intenso: ${esc(cur)}</div></div>
    <div class="kpis small">
      ${kpi(num(d.accounts.reduce((t, a) => t + a.piezas, 0)), "Piezas publicadas en Instagram y Facebook", `<small class="muted">${prevTag}: ${num(d.accounts.reduce((t, a) => t + a.piezasPrev, 0))}</small>`, BRAND.navy)}
      ${kpi(num(acc("instagram", "es").interaccionesTotal + acc("instagram", "pt").interaccionesTotal), "Interacciones en Instagram", delta(pct(acc("instagram", "es").interaccionesTotal + acc("instagram", "pt").interaccionesTotal, acc("instagram", "es").interaccionesTotalPrev + acc("instagram", "pt").interaccionesTotalPrev)), BRAND.navy)}
      ${kpi(num(yt.vistas), "Visualizaciones en YouTube", `<small class="muted">${prevTag}: ${num(yt.vistasPrev)}</small>`, BRAND.navy)}
      ${kpi(`${num(d.ads.inversion)} €`, "Inversión en Meta Ads", `<small class="muted">${prevTag}: ${num(d.ads.inversionPrev)} €</small>`, BRAND.navy)}
    </div>
    ${concl(BRAND.navy, "#E6F0F8", summarySentence(best, igNet, igPrev, fbNet, fbPrev, yt.netos, yt.netosPrev, prevTag))}`,
  });

  /* Páginas por plataforma */
  const accountBlock = (a: AccountMetrics) => {
    const col = PLAT(netKey(a.net));
    const dNet = pct(a.netos, a.netosPrev);
    let k = kpi(sg(a.netos), "Seguidores netos", delta(dNet), col.strong);
    if (a.net === "instagram") {
      const dt = a.tasa != null && a.tasaPrev != null ? a.tasa - a.tasaPrev : null;
      k += kpi(`${num(a.tasa, 1)}%`, "Tasa de interacción", dt == null ? "" : `<small class="${dt >= 0 ? "up" : "dn"}">${dt >= 0 ? "+" : "-"}${num(Math.abs(dt), 1)} pts</small>`, col.strong);
      k += kpi(num(a.interaccionesTotal), "Interacciones totales", delta(pct(a.interaccionesTotal, a.interaccionesTotalPrev)), col.strong);
    } else {
      k += kpi(num(a.alcanceMedianoPieza), "Alcance mediano por pieza", delta(pct(a.alcanceMedianoPieza, a.alcanceMedianoPiezaPrev)), col.strong);
      const dt = a.tasa != null && a.tasaPrev != null ? a.tasa - a.tasaPrev : null;
      k += kpi(`${num(a.tasa, 1)}%`, "Tasa de interacción", dt == null ? "" : `<small class="${dt >= 0 ? "up" : "dn"}">${dt >= 0 ? "+" : "-"}${num(Math.abs(dt), 1)} pts</small>`, col.strong);
    }
    return `<div class="acc">${chip(a.country)}<div class="row"><div class="kcol">${k}</div>
      <div class="ccol"><div class="card" style="padding:10px 12px 6px"><div class="ct">Seguidores netos por semana</div>${weeklyBars(a.semanas, col, 330, 200)}${legend(col, p.prevLabel, cur)}</div></div></div></div>`;
  };

  const platPage = (net: Net, n_: number, text: string) => {
    const col = PLAT(netKey(net));
    return page({
      title: NET_NAME[net],
      sub: `Seguidores netos por semana y ${net === "instagram" ? "interacción" : "alcance"} · España y Portugal`,
      band: NET_NAME[net],
      bandColor: col.strong,
      n: n_,
      footer,
      body: accountBlock(acc(net, "es")) + accountBlock(acc(net, "pt")) + concl(col.strong, col.tint, text),
    });
  };

  const igEs = acc("instagram", "es");
  const igPt = acc("instagram", "pt");
  const fbEs = acc("facebook", "es");
  const fbPt = acc("facebook", "pt");
  const p4 = platPage("instagram", 4, instagramSentence(igNet, igPrev, igEs, igPt));
  const p5 = platPage("facebook", 5, facebookSentence(fbNet, fbPrev, fbEs, fbPt));

  /* YouTube */
  const ycol = PLAT("yt");
  const shVP = yt.cortos.vistasPieza;
  const lgVP = yt.largos.vistasPieza;
  const maxVP = Math.max(shVP ?? 0, lgVP ?? 0, 1);
  const p6 = page({
    title: "YouTube",
    sub: `Canal España · suscriptores y visualizaciones · hasta el ${lab(yt.vistasHasta ?? p.b)}`,
    band: "YouTube",
    bandColor: ycol.strong,
    n: 6,
    footer,
    body: `<div class="acc">${chip("es")}<div class="row"><div class="kcol">
      ${kpi(sg(yt.netos), "Suscriptores netos", delta(pct(yt.netos, yt.netosPrev)), ycol.strong)}
      ${kpi(num(yt.vistas), "Visualizaciones", `<small class="muted">${prevTag}: ${num(yt.vistasPrev)}</small>`, ycol.strong)}
      ${kpi(num(yt.piezas), "Vídeos publicados", `<small class="muted">${prevTag}: ${num(yt.piezasPrev)}</small>`, ycol.strong)}
      </div><div class="ccol"><div class="card" style="padding:10px 12px 6px"><div class="ct">Suscriptores netos por semana</div>${weeklyBars(yt.semanas, ycol, 330, 200)}${legend(ycol, p.prevLabel, cur)}</div></div></div></div>
      <div class="card" style="padding:12px 16px;margin-top:6px"><div class="ct">Shorts y vídeos largos en el periodo</div>
      <div class="hb"><span>Short</span><i style="width:${((shVP ?? 0) / maxVP) * 200}px;background:${ycol.soft}"></i><b>${num(shVP)} visualizaciones por pieza · ${yt.cortos.n} ${yt.cortos.n === 1 ? "pieza" : "piezas"}</b></div>
      <div class="hb"><span>Largo</span><i style="width:${((lgVP ?? 0) / maxVP) * 200}px;background:${ycol.strong}"></i><b>${num(lgVP)} visualizaciones por pieza · ${yt.largos.n} ${yt.largos.n === 1 ? "pieza" : "piezas"}</b></div>
      ${yt.pctVistasCortos != null ? `<div class="leg">Los Shorts suman el ${num(yt.pctVistasCortos)}% de las visualizaciones de las piezas publicadas${yt.pctTiempoCortos != null ? `; los vídeos largos concentran el ${num(100 - yt.pctTiempoCortos)}% del tiempo visto` : ""}.</div>` : ""}</div>
      ${concl(ycol.strong, ycol.tint, youtubeSentence(yt, prevTag))}`,
  });

  /* Mejores piezas */
  const pieceCard = (pc: Piece, col: string, isYt = false) => {
    const img = assets.thumbs[pc.id];
    const txt = esc(pc.content.replace(/\s+/g, " ").slice(0, isYt ? 56 : 64)) + "…";
    const metric = isYt ? `${num(pc.views)} visualizaciones` : `${num(pc.interactions)} interacciones`;
    const typeLabel = isYt ? (pc.type === "short" ? "Short" : "Vídeo largo") : pc.type;
    const reach = !isYt && pc.reach ? ` · ${num(pc.reach)} de alcance` : "";
    return `<div class="card piece${isYt ? " yt" : ""}" style="${isYt ? `border-top:4px solid ${col}` : `border-left:4px solid ${col}`}">
      ${img ? `<img src="${img}">` : `<div class="noimg"></div>`}<div class="pt"><b style="color:${col}">${metric}</b><br>${esc(typeLabel)} · ${lab(pc.date.slice(0, 10))}${reach}<br><span class="muted">${txt}</span></div></div>`;
  };
  const topBlock = (net: Net, c: "es" | "pt") => {
    const col = PLAT(netKey(net)).strong;
    const list = d.top[`${net}:${c}`] ?? [];
    return `<div class="tb"><div class="chip s">${flag(c)}<span style="color:${col}">${NET_NAME[net]}</span> · ${COUNTRY_NAME[c]}</div><div class="two">${list.map((x) => pieceCard(x, col)).join("") || '<div class="muted">Sin piezas en el periodo</div>'}</div></div>`;
  };
  const p7 = page({
    title: "Lo que mejor ha funcionado",
    sub: `Las piezas con más interacciones del periodo en cada cuenta`,
    band: "Contenido",
    bandColor: BRAND.navy,
    n: 7,
    footer,
    body: `${topBlock("instagram", "es")}${topBlock("instagram", "pt")}${topBlock("facebook", "es")}${topBlock("facebook", "pt")}
      <div class="tb"><div class="chip s">${flag("es")}<span style="color:${ycol.strong}">YouTube</span> · España</div><div class="three">${yt.top.map((x) => pieceCard(x, ycol.strong, true)).join("") || '<div class="muted">Sin vídeos en el periodo</div>'}</div></div>
      ${d.formatosIg.reel.n && d.formatosIg.carrusel.n ? concl(BRAND.navy, "#E6F0F8", `En Instagram, el carrusel logra una tasa de interacción mediana de <b>${num(d.formatosIg.carrusel.tasa, 1)}%</b> frente al <b>${num(d.formatosIg.reel.tasa, 1)}%</b> del Reel; el Reel alcanza a más personas (mediana de ${num(d.formatosIg.reel.alcance)} frente a ${num(d.formatosIg.carrusel.alcance)}).`, "Formatos") : ""}`,
  });

  /* Inversión */
  const ads = d.ads;
  const p8 = page({
    title: "Inversión en Meta Ads",
    sub: `${rangeTxt} frente a ${cmpTxt}`,
    band: "Inversión",
    bandColor: BRAND.blue,
    n: 8,
    footer,
    body: `<div class="kpis">
      ${kpi(`${num(ads.inversion)} €`, "Inversión", `<small class="muted">${prevTag}: ${num(ads.inversionPrev)} €</small>`, BRAND.blue)}
      ${kpi(num(ads.clics), "Clics en anuncios", delta(pct(ads.clics, ads.clicsPrev)), BRAND.blue)}
      ${kpi(num(ads.impresiones), "Impresiones", delta(pct(ads.impresiones, ads.impresionesPrev)), BRAND.blue)}
    </div>
    <div class="card" style="padding:12px 16px 6px"><div class="ct">Inversión diaria (€)</div>${areaChart(ads.spendDaily, p.a, { strong: BRAND.blue, soft: "#9ED8F0" }, 520, 190)}<div class="leg"><i style="background:#9ED8F0"></i>${prevTag} &nbsp; <i style="background:${BRAND.blue}"></i>${esc(cur)}</div></div>
    <div class="kpis small" style="margin-top:12px">
      ${kpi(ads.ctr == null ? "—" : `${num(ads.ctr, 1)}%`, "CTR (clics sobre impresiones)", `<small class="muted">${prevTag}: ${ads.ctrPrev == null ? "—" : num(ads.ctrPrev, 1) + "%"}</small>`, BRAND.blue)}
      ${kpi(ads.cpc == null ? "—" : `${num(ads.cpc, 2)} €`, "Coste por clic", `<small class="muted">${prevTag}: ${ads.cpcPrev == null ? "—" : num(ads.cpcPrev, 2) + " €"}</small>`, BRAND.blue)}
    </div>
    ${concl(BRAND.blue, "#E3F4FB", `La inversión en Meta Ads del periodo es de <b>${num(ads.inversion)} €</b> (${prevTag.toLowerCase()}: ${num(ads.inversionPrev)} €), con <b>${num(ads.clics)}</b> clics y <b>${num(ads.impresiones)}</b> impresiones.`)}`,
  });

  /* Conclusiones automáticas */
  const bullets = conclusions(d, { igNet, igPrev, fbNet, fbPrev, prevTag, toth, tot0 });
  const p9 = page({
    title: "Conclusiones",
    sub: `${p.label} frente a ${p.prevLabel.toLowerCase()}`,
    band: "Conclusiones",
    bandColor: BRAND.navy,
    n: 9,
    footer,
    body: bullets
      .map(
        (b) => `<div class="bl" style="border-left-color:${b.color}"><span class="pill" style="background:${b.color}">${esc(b.tag)}</span><p>${b.text}</p></div>`
      )
      .join("") + `<p class="note" style="margin-top:14px">Informe generado automáticamente a partir de los datos de Metricool y YouTube guardados en el histórico del dashboard. No incluye visitas a la web ni ventas.</p>`,
  });

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Shimano Iberia · ${esc(p.label)}</title><style>${FONT_FACE_CSS}${CSS}</style></head><body>${cover}${p2}${p3}${p4}${p5}${p6}${p7}${p8}${p9}</body></html>`;
}

function addIso(iso: string) {
  return iso;
}

/* ───────────────────────── frases automáticas ───────────────────────── */

function summarySentence(
  best: Array<{ k: string; v: number | null }>,
  igNet: number,
  igPrev: number,
  fbNet: number,
  fbPrev: number,
  ytNet: number | null,
  ytPrev: number | null,
  prevTag: string
) {
  const ranked = best.filter((b) => b.v != null).sort((a, b) => (b.v as number) - (a.v as number));
  const lead = ranked[0];
  const parts: string[] = [];
  if (lead && (lead.v as number) > 0) {
    const val = lead.k === "Instagram" ? igNet : lead.k === "Facebook" ? fbNet : ytNet;
    parts.push(`<b>${lead.k}</b> lidera el crecimiento (${sg(val)}, ${dp(lead.v)} frente a ${prevTag.toLowerCase()})`);
  }
  const others = ranked.slice(1).map((r) => {
    const val = r.k === "Instagram" ? igNet : r.k === "Facebook" ? fbNet : ytNet;
    const prev = r.k === "Instagram" ? igPrev : r.k === "Facebook" ? fbPrev : ytPrev;
    return `${r.k} suma ${sg(val)} (${prevTag.toLowerCase()}: ${sg(prev)})`;
  });
  return `${parts.join("")}${parts.length && others.length ? "; " : ""}${others.join("; ")}.`.replace(/^./, (c) => c.toUpperCase());
}

function instagramSentence(net: number, prev: number, es: AccountMetrics, pt: AccountMetrics) {
  const dPt = pct(pt.netos, pt.netosPrev);
  const tasaUp = es.tasa != null && es.tasaPrev != null && es.tasa >= es.tasaPrev;
  return `Instagram suma <b>${sg(net)}</b> seguidores netos (${dp(pct(net, prev))} frente al periodo anterior). Portugal crece un ${dp(dPt)} y la tasa de interacción en España es del <b>${num(es.tasa, 1)}%</b>${es.tasaPrev != null ? ` (${tasaUp ? "por encima" : "por debajo"} del ${num(es.tasaPrev, 1)}% anterior)` : ""}.`;
}

function facebookSentence(net: number, prev: number, es: AccountMetrics, pt: AccountMetrics) {
  return `Facebook suma <b>${sg(net)}</b> seguidores netos (periodo anterior: ${sg(prev)}). Facebook Portugal suma <b>${sg(pt.netos)}</b> (${dp(pct(pt.netos, pt.netosPrev))} frente al periodo anterior) y su alcance mediano por pieza es de ${num(pt.alcanceMedianoPieza)}; en España, de ${num(es.alcanceMedianoPieza)}.`;
}

function youtubeSentence(yt: ReportData["youtube"], prevTag: string) {
  return `YouTube suma <b>${sg(yt.netos)}</b> suscriptores (${prevTag.toLowerCase()}: ${sg(yt.netosPrev)}) y <b>${num(yt.vistas)}</b> visualizaciones (${prevTag.toLowerCase()}: ${num(yt.vistasPrev)}) con ${yt.piezas} vídeos publicados frente a ${yt.piezasPrev}.`;
}

function conclusions(
  d: ReportData,
  x: { igNet: number; igPrev: number; fbNet: number; fbPrev: number; prevTag: string; toth: number; tot0: number }
) {
  const out: Array<{ tag: string; color: string; text: string; score: number }> = [];
  const yt = d.youtube;
  const dIg = pct(x.igNet, x.igPrev);
  const dFb = pct(x.fbNet, x.fbPrev);
  const dYt = pct(yt.netos, yt.netosPrev);
  out.push({
    tag: "Instagram",
    color: BRAND.ig.strong,
    score: dIg ?? 0,
    text: `Suma <b>${sg(x.igNet)}</b> seguidores netos (${dp(dIg)} frente a ${x.prevTag.toLowerCase()}: ${sg(x.igPrev)}).`,
  });
  out.push({
    tag: "Facebook",
    color: BRAND.fb.strong,
    score: dFb ?? 0,
    text: `Suma <b>${sg(x.fbNet)}</b> seguidores netos (${x.prevTag.toLowerCase()}: ${sg(x.fbPrev)}).`,
  });
  out.push({
    tag: "YouTube",
    color: BRAND.yt.strong,
    score: dYt ?? 0,
    text: `Suma <b>${sg(yt.netos)}</b> suscriptores (${x.prevTag.toLowerCase()}: ${sg(yt.netosPrev)}) y <b>${num(yt.vistas)}</b> visualizaciones.`,
  });
  const ig = d.accounts.find((a) => a.net === "instagram" && a.country === "es");
  if (ig && ig.tasa != null) {
    out.push({
      tag: "Interacción",
      color: BRAND.navy,
      score: ig.tasaPrev != null ? ig.tasa - ig.tasaPrev : 0,
      text: `La tasa de interacción de Instagram España es del <b>${num(ig.tasa, 1)}%</b>${ig.tasaPrev != null ? ` (${x.prevTag.toLowerCase()}: ${num(ig.tasaPrev, 1)}%)` : ""}.`,
    });
  }
  const allTop = Object.values(d.top).flat().sort((a, b) => b.interactions - a.interactions)[0];
  if (allTop) {
    out.push({
      tag: "Mejor pieza",
      color: BRAND.navy,
      score: 0,
      text: `La pieza con más interacciones fue un ${esc(allTop.type.toLowerCase())} de ${NET_NAME[allTop.source as Net] ?? allTop.source} ${COUNTRY_NAME[allTop.country as "es" | "pt"] ?? ""} del ${lab(allTop.date.slice(0, 10))}, con <b>${num(allTop.interactions)}</b> interacciones.`,
    });
  }
  out.push({
    tag: "Total",
    color: BRAND.navy,
    score: 0,
    text: `Entre todas las plataformas se suman <b>${num(x.toth)}</b> seguidores y suscriptores (<b>${sg(x.toth - x.tot0)}</b> desde el inicio del periodo anterior).`,
  });
  // Lo que más crece, primero.
  const growth = out.filter((o) => ["Instagram", "Facebook", "YouTube"].includes(o.tag)).sort((a, b) => b.score - a.score);
  const rest = out.filter((o) => !["Instagram", "Facebook", "YouTube"].includes(o.tag));
  return [...growth, ...rest];
}

/* ───────────────────────── estilos ───────────────────────── */

const CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Barlow',Arial,sans-serif;color:${BRAND.ink};font-size:10.5pt;line-height:1.45;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:#F5F7FA}
.page:last-child{page-break-after:auto}
.band{height:13mm;display:flex;align-items:center;justify-content:space-between;padding:0 18mm;color:#fff;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:11pt}
.band .logo{display:flex}
.in{padding:9mm 18mm 0}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:28pt;line-height:1.05;margin:0 0 2px;letter-spacing:.005em;text-transform:uppercase}
.sub{color:${BRAND.slate};font-size:10.5pt;margin:0}
.rule{width:56px;height:4px;margin:9px 0 14px;border-radius:2px}
p{margin:0 0 7px}
.muted{color:${BRAND.slate}}
.note{font-size:8.6pt;color:${BRAND.slate};margin:8px 0 0}
.foot{position:absolute;left:18mm;right:18mm;bottom:9mm;border-top:1px solid ${BRAND.line};padding-top:3mm;display:flex;justify-content:space-between;font-size:8pt;color:${BRAND.slate};letter-spacing:.03em}
.card{background:#fff;border:1px solid ${BRAND.line};border-radius:10px;box-shadow:0 1px 2px rgba(20,32,43,.04)}
.ct{font-weight:600;font-size:10pt;margin-bottom:3px;color:${BRAND.ink}}
.kpis{display:flex;gap:10px;margin:0 0 12px}
.kpis .kpi{flex:1;margin:0}
.kpi{padding:12px 8px 10px;text-align:center}
.kpi b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:27pt;line-height:1.05;font-weight:700}
.kpi span{display:block;font-size:8.8pt;color:${BRAND.slate};margin-top:2px}
.kpi small{display:block;font-size:8.8pt;font-weight:600;margin-top:2px}
.kpis.small .kpi b{font-size:20pt}
.up{color:${BRAND.up}}.dn{color:${BRAND.down}}.b{font-weight:700}
.leg{font-size:8.4pt;color:${BRAND.slate};margin-top:3px}
.leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px -1px 0}
.chip{display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:11pt;padding:3px 13px 3px 6px;border-radius:99px;background:#fff;border:1px solid ${BRAND.line};margin-bottom:8px}
.chip.s{font-size:10pt;padding:2px 11px 2px 5px;margin-bottom:5px}
.flag{display:inline-block;width:24px;height:16px;border-radius:3px;border:1px solid rgba(0,0,0,.14);vertical-align:-3px}
.flag.es{background:linear-gradient(#c60b1e 25%,#ffc400 25%,#ffc400 75%,#c60b1e 75%)}
.flag.pt{background:linear-gradient(90deg,#046a38 40%,#da291c 40%)}
.pill{display:inline-block;font-weight:700;font-size:9pt;color:#fff;padding:3px 12px;border-radius:99px;letter-spacing:.02em}
.acc{margin-bottom:8px}
.row{display:flex;gap:14px;align-items:flex-start}
.kcol{width:54mm;flex:none}
.kcol .kpi{margin-bottom:8px}
.ccol{flex:1}
.concl{border-radius:10px;padding:13px 18px;margin-top:14px;font-size:11pt;border-left:6px solid}
.concl b:first-child{}
.concl>b:first-child{display:block;font-size:8.4pt;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px}
table.snap{width:100%;border-collapse:collapse;font-size:10pt}
table.snap th{font-size:8.4pt;font-weight:500;color:${BRAND.slate};text-align:left;padding:8px 4px;border-bottom:1px solid ${BRAND.line}}
table.snap td{padding:9px 4px;border-bottom:1px solid #EDF1F5;vertical-align:middle}
table.snap .w1{width:42mm}.w2{width:50mm}
.r{text-align:right}
.ctry{margin-top:4px;font-weight:700;font-size:9.4pt}
.big{font-family:'Barlow Condensed',sans-serif;font-size:17pt}
tr.tot td{border-top:2px solid ${BRAND.navy};border-bottom:0;padding-top:11px;font-weight:700;font-size:11pt}
.hb{display:flex;align-items:center;gap:8px;font-size:9pt;margin:6px 0}.hb span{width:48px;color:${BRAND.slate}}.hb i{display:block;height:15px;border-radius:3px}
.tb{margin-bottom:6px}
.two{display:flex;gap:10px}.two .piece{flex:1}
.three{display:flex;gap:10px}.three .piece{flex:1}
.piece{display:flex;gap:9px;padding:8px}
.piece img{width:21mm;height:21mm;border-radius:6px;object-fit:cover;flex:none}
.noimg{width:21mm;height:21mm;border-radius:6px;background:${BRAND.mist};flex:none}
.piece .pt{font-size:8.4pt;line-height:1.35}.piece .pt b{font-size:9.4pt}
.piece.yt{flex-direction:column;gap:5px}.piece.yt img{width:100%;height:25mm}
.bl{background:#fff;border:1px solid ${BRAND.line};border-left:6px solid;border-radius:10px;padding:11px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:center}
.bl .pill{min-width:92px;text-align:center}.bl p{margin:0;font-size:11.5pt}
.cover{background:${BRAND.navyDeep};color:#fff}
.cover .hero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,26,47,.55) 0%,rgba(7,26,47,.35) 30%,rgba(7,26,47,.88) 72%,${BRAND.navyDeep} 100%)}
.veil.flat{background:linear-gradient(160deg,#0B2A4A 0%,#071A2F 100%)}
.cover-in{position:absolute;inset:0;padding:18mm}
.cover-top{display:flex}
.cover-mid{position:absolute;left:18mm;right:18mm;top:104mm}
.eyebrow{font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#7FD0F2;font-size:12pt;margin-bottom:8px}
.cover-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:50pt;line-height:1.0;text-transform:uppercase}
.cover-sub{font-size:13pt;color:#C9DDEC;margin-top:12px}
.cover-rule{width:70px;height:4px;background:${BRAND.blue};margin:18px 0 14px;border-radius:2px}
.cover-range{font-size:12pt;font-weight:600}.cover-range span{font-weight:400;color:#A9C4D8;font-size:10.5pt}
.cover-kpis{position:absolute;left:18mm;right:18mm;bottom:30mm;display:flex;gap:12px}
.cover-kpis div{flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:12px 14px}
.cover-kpis b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:27pt;line-height:1.05}
.cover-kpis span{font-size:9pt;color:#C9DDEC}
.cover-foot{position:absolute;left:18mm;bottom:15mm;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.16em;font-size:11pt}
`;
