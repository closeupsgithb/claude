"use client";

import { useState } from "react";
import { COMP_IG, COMP_PERIODS, COMP_YT, SALES_OFFICES, TARGETS, type Series } from "@/lib/audienceData";

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} mil` : String(n));
const growth = (a: number | null, b: number | null) => (a && b ? ((b - a) / a) * 100 : null);

type Plat = "instagram" | "youtube";
const BRAND: Record<Plat, { label: string; color: string; grad: string }> = {
  instagram: { label: "Instagram", color: "var(--brand-instagram, #e1306c)", grad: "linear-gradient(135deg,#833ab4,#e1306c 55%,#f77737)" },
  youtube: { label: "YouTube", color: "var(--brand-youtube, #d92020)", grad: "linear-gradient(135deg,#7a0c0c,#d92020 60%,#ff5a4f)" },
};
const TARGET_PLAT: Record<string, "instagram" | "facebook" | "youtube"> = {
  "Instagram España": "instagram", "Instagram Portugal": "instagram", "Facebook España": "facebook", "Facebook Portugal": "facebook", YouTube: "youtube",
};
const PLAT_COLOR = { instagram: "var(--brand-instagram, #e1306c)", facebook: "var(--brand-facebook, #1877f2)", youtube: "var(--brand-youtube, #d92020)" };

const CSS = `
.cp{display:flex;flex-direction:column;gap:20px}
.cp-pills{display:flex;gap:10px;flex-wrap:wrap}
.cp-pill{border:1.5px solid var(--c);background:var(--surface-1);color:var(--c);border-radius:999px;padding:9px 22px;font:700 14px inherit;cursor:pointer;transition:all .15s}
.cp-pill[aria-pressed="true"]{background:var(--c);color:#fff;box-shadow:0 8px 20px -10px var(--c)}
.cp-hero{border-radius:18px;padding:24px 26px;color:#fff;background:linear-gradient(135deg,#0c1a2a 0%,#13324f 100%);position:relative;overflow:hidden}
.cp-hero:before{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--grad)}
.cp-hero h2{margin:6px 0 4px;font-size:26px;letter-spacing:-.01em;max-width:680px;text-wrap:balance}
.cp-hero p{margin:0;font-size:14px;opacity:.88;max-width:620px}
.cp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:18px}
.cp-kpi{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 18px}
.cp-kpi b{display:block;font-size:30px;line-height:1.05;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.cp-kpi span{font-size:11px;letter-spacing:.05em;text-transform:uppercase;opacity:.85}
.cp-card{background:var(--surface-1);border:1px solid var(--border);border-radius:16px;padding:18px 20px;box-shadow:var(--card-shadow)}
.cp-eye{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
.cp-sub{font-size:13px;color:var(--text-secondary);margin:4px 0 14px}
.cp-rank{display:grid;grid-template-columns:34px 86px 1fr 150px;gap:12px;align-items:center;padding:7px 0}
.cp-medal{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;background:var(--gridline);color:var(--text-secondary)}
.cp-medal.first{background:var(--c);color:#fff}
.cp-track{height:18px;border-radius:9px;background:var(--gridline);overflow:hidden}
.cp-track i{display:block;height:100%;border-radius:9px}
.cp-split{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:center}
.cp-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
.cp-chip.up{background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}
.cp-chip.flat{background:var(--gridline);color:var(--text-secondary)}
.cp-board{display:flex;flex-direction:column;gap:8px}
.cp-board div{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;background:var(--surface-1)}
.cp-board div.me{border-color:var(--c);background:color-mix(in srgb,var(--c) 9%,var(--surface-1))}
.cp-stack{display:flex;height:22px;border-radius:11px;overflow:hidden;background:var(--gridline)}
.cp-rings{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.cp-ring{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;border:1px solid var(--border);border-radius:16px;padding:16px 10px;background:var(--surface-1)}
@media (max-width:760px){.cp-rank{grid-template-columns:30px 70px 1fr}.cp-rank .cp-val{grid-column:2/-1}.cp-hero{padding:20px}.cp-split{grid-template-columns:1fr}}
`;

function Trend({ series, color }: { series: Series[]; color: string }) {
  const W = 640, H = 270, L = 44, R = 170, T = 16, B = 30;
  const maxV = Math.max(...series.flatMap((s) => s.values.filter((v): v is number => v !== null))) * 1.12;
  const x = (i: number) => L + (i * (W - L - R)) / (COMP_PERIODS.length - 1);
  const y = (v: number) => T + (1 - v / maxV) * (H - T - B);
  const step = maxV > 30000 ? 10000 : 5000;
  const ticks: number[] = [];
  for (let t = 0; t <= maxV; t += step) ticks.push(t);
  const ends = series
    .map((s, si) => { const idx = s.values.map((v) => v !== null).lastIndexOf(true); return { si, y: y(s.values[idx] as number) }; })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  const lab = new Map(ends.map((e) => [e.si, e.y]));
  const gid = `g-${series[0].name.replace(/\W/g, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Evolución de seguidores">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R + 6} y1={y(t)} y2={y(t)} stroke="var(--gridline)" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{t === 0 ? "0" : `${t / 1000}k`}</text>
        </g>
      ))}
      {COMP_PERIODS.map((p, i) => (
        <text key={p} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{p.replace(" 2026", "")}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const))).filter((p): p is readonly [number, number] => p !== null);
        if (!pts.length) return null;
        const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        const hl = !!s.highlight;
        const last = pts[pts.length - 1];
        const lastVal = s.values.filter((v): v is number => v !== null).slice(-1)[0];
        return (
          <g key={s.name}>
            {hl && <path d={`${d} L${last[0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill={`url(#${gid})`} />}
            <path d={d} fill="none" stroke={hl ? color : "var(--series-other)"} strokeWidth={hl ? 3.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" opacity={hl ? 1 : 0.85} />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hl ? 4 : 2.6} fill="var(--surface-1)" stroke={hl ? color : "var(--series-other)"} strokeWidth={hl ? 2.4 : 1.6} />)}
            <text x={last[0] + 10} y={(lab.get(si) ?? last[1]) + 4} fontSize={hl ? 12.5 : 11} fontWeight={hl ? 800 : 500} fill={hl ? color : "var(--text-secondary)"}>
              {s.name.replace(" España", "").replace(" Int.", "")} {k(lastVal)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Leaderboard({ series }: { series: Series[] }) {
  const rows = series
    .map((s) => ({ name: s.name, hl: !!s.highlight, b: s.values[3], g: growth(s.values[2], s.values[3]) }))
    .filter((r) => r.g !== null)
    .sort((a, b) => (b.g as number) - (a.g as number));
  return (
    <div className="cp-board">
      {rows.map((r) => (
        <div key={r.name} className={r.hl ? "me" : ""}>
          <span style={{ fontWeight: r.hl ? 800 : 500 }}>{r.name}</span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{k(r.b as number)}</span>
            <span className={`cp-chip ${r.hl ? "up" : "flat"}`}>▲ {pct(r.g as number)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Ring({ value, label, caption, color }: { value: number; label: string; caption: string; color: string }) {
  const r = 38, c = 2 * Math.PI * r, MAX = 250;
  const base = (Math.min(value, 100) / MAX) * c;
  const extra = (Math.max(value - 100, 0) / MAX) * c;
  const tickAng = (100 / MAX) * 360 - 90;
  return (
    <div className="cp-ring">
      <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={`${label}: ${pct(value, 0)}`}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--gridline)" strokeWidth="10" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${base} ${c}`} transform="rotate(-90 52 52)" />
        {extra > 0 && <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeOpacity=".55" strokeWidth="10" strokeDasharray={`${extra} ${c}`} strokeDashoffset={-base} transform="rotate(-90 52 52)" />}
        <line x1="52" y1="9" x2="52" y2="21" stroke="var(--text-primary)" strokeWidth="2" transform={`rotate(${tickAng + 90} 52 52)`} />
        <text x="52" y="57" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text-primary)">{pct(value, 0)}</text>
      </svg>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{caption}</div>
    </div>
  );
}

export default function CompetenciaPro() {
  const [plat, setPlat] = useState<Plat>("instagram");
  const b = BRAND[plat];
  const offices = SALES_OFFICES.map((o) => ({
    ...o, c08: o.ig08 + o.yt08, c11: o.ig11 + o.yt11,
    gIg: growth(o.ig08, o.ig11) as number, gYt: growth(o.yt08 || null, o.yt11 || null),
    gTot: growth(o.ig08 + o.yt08, o.ig11 + o.yt11) as number,
  }));
  const val = (o: (typeof offices)[number]) => (plat === "instagram" ? o.gIg : o.gYt);
  const abs = (o: (typeof offices)[number]) => (plat === "instagram" ? o.ig11 - o.ig08 : o.yt11 - o.yt08);
  const ranked = offices.filter((o) => val(o) !== null).sort((x, y) => (val(y) as number) - (val(x) as number));
  const maxG = val(ranked[0]) as number;
  const iberia = offices.find((o) => o.highlight)!;
  const byTot = [...offices].sort((x, y) => y.gTot - x.gTot);
  const rankComm = [...offices].sort((x, y) => y.c11 - x.c11).findIndex((o) => o.highlight) + 1;
  const series = plat === "instagram" ? COMP_IG : COMP_YT;
  const own = series[0].values;
  const gBrand = growth(own[2], own[3]) as number;
  const maxC = Math.max(...offices.map((o) => o.c11));
  const iberiaRank = ranked.findIndex((o) => o.highlight) + 1;

  const kpis = plat === "instagram"
    ? [[`+${pct(iberia.gIg)}`, "Instagram frente a otras oficinas"], [`+${pct(gBrand)}`, "Instagram frente a las marcas del segmento"], [`${rankComm}ª`, "mayor comunidad de Europa"]]
    : [[`+${pct(iberia.gYt as number)}`, "YouTube desde agosto"], [`+${pct(gBrand)}`, "YouTube frente a otros canales de pesca"], [`${k(iberia.yt11)}`, "suscriptores en noviembre"]];

  return (
    <div className="cp" style={{ ["--c" as string]: b.color, ["--grad" as string]: b.grad }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="cp-pills" role="group" aria-label="Plataforma">
        {(Object.keys(BRAND) as Plat[]).map((p) => (
          <button key={p} className="cp-pill" style={{ ["--c" as string]: BRAND[p].color }} aria-pressed={plat === p} onClick={() => setPlat(p)}>{BRAND[p].label}</button>
        ))}
      </div>

      <section className="cp-hero">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85 }}>Competencia · {b.label}</div>
        <h2>Dónde estamos frente al mercado y hacia dónde conviene empujar</h2>
        <p>Marcas del segmento, otras oficinas de Shimano y objetivos del año.</p>
        <div className="cp-kpis">
          {kpis.map(([v, l]) => <div key={l} className="cp-kpi"><b>{v}</b><span>{l}</span></div>)}
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-eye">{b.label} · crecimiento por oficina · agosto a noviembre 2026</div>
        <p className="cp-sub">{plat === "instagram" ? "Seguidores nuevos y variación sobre agosto." : "Suscriptores nuevos y variación sobre agosto."}</p>
        {ranked.map((o, i) => (
          <div key={o.name} className="cp-rank">
            <span className={`cp-medal ${i === 0 ? "first" : ""}`}>{i + 1}</span>
            <span style={{ fontWeight: o.highlight ? 800 : 500, fontSize: 14 }}>{o.name}</span>
            <span className="cp-track"><i style={{ width: `${Math.max(((val(o) as number) / maxG) * 100, 2)}%`, background: o.highlight ? b.grad : "var(--series-other)" }} /></span>
            <span className="cp-val" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
              <b style={{ color: o.highlight ? b.color : "inherit" }}>+{pct(val(o) as number)}</b> <span style={{ color: "var(--text-muted)" }}>· +{fmt(abs(o))}</span>
            </span>
          </div>
        ))}
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>Iberia ocupa el puesto {iberiaRank} de {ranked.length} en {b.label}.</p>
      </section>

      <section className="cp-card">
        <div className="cp-eye">{b.label} · marcas del segmento · marzo a octubre 2026</div>
        <div className="cp-split" style={{ marginTop: 12 }}>
          <Trend series={series} color={b.color} />
          <Leaderboard series={series} />
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-eye">Comunidad total por oficina · Instagram + YouTube</div>
        <p className="cp-sub">Tamaño en noviembre y crecimiento desde agosto.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byTot.map((o) => (
            <div key={o.name} style={{ display: "grid", gridTemplateColumns: "84px 1fr 130px", gap: 12, alignItems: "center", fontSize: 13 }}>
              <span style={{ fontWeight: o.highlight ? 800 : 500 }}>{o.name}</span>
              <span style={{ display: "block", width: `${Math.max((o.c11 / maxC) * 100, 3)}%` }}>
                <span className="cp-stack">
                  <i style={{ width: `${(o.ig11 / o.c11) * 100}%`, background: BRAND.instagram.color }} />
                  <i style={{ width: `${(o.yt11 / o.c11) * 100}%`, background: BRAND.youtube.color, opacity: 0.8 }} />
                </span>
              </span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {k(o.c11)} <span className="cp-chip flat" style={o.highlight ? { background: "var(--text-primary)", color: "var(--surface-1)" } : undefined}>+{pct(o.gTot)}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: BRAND.instagram.color, marginRight: 6 }} />Instagram</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: BRAND.youtube.color, opacity: 0.8, marginRight: 6 }} />YouTube</span>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-eye">Objetivos 2026 · octubre frente al objetivo ampliado</div>
        <p className="cp-sub">La marca negra es el objetivo ampliado (100 %); el tramo más claro es lo que se supera por encima.</p>
        <div className="cp-rings">
          {TARGETS.map((t) => (
            <Ring key={t.name} color={PLAT_COLOR[TARGET_PLAT[t.name]]} value={(t.oct / t.newTarget) * 100} label={t.name} caption={`${fmt(t.oct)} · ${pct((t.oct / t.target) * 100, 0)} del objetivo original`} />
          ))}
        </div>
      </section>
    </div>
  );
}
