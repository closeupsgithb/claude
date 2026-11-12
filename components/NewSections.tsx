"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { IberiaMap } from "@/components/IberiaMap";
import {
  AGE_BUCKETS, AUDIENCE, AUDIENCE_AS_OF, COMP_IG, COMP_PERIODS, COMP_YT, COUNTRY_NAMES, IG_ES_AGE_GENDER,
  SALES_OFFICES, TARGETS, type Series,
} from "@/lib/audienceData";

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;

const card: CSSProperties = {
  background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12,
  padding: "16px 18px", boxShadow: "var(--card-shadow)",
};
const eyebrow: CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)",
};
const note: CSSProperties = { fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.45 };

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section style={card}>
      <div style={eyebrow}>{title}</div>
      {sub && <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 12px" }}>{sub}</p>}
      {children}
    </section>
  );
}

function Label({ children }: { children: string }) {
  return <h2 style={{ ...eyebrow, margin: "6px 0 -8px", fontSize: 12 }}>{children}</h2>;
}

/* ------------------------------ ANALÍTICA ------------------------------ */

function CountryBars({ id }: { id: keyof typeof AUDIENCE }) {
  const a = AUDIENCE[id];
  const shown = a.rows.reduce((s, r) => s + r.share, 0);
  const max = a.rows[0].share;
  return (
    <div style={{ ...card, flex: "1 1 320px", minWidth: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: `var(${a.accent})` }}>{a.label}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.total}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
        {a.rows.map((r, i) => (
          <div key={r.code} style={{ display: "grid", gridTemplateColumns: "92px 1fr 52px", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: i === 0 ? 700 : 400 }}>
              {COUNTRY_NAMES[r.code] ?? r.code}
            </span>
            <span style={{ height: 9, background: "var(--gridline)", borderRadius: 5, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${(r.share / max) * 100}%`, background: i === 0 ? `var(${a.accent})` : "var(--series-other)", borderRadius: 5 }} />
            </span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct(r.share)}</span>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 52px", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span>Resto</span><span />
          <span style={{ textAlign: "right" }}>{pct(100 - shown)}</span>
        </div>
      </div>
    </div>
  );
}

function AgeGender() {
  const total = IG_ES_AGE_GENDER.reduce((s, r) => s + r[2], 0);
  const by = AGE_BUCKETS.map((b) => {
    const rows = IG_ES_AGE_GENDER.filter((r) => r[0] === b);
    const sum = (g: string) => rows.filter((r) => r[1] === g).reduce((s, r) => s + r[2], 0);
    return { b, m: sum("M"), f: sum("F"), u: sum("U"), t: rows.reduce((s, r) => s + r[2], 0) };
  });
  const max = Math.max(...by.map((x) => x.t));
  const men = by.reduce((s, x) => s + x.m, 0);
  const women = by.reduce((s, x) => s + x.f, 0);
  const core = by.filter((x) => ["25-34", "35-44", "45-54"].includes(x.b)).reduce((s, x) => s + x.t, 0);
  return (
    <Block title="Instagram España · edad y género" sub={`El ${pct((core / total) * 100, 0)} de la comunidad tiene entre 25 y 54 años: el perfil del pescador con poder de compra.`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {by.map((x) => (
          <div key={x.b} style={{ display: "grid", gridTemplateColumns: "56px 1fr 56px", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ color: "var(--text-secondary)" }}>{x.b}</span>
            <span style={{ display: "flex", height: 14, width: `${(x.t / max) * 100}%`, borderRadius: 5, overflow: "hidden" }}>
              <span style={{ width: `${(x.m / x.t) * 100}%`, background: "var(--series-es)" }} />
              <span style={{ width: `${(x.f / x.t) * 100}%`, background: "var(--brand-instagram)" }} />
              <span style={{ width: `${(x.u / x.t) * 100}%`, background: "var(--series-other)" }} />
            </span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct((x.t / total) * 100)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
        <Legend color="var(--series-es)" text={`Hombres ${pct((men / total) * 100, 0)}`} />
        <Legend color="var(--brand-instagram)" text={`Mujeres ${pct((women / total) * 100, 0)}`} />
        <Legend color="var(--series-other)" text={`No indicado ${pct(((total - men - women) / total) * 100, 0)}`} />
      </div>
    </Block>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      {text}
    </span>
  );
}

function IberiaSplit() {
  const rows = [
    { id: "ig-es", name: "Instagram ES" }, { id: "fb-es", name: "Facebook ES" }, { id: "yt-es", name: "YouTube" }, { id: "ig-pt", name: "Instagram PT" },
  ] as const;
  const get = (id: string, code: string) => AUDIENCE[id].rows.find((r) => r.code === code)?.share ?? 0;
  return (
    <Block title="Dónde vive realmente cada comunidad" sub="Reparto de seguidores entre España, Portugal y el resto del mundo.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => {
          const es = get(r.id, "ES"), pt = get(r.id, "PT"), rest = 100 - es - pt;
          return (
            <div key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span style={{ color: "var(--text-muted)" }}>ES {pct(es, 0)} · PT {pct(pt, 0)} · resto {pct(rest, 0)}</span>
              </div>
              <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden" }}>
                <span style={{ width: `${es}%`, background: "var(--series-es)" }} />
                <span style={{ width: `${pt}%`, background: "var(--series-pt)" }} />
                <span style={{ width: `${rest}%`, background: "var(--series-other)", opacity: 0.55 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
        <Legend color="var(--series-es)" text="España" />
        <Legend color="var(--series-pt)" text="Portugal" />
        <Legend color="var(--series-other)" text="Resto" />
      </div>
    </Block>
  );
}

export function AnaliticaView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <IberiaMap />
      <Label>Audiencia por país y red</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <CountryBars id="ig-es" />
        <CountryBars id="ig-pt" />
        <CountryBars id="yt-es" />
        <CountryBars id="fb-es" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <IberiaSplit />
        <AgeGender />
      </div>
      <p style={note}>
        Demografía de seguidores a {AUDIENCE_AS_OF}. Facebook cuenta los seguidores, no las personas activas.
      </p>
    </div>
  );
}

/* ----------------------------- COMPETENCIA ----------------------------- */

const PALETTE = ["var(--series-es)", "#6b6a64", "#a3a29a", "#c9c8bf"];

function growth(from: number | null, to: number | null) {
  return from && to ? ((to - from) / from) * 100 : null;
}

function LineCompare({ series, title, sub }: { series: Series[]; title: string; sub: string }) {
  const W = 520, H = 220, pl = 44, pr = 92, pt = 14, pb = 28;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = Math.ceil(Math.max(...all) / 10000) * 10000;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (COMP_PERIODS.length - 1);
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const ticks = [0, 0.5, 1].map((t) => t * max);
  return (
    <Block title={title} sub={sub}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} style={{ display: "block" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="var(--gridline)" />
            <text x={pl - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-muted)">{t === 0 ? "0" : `${t / 1000}k`}</text>
          </g>
        ))}
        {COMP_PERIODS.map((p, i) => (
          <text key={p} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">{p.replace(" 2026", "")}</text>
        ))}
        {series.map((s, si) => {
          const lastIdx = series.map((q) => (q.values.filter((v) => v !== null).slice(-1)[0] as number)).map((v) => y(v));
          const myY = lastIdx[si];
          const nudge = lastIdx.filter((o, oi) => oi < si && Math.abs(o - myY) < 12).length * 12;
          const color = s.highlight ? "var(--series-es)" : PALETTE[Math.min(si, 3)];
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const d = pts.filter(Boolean).map((p, i) => `${i ? "L" : "M"}${p![0]},${p![1]}`).join(" ");
          const last = pts.filter(Boolean).slice(-1)[0]!;
          const lastV = s.values.filter((v) => v !== null).slice(-1)[0] as number;
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={color} strokeWidth={s.highlight ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={s.highlight ? 3.6 : 2.6} fill={color} />)}
              <text x={last[0] + 8} y={last[1] + 4 + nudge} fontSize="11" fontWeight={s.highlight ? 700 : 500} fill={s.highlight ? "var(--text-primary)" : "var(--text-secondary)"}>
                {s.name.split(" ")[0]} {(lastV / 1000).toFixed(1).replace(".", ",")}k
              </text>
            </g>
          );
        })}
      </svg>
    </Block>
  );
}

function GrowthTable({ series, from, to, label }: { series: Series[]; from: number; to: number; label: string }) {
  const rows = series
    .map((s) => ({ s, a: s.values[from], b: s.values[to] }))
    .filter((r): r is { s: Series; a: number; b: number } => r.a !== null && r.b !== null)
    .map((r) => ({ ...r, abs: r.b - r.a, g: growth(r.a, r.b)! }))
    .sort((p, q) => q.g - p.g);
  return (
    <Block title={label}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 11.5 }}>
            <th style={{ textAlign: "left", fontWeight: 600, padding: "0 0 6px" }}>Marca</th>
            <th style={{ fontWeight: 600 }}>Ago</th><th style={{ fontWeight: 600 }}>Oct</th>
            <th style={{ fontWeight: 600 }}>Altas</th><th style={{ fontWeight: 600 }}>Crec.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, a, b, abs, g }) => (
            <tr key={s.name} style={{ textAlign: "right", borderTop: "1px solid var(--gridline)", fontWeight: s.highlight ? 700 : 400 }}>
              <td style={{ textAlign: "left", padding: "7px 0" }}>{s.name}</td>
              <td>{fmt(a)}</td><td>{fmt(b)}</td><td>+{fmt(abs)}</td>
              <td style={{ color: s.highlight ? "var(--success)" : "var(--text-secondary)" }}>+{pct(g)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  );
}

function Offices() {
  const rows = SALES_OFFICES.map((o) => {
    const t08 = o.ig08 + o.yt08, t11 = o.ig11 + o.yt11;
    return { ...o, t08, t11, abs: t11 - t08, g: ((t11 - t08) / t08) * 100 };
  }).sort((a, b) => b.g - a.g);
  const max = Math.max(...rows.map((r) => r.g));
  const iberia = rows.find((r) => r.highlight)!;
  const eu = rows.find((r) => r.name === "EU")!;
  const it = rows.find((r) => r.name === "Italia")!;
  const de = rows.find((r) => r.name === "Alemania")!;
  return (
    <Block
      title="Frente a otras oficinas de Shimano · comunidad total (Instagram + YouTube)"
      sub={`Iberia crece ${pct(iberia.g)} entre agosto y noviembre: ${(iberia.g / eu.g).toFixed(1).replace(".", ",")} veces el ritmo de EU, ${(iberia.g / it.g).toFixed(1).replace(".", ",")} el de Italia y más de ${Math.floor(iberia.g / de.g)} el de Alemania.`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, gap: 8 }}>
              <span style={{ fontWeight: r.highlight ? 800 : 500 }}>{r.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: r.highlight ? 700 : 400 }}>+{pct(r.g)} · +{fmt(r.abs)}</span>
            </div>
            <span style={{ display: "block", height: 12, background: "var(--gridline)", borderRadius: 7, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.max((r.g / max) * 100, 2)}%`, background: r.highlight ? "var(--series-es)" : "var(--series-other)", borderRadius: 7 }} />
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}

function InstagramOffices() {
  const rows = SALES_OFFICES.map((o) => ({ ...o, abs: o.ig11 - o.ig08, g: ((o.ig11 - o.ig08) / o.ig08) * 100 })).sort((a, b) => b.g - a.g);
  const max = Math.max(...rows.map((r) => r.g));
  const best = rows[0];
  const second = rows[1];
  return (
    <section style={{ ...card, background: "linear-gradient(135deg, var(--surface-1), color-mix(in srgb, var(--series-es) 7%, var(--surface-1)))" }}>
      <div style={eyebrow}>Instagram · crecimiento frente a otras oficinas de Shimano · agosto a noviembre 2026</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "8px 0 14px" }}>
        <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.03em", color: "var(--series-es)", lineHeight: 1 }}>+{pct(best.g)}</span>
        <span style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 520 }}>
          Iberia suma {fmt(best.abs)} seguidores en Instagram en tres meses. La siguiente oficina crece {pct(second.g)}.
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.name} style={{ display: "grid", gridTemplateColumns: "84px 1fr 130px", gap: 10, alignItems: "center", fontSize: 13 }}>
            <span style={{ fontWeight: r.highlight ? 800 : 500 }}>{r.name}</span>
            <span style={{ display: "block", height: 14, background: "var(--gridline)", borderRadius: 7, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.max((r.g / max) * 100, 1.5)}%`, background: r.highlight ? "var(--series-es)" : "var(--series-other)", borderRadius: 7 }} />
            </span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: r.highlight ? 700 : 400 }}>+{pct(r.g)} · +{fmt(r.abs)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Targets() {
  return (
    <Block title="Objetivos 2026 · octubre frente a objetivo" sub="Las cinco comunidades superan el objetivo original del año y el ampliado.">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {TARGETS.map((t) => {
          const scale = Math.max(t.oct, t.newTarget, t.target) * 1.04;
          const w = (v: number) => `${(v / scale) * 100}%`;
          return (
            <div key={t.name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5, gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(t.oct)} · {pct((t.oct / t.target) * 100, 0)} / {pct((t.oct / t.newTarget) * 100, 0)}
                </span>
              </div>
              <span style={{ position: "relative", display: "block", height: 12, background: "var(--gridline)", borderRadius: 6 }}>
                <span style={{ position: "absolute", inset: 0, width: w(t.oct), background: "var(--series-es)", borderRadius: 6 }} />
                <span title="Objetivo original" style={{ position: "absolute", top: -3, bottom: -3, left: w(t.target), width: 2, background: "var(--text-muted)" }} />
                <span title="Objetivo ampliado" style={{ position: "absolute", top: -3, bottom: -3, left: w(t.newTarget), width: 2, background: "var(--text-primary)" }} />
              </span>
            </div>
          );
        })}
      </div>
      <p style={note}>Marca gris: objetivo original. Marca negra: objetivo ampliado. Sobre cada barra: seguidores y % de cada objetivo.</p>
    </Block>
  );
}

export function CompetenciaView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <InstagramOffices />
      <Label>Evolución frente a la competencia</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <LineCompare series={COMP_IG} title="Instagram España" sub="Seguidores de las marcas del segmento, marzo a octubre 2026." />
        <LineCompare series={COMP_YT} title="YouTube" sub="Suscriptores de los canales de pesca en español." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <GrowthTable series={COMP_IG} from={2} to={3} label="Instagram · agosto a octubre" />
        <GrowthTable series={COMP_YT} from={2} to={3} label="YouTube · agosto a octubre" />
      </div>
      <Offices />
      <Targets />
      <p style={note}>
        Fuente: informe interno de Marketing de Shimano «MKT SSPF: Update Nov.26» (6 nov 2026). Son cifras públicas de las
        cuentas anotadas por el equipo en cada fecha, no un seguimiento diario. Los huecos indican que esa marca aún no se
        medía.
      </p>
    </div>
  );
}

/* ---------------------------- ESCUCHA SOCIAL ---------------------------- */

const LISTENING: Array<{ title: string; text: string; state: string; icon: string }> = [
  { title: "Técnicas en crecimiento", icon: "M3 17l6-6 4 4 8-8M14 7h7v7", text: "Menciones de surfcasting, carpfishing, jigging, spinning, egging o lubina, con la variación mensual de cada una.", state: "Con datos propios activos" },
  { title: "Especies más mencionadas", icon: "M2 12c3-5 7-7 12-7 3 0 6 2 8 7-2 5-5 7-8 7-5 0-9-2-12-7zM17 12h.01", text: "Qué especies concentran la conversación cada mes y en qué zona de la península y las islas.", state: "Con datos propios activos" },
  { title: "Tendencias regionales", icon: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z", text: "Zonas donde sube una técnica o especie (Canarias, Madeira, Azores), para decidir qué vídeo grabar y dónde activar campaña.", state: "Diseño listo" },
  { title: "Competencia en abierto", icon: "M12 3l9 4.5v5c0 4.5-3.5 7.5-9 9.5-5.5-2-9-5-9-9.5v-5L12 3z", text: "Qué publican Daiwa, Fox, Hart y los canales de referencia: formatos, frecuencia y piezas con más respuesta.", state: "Diseño listo" },
  { title: "Contenido generado por la comunidad", icon: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8", text: "Publicaciones que etiquetan a Shimano, clasificadas por especie, país y producto.", state: "Diseño listo" },
  { title: "Clasificación de comentarios", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", text: "Preguntas técnicas, de producto, de precio y de soporte para detectar dudas recurrentes y temas de próximos vídeos.", state: "Diseño listo" },
];

export function EscuchaView({ ownAnalysis }: { ownAnalysis: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Label>Escucha social</Label>
      <Block title="Qué vigila este módulo" sub="Para decidir qué grabar antes que la competencia y dónde activar campaña.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {LISTENING.map((l) => (
            <div key={l.title} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "16px 16px 14px", background: "var(--surface-1)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: l.state.startsWith("Con") ? "color-mix(in srgb, var(--series-es) 14%, transparent)" : "var(--gridline)", color: l.state.startsWith("Con") ? "var(--series-es)" : "var(--text-secondary)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={l.icon} />
                  </svg>
                </span>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{l.title}</div>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>{l.text}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: l.state.startsWith("Con") ? "var(--success)" : "var(--text-muted)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: l.state.startsWith("Con") ? "var(--success)" : "var(--series-other)" }} />
                {l.state}
              </span>
            </div>
          ))}
        </div>
      </Block>
      <div>
        <button onClick={() => setOpen((o) => !o)} style={{ ...eyebrow, background: "none", border: 0, cursor: "pointer", padding: 0, marginBottom: 8 }}>
          {open ? "▾" : "▸"} Lo que dicen las publicaciones de Shimano
        </button>
        {open && ownAnalysis}
      </div>
    </div>
  );
}
