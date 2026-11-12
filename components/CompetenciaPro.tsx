"use client";

import { COMP_IG, COMP_PERIODS, COMP_YT, SALES_OFFICES, TARGETS, type Series } from "@/lib/audienceData";

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} mil` : String(n));
const growth = (a: number | null, b: number | null) => (a && b ? ((b - a) / a) * 100 : null);

const CSS = `
.cp{display:flex;flex-direction:column;gap:22px}
.cp-hero{border-radius:20px;padding:26px 28px;color:#fff;background:linear-gradient(135deg,#1b0610 0%,#7d0b23 45%,#cc1236 100%);position:relative;overflow:hidden}
.cp-hero:before{content:"";position:absolute;right:-70px;bottom:-90px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.07)}
.cp-hero:after{content:"";position:absolute;right:110px;top:-80px;width:180px;height:180px;border-radius:50%;background:rgba(0,152,216,.28)}
.cp-hero h2{margin:6px 0 4px;font-size:27px;letter-spacing:-.01em;max-width:640px;text-wrap:balance;position:relative}
.cp-hero p{margin:0;font-size:14px;opacity:.9;max-width:600px;position:relative}
.cp-kpis{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;position:relative}
.cp-kpi{flex:1 1 200px;max-width:300px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 18px}
.cp-kpi b{display:block;font-size:30px;line-height:1.05;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.cp-kpi span{font-size:11px;letter-spacing:.05em;text-transform:uppercase;opacity:.88}
.cp-card{background:var(--surface-1);border:1px solid var(--border);border-radius:16px;padding:18px 20px;box-shadow:var(--card-shadow)}
.cp-eye{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
.cp-sub{font-size:13px;color:var(--text-secondary);margin:4px 0 14px}
.cp-rank{display:grid;grid-template-columns:34px 86px 1fr 150px;gap:12px;align-items:center;padding:7px 0}
.cp-medal{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;background:var(--gridline);color:var(--text-secondary)}
.cp-medal.first{background:linear-gradient(135deg,#ffd45c,#f5802f);color:#4a2100}
.cp-track{height:18px;border-radius:9px;background:var(--gridline);overflow:hidden}
.cp-track i{display:block;height:100%;border-radius:9px}
.cp-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px}
.cp-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
.cp-chip.up{background:color-mix(in srgb,var(--success) 14%,transparent);color:var(--success)}
.cp-chip.flat{background:var(--gridline);color:var(--text-secondary)}
.cp-board{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.cp-board div{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;background:var(--surface-1)}
.cp-board div.me{border-color:var(--series-es);background:color-mix(in srgb,var(--series-es) 8%,var(--surface-1))}
.cp-stack{display:flex;height:22px;border-radius:11px;overflow:hidden;background:var(--gridline)}
.cp-rings{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.cp-ring{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;border:1px solid var(--border);border-radius:16px;padding:16px 10px;background:var(--surface-1)}
@media (max-width:640px){.cp-rank{grid-template-columns:30px 70px 1fr}.cp-rank .cp-val{grid-column:2/-1}.cp-hero{padding:20px}.cp-two{grid-template-columns:1fr}}
`;

function Trend({ series, title, sub }: { series: Series[]; title: string; sub: string }) {
  const W = 640, H = 270, L = 44, R = 170, T = 16, B = 30;
  const maxV = Math.max(...series.flatMap((s) => s.values.filter((v): v is number => v !== null))) * 1.12;
  const x = (i: number) => L + (i * (W - L - R)) / (COMP_PERIODS.length - 1);
  const y = (v: number) => T + (1 - v / maxV) * (H - T - B);
  const step = maxV > 30000 ? 10000 : 5000;
  const ticks: number[] = [];
  for (let t = 0; t <= maxV; t += step) ticks.push(t);
  // etiquetas finales sin solaparse
  const ends = series
    .map((s, si) => { const idx = s.values.map((v) => v !== null).lastIndexOf(true); return { si, v: s.values[idx] as number, idx, y: y(s.values[idx] as number) }; })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  const lab = new Map(ends.map((e) => [e.si, e.y]));
  const gid = `g-${title.replace(/\W/g, "")}`;
  return (
    <div className="cp-card">
      <div className="cp-eye">{title}</div>
      <p className="cp-sub">{sub}</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={title}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series-es)" stopOpacity=".32" />
            <stop offset="1" stopColor="var(--series-es)" stopOpacity="0" />
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
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p !== null);
          if (!pts.length) return null;
          const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
          const hl = !!s.highlight;
          const last = pts[pts.length - 1];
          const lastVal = s.values.filter((v): v is number => v !== null).slice(-1)[0];
          return (
            <g key={s.name}>
              {hl && <path d={`${d} L${last[0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill={`url(#${gid})`} />}
              <path d={d} fill="none" stroke={hl ? "var(--series-es)" : "var(--series-other)"} strokeWidth={hl ? 3.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" opacity={hl ? 1 : 0.85} />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hl ? 4 : 2.6} fill="var(--surface-1)" stroke={hl ? "var(--series-es)" : "var(--series-other)"} strokeWidth={hl ? 2.4 : 1.6} />)}
              <text x={last[0] + 10} y={(lab.get(si) ?? last[1]) + 4} fontSize={hl ? 12.5 : 11} fontWeight={hl ? 800 : 500} fill={hl ? "var(--series-es)" : "var(--text-secondary)"}>
                {s.name.replace(" España", "").replace(" Int.", "")} {k(lastVal)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Leaderboard({ series, from, to }: { series: Series[]; from: number; to: number }) {
  const rows = series
    .map((s) => ({ name: s.name, hl: !!s.highlight, a: s.values[from], b: s.values[to], g: growth(s.values[from], s.values[to]) }))
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

function Ring({ value, label, caption }: { value: number; label: string; caption: string }) {
  const r = 38, c = 2 * Math.PI * r, MAX = 250;
  const base = (Math.min(value, 100) / MAX) * c;
  const extra = (Math.max(value - 100, 0) / MAX) * c;
  const tickAng = (100 / MAX) * 360 - 90;
  return (
    <div className="cp-ring">
      <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={`${label}: ${pct(value, 0)}`}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--gridline)" strokeWidth="10" />
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--series-es)" strokeWidth="10" strokeDasharray={`${base} ${c}`} transform="rotate(-90 52 52)" />
        {extra > 0 && <circle cx="52" cy="52" r={r} fill="none" stroke="var(--success)" strokeWidth="10" strokeDasharray={`${extra} ${c}`} strokeDashoffset={-base} transform="rotate(-90 52 52)" />}
        <line x1="52" y1="9" x2="52" y2="21" stroke="var(--text-primary)" strokeWidth="2" transform={`rotate(${tickAng + 90} 52 52)`} />
        <text x="52" y="57" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text-primary)">{pct(value, 0)}</text>
      </svg>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{caption}</div>
    </div>
  );
}

export default function CompetenciaPro() {
  const offices = SALES_OFFICES.map((o) => ({
    ...o, c08: o.ig08 + o.yt08, c11: o.ig11 + o.yt11,
    gIg: growth(o.ig08, o.ig11) as number, gTot: growth(o.ig08 + o.yt08, o.ig11 + o.yt11) as number,
  }));
  const byIg = [...offices].sort((a, b) => b.gIg - a.gIg);
  const byTot = [...offices].sort((a, b) => b.gTot - a.gTot);
  const maxIg = byIg[0].gIg;
  const iberia = offices.find((o) => o.highlight)!;
  const rankComm = [...offices].sort((a, b) => b.c11 - a.c11).findIndex((o) => o.highlight) + 1;
  const igBrands = COMP_IG[0].values;
  const gBrand = growth(igBrands[2], igBrands[3]) as number;
  const maxC = Math.max(...offices.map((o) => o.c11));

  return (
    <div className="cp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section className="cp-hero">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85, position: "relative" }}>Competencia</div>
        <h2>Dónde estamos frente al mercado y hacia dónde conviene empujar</h2>
        <p>Marcas del segmento, otras oficinas de Shimano y objetivos del año en una sola vista.</p>
        <div className="cp-kpis">
          <div className="cp-kpi"><b>+{pct(iberia.gIg)}</b><span>Instagram frente a otras oficinas</span></div>
          <div className="cp-kpi"><b>+{pct(gBrand)}</b><span>Instagram frente a las marcas</span></div>
          <div className="cp-kpi"><b>{rankComm}ª</b><span>mayor comunidad de Europa</span></div>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-eye">Instagram · crecimiento por oficina · agosto a noviembre 2026</div>
        <p className="cp-sub">Seguidores nuevos y variación sobre agosto.</p>
        {byIg.map((o, i) => (
          <div key={o.name} className="cp-rank">
            <span className={`cp-medal ${i === 0 ? "first" : ""}`}>{i + 1}</span>
            <span style={{ fontWeight: o.highlight ? 800 : 500, fontSize: 14 }}>{o.name}</span>
            <span className="cp-track"><i style={{ width: `${Math.max((o.gIg / maxIg) * 100, 2)}%`, background: o.highlight ? "linear-gradient(90deg,var(--series-es),#52c1ec)" : "var(--series-other)" }} /></span>
            <span className="cp-val" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
              <b style={{ color: o.highlight ? "var(--series-es)" : "inherit" }}>+{pct(o.gIg)}</b> <span style={{ color: "var(--text-muted)" }}>· +{fmt(o.ig11 - o.ig08)}</span>
            </span>
          </div>
        ))}
      </section>

      <div className="cp-two">
        <div>
          <Trend series={COMP_IG} title="Instagram España · marcas del segmento" sub="Seguidores de marzo a octubre de 2026." />
          <Leaderboard series={COMP_IG} from={2} to={3} />
        </div>
        <div>
          <Trend series={COMP_YT} title="YouTube · canales de pesca en español" sub="Suscriptores de marzo a octubre de 2026." />
          <Leaderboard series={COMP_YT} from={2} to={3} />
        </div>
      </div>

      <section className="cp-card">
        <div className="cp-eye">Comunidad total por oficina · Instagram + YouTube</div>
        <p className="cp-sub">Tamaño en noviembre y crecimiento desde agosto.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byTot.map((o) => (
            <div key={o.name} style={{ display: "grid", gridTemplateColumns: "84px 1fr 120px", gap: 12, alignItems: "center", fontSize: 13 }}>
              <span style={{ fontWeight: o.highlight ? 800 : 500 }}>{o.name}</span>
              <span style={{ display: "block", width: `${Math.max((o.c11 / maxC) * 100, 3)}%` }}>
                <span className="cp-stack">
                  <i style={{ width: `${(o.ig11 / o.c11) * 100}%`, background: "var(--brand-instagram, #cc1236)" }} />
                  <i style={{ width: `${(o.yt11 / o.c11) * 100}%`, background: "var(--brand-youtube, #d92020)", opacity: 0.55 }} />
                </span>
              </span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {k(o.c11)} <span className={`cp-chip ${o.highlight ? "up" : "flat"}`}>+{pct(o.gTot)}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--brand-instagram, #cc1236)", marginRight: 6 }} />Instagram</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--brand-youtube, #d92020)", opacity: 0.55, marginRight: 6 }} />YouTube</span>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-eye">Objetivos 2026 · octubre frente al objetivo ampliado</div>
        <p className="cp-sub">Marca negra: objetivo ampliado (100 %). En verde, lo que se supera por encima.</p>
        <div className="cp-rings">
          {TARGETS.map((t) => (
            <Ring key={t.name} value={(t.oct / t.newTarget) * 100} label={t.name} caption={`${fmt(t.oct)} · ${pct((t.oct / t.target) * 100, 0)} del objetivo original`} />
          ))}
        </div>
      </section>
    </div>
  );
}
