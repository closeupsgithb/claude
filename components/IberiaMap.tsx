"use client";

import { useState } from "react";
import { AUDIENCE, AUDIENCE_AS_OF, COUNTRY_NAMES, REGION_SHARES } from "@/lib/audienceData";
import { MAP_H, MAP_REGIONS, MAP_W } from "@/lib/mapPaths";

const pct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;

type NetId = keyof typeof AUDIENCE;
const NETS: Array<{ id: NetId; label: string }> = [
  { id: "ig-es", label: "Instagram España" },
  { id: "ig-pt", label: "Instagram Portugal" },
  { id: "yt-es", label: "YouTube" },
  { id: "fb-es", label: "Facebook España" },
];

export function IberiaMap({ compact = false }: { compact?: boolean }) {
  const [net, setNet] = useState<NetId>("ig-es");
  const [hover, setHover] = useState<string | null>(null);
  const a = AUDIENCE[net];
  const share = (code: string) => a.rows.find((r) => r.code === code)?.share ?? 0;
  const es = share("ES"), pt = share("PT");
  const rest = Math.max(0, 100 - es - pt);
  const peak = Math.max(es, pt, 1);
  const regional = REGION_SHARES[net]; // solo existe si hay datos reales por comunidad
  const others = a.rows.filter((r) => r.code !== "ES" && r.code !== "PT").slice(0, 6);

  const valueOf = (r: (typeof MAP_REGIONS)[number]) => {
    if (regional && regional[r.id] != null) return regional[r.id];
    return r.country === "ES" ? es : pt;
  };
  const hovered = MAP_REGIONS.find((r) => r.id === hover);

  return (
    <section className="iberia-map">
      <style>{`
        .iberia-map{background:linear-gradient(160deg,var(--surface-1),var(--surface-2,var(--surface-1)));border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:var(--card-shadow)}
        .iberia-map .im-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:center}
        .iberia-map .im-pills{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
        .iberia-map .im-pill{border:1px solid var(--border);background:var(--surface-1);color:var(--text-secondary);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s}
        .iberia-map .im-pill[aria-pressed="true"]{background:var(--text-primary);color:var(--surface-1);border-color:var(--text-primary)}
        .iberia-map path{transition:fill-opacity .2s, stroke .15s}
        .iberia-map .im-reg{cursor:pointer}
        .iberia-map .im-reg:hover{stroke:var(--text-primary);stroke-width:1.4}
        .iberia-map .im-kpi{display:flex;gap:12px;flex-wrap:wrap}
        .iberia-map .im-kpi>div{flex:1 1 120px;border-radius:12px;padding:12px 14px;border:1px solid var(--border);background:var(--surface-1)}
        .iberia-map .im-big{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.05;font-variant-numeric:tabular-nums}
        @media (max-width:760px){.iberia-map .im-grid{grid-template-columns:1fr}}
      `}</style>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        Mapa de audiencia · península ibérica
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0" }}>
        Intensidad = peso del país en los seguidores de cada red. Metricool, {AUDIENCE_AS_OF}.
      </p>
      <div className="im-pills" role="group" aria-label="Red social">
        {NETS.map((n) => (
          <button key={n.id} className="im-pill" aria-pressed={net === n.id} onClick={() => setNet(n.id)}>{n.label}</button>
        ))}
      </div>

      <div className="im-grid">
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Mapa de España y Portugal con la audiencia de ${a.label}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="im-sea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--series-other)" stopOpacity=".10" />
                <stop offset="1" stopColor="var(--series-other)" stopOpacity=".02" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={MAP_W} height={MAP_H} rx="14" fill="url(#im-sea)" />
            {MAP_REGIONS.filter((r) => !r.inset).map((r) => {
              const v = valueOf(r);
              const color = r.country === "ES" ? "var(--series-es)" : "var(--series-pt)";
              return (
                <path key={r.id} className="im-reg" d={r.d} fill={color}
                  fillOpacity={0.1 + 0.88 * (v / peak)} stroke="var(--surface-1)" strokeWidth={0.9} strokeLinejoin="round"
                  onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} onClick={() => setHover(r.id)}>
                  <title>{`${r.name}: ${pct(v)} (${r.country === "ES" ? "España" : "Portugal"})`}</title>
                </path>
              );
            })}
            {/* Canarias en recuadro */}
            <g transform={`translate(18 ${MAP_H - 92})`}>
              <rect x="-6" y="-8" width="162" height="78" rx="8" fill="var(--surface-1)" fillOpacity=".7" stroke="var(--border)" />
              {MAP_REGIONS.filter((r) => r.inset).map((r) => (
                <path key={r.id} className="im-reg" d={r.d} fill="var(--series-es)" fillOpacity={0.1 + 0.88 * (valueOf(r) / peak)}
                  stroke="var(--surface-1)" strokeWidth={0.8} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}>
                  <title>{`${r.name}: ${pct(valueOf(r))} (España)`}</title>
                </path>
              ))}
            </g>
          </svg>
          <div style={{ position: "absolute", top: 14, left: 14, fontSize: 12.5, fontWeight: 700, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", minWidth: 150 }}>
            {hovered ? (
              <>
                {hovered.name}
                <div style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                  {hovered.country === "ES" ? "España" : "Portugal"} · {pct(valueOf(hovered))}{regional ? "" : " del total"}
                </div>
              </>
            ) : (
              <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>Pasa el cursor por el mapa</span>
            )}
          </div>
        </div>

        <div>
          <div className="im-kpi">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>España</div>
              <div className="im-big" style={{ color: "var(--series-es)" }}>{pct(es, es >= 10 ? 0 : 1)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Portugal</div>
              <div className="im-big" style={{ color: "var(--series-pt)" }}>{pct(pt, pt >= 10 ? 0 : 1)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Resto</div>
              <div className="im-big" style={{ color: "var(--text-secondary)" }}>{pct(rest, 0)}</div>
            </div>
          </div>
          {!compact && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Otros países · {a.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {others.map((r) => (
                  <span key={r.code} style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "4px 11px", fontSize: 12.5, background: "var(--surface-1)" }}>
                    {COUNTRY_NAMES[r.code] ?? r.code} <b style={{ fontVariantNumeric: "tabular-nums" }}>{pct(r.share)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "16px 0 0" }}>
            {regional
              ? "Intensidad por comunidad autónoma y distrito."
              : "Metricool entrega el reparto por país, no por comunidad: cada país se muestra con una sola intensidad. El desglose por comunidad se activará con la fuente de ciudades de Instagram."}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11.5, color: "var(--text-muted)" }}>
            <span>Menos</span>
            <span style={{ flex: "0 1 140px", height: 8, borderRadius: 4, background: "linear-gradient(90deg, color-mix(in srgb, var(--series-es) 10%, transparent), var(--series-es))" }} />
            <span>Más</span>
          </div>
        </div>
      </div>
    </section>
  );
}
