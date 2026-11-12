"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ContentItem } from "@/lib/metricool";
import { COMP_IG, COMP_YT } from "@/lib/audienceData";
import { IberiaMap } from "@/components/IberiaMap";

const pct = (n: number, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Tech = { id: string; label: string; pats: string[]; color: string; icon: string };
const TECHS: Tech[] = [
  { id: "surfcasting", label: "Surfcasting", pats: ["surfcasting", "surf casting"], color: "#0098d8", icon: "M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0M12 3v9M12 3l4 3" },
  { id: "carpfishing", label: "Carpfishing", pats: ["carpfishing", "carp fishing", "carp & roll", "carp and roll"], color: "#2f9e6b", icon: "M3 12c4-6 12-6 18 0-6 6-14 6-18 0zM16 12h.01" },
  { id: "spinning", label: "Spinning", pats: ["spinning"], color: "#7c5cdb", icon: "M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 3a9 9 0 109 9" },
  { id: "jigging", label: "Jigging", pats: ["jigging"], color: "#d9534f", icon: "M12 3v10a4 4 0 11-4-4" },
  { id: "eging", label: "Eging", pats: ["eging", "egging"], color: "#e08a1e", icon: "M12 3c4 0 6 3 6 6s-2 4-2 7H8c0-3-2-4-2-7s2-6 6-6zM9 20v1M12 20v1M15 20v1" },
  { id: "feeder", label: "Feeder", pats: ["feeder"], color: "#00929c", icon: "M5 8h14l-2 12H7zM9 8V5h6v3" },
  { id: "biggame", label: "Big Game", pats: ["big game", "biggame", "pesca de altura"], color: "#1d4f91", icon: "M12 3v15M7 13a5 8 0 0010 0M8 8h8" },
  { id: "currican", label: "Curricán", pats: ["curricán", "currican", "trolling"], color: "#b0489a", icon: "M3 12h14M17 8l4 4-4 4" },
  { id: "mosca", label: "Pesca a mosca", pats: ["fly fishing", "flyfishing", "pesca a mosca", "montaje de moscas"], color: "#6b8e23", icon: "M20 4C10 4 5 9 4 20c8-1 15-6 16-16zM4 20L14 10" },
];

const SPECIES = ["lubina", "dorada", "atún", "bonito", "black bass", "carpa", "calamar", "sepia", "pulpo", "trucha", "siluro", "sargo", "pargo", "dentón", "corvina", "robalo", "sável"];

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--card-shadow)" };
const eyebrow: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" };

type Row = { tech: Tech; items: ContentItem[]; avgEng: number | null; avgReach: number | null; interactions: number };

function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className="eh-tab">{children}</button>
  );
}

const TABS = [
  { id: "rend", label: "Rendimiento" },
  { id: "prod", label: "Producto y especies" },
  { id: "donde", label: "Dónde activar" },
  { id: "comp", label: "Competencia y comunidad" },
] as const;

export default function EscuchaHub({ items, ownAnalysis }: { items: ContentItem[]; ownAnalysis: ReactNode }) {
  const [sel, setSel] = useState<string>("all");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("rend");
  const [open, setOpen] = useState(false);

  const { rows, globalEng, withText } = useMemo(() => {
    const withText = items.filter((i) => i.content);
    const engs = items.map((i) => i.engagementRate).filter((v): v is number => v !== null);
    const rows: Row[] = TECHS.map((t) => {
      const its = withText.filter((i) => t.pats.some((p) => norm(i.content).includes(norm(p))));
      return {
        tech: t, items: its,
        avgEng: mean(its.map((i) => i.engagementRate).filter((v): v is number => v !== null)),
        avgReach: mean(its.map((i) => i.reach).filter((v): v is number => v !== null)),
        interactions: its.reduce((a, i) => a + i.interactions, 0),
      };
    });
    return { rows, globalEng: mean(engs) ?? 0, withText };
  }, [items]);

  const detected = rows.filter((r) => r.items.length > 0);
  const current: Row | null = sel === "all" ? null : rows.find((r) => r.tech.id === sel) ?? null;
  const scope = current ? current.items : items;
  const accent = current ? current.tech.color : "#0098d8";

  const top = [...scope].sort((a, b) => b.interactions - a.interactions).slice(0, 3);
  const scopeEng = current ? current.avgEng : globalEng;
  const delta = scopeEng !== null && globalEng > 0 ? ((scopeEng - globalEng) / globalEng) * 100 : null;

  const species = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of scope) {
      const n = norm(i.content ?? "");
      for (const s of SPECIES) if (n.includes(norm(s))) m.set(s, (m.get(s) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scope]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of scope) for (const t of (i.content ?? "").matchAll(/#(\w{4,})/g)) m.set(t[1], (m.get(t[1]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [scope]);

  const comp = [
    { name: "Daiwa España", s: COMP_IG[1] }, { name: "Fox Int. España", s: COMP_IG[2] }, { name: "Hart Fishing", s: COMP_IG[3] },
  ].map(({ name, s }) => {
    const v = s.values; const last = v[v.length - 1] ?? 0; const aug = v[2] ?? null;
    return { name, last, g: aug ? ((last - aug) / aug) * 100 : null };
  });
  const own = COMP_IG[0].values;
  const ownG = ((own[3]! - own[2]!) / own[2]!) * 100;

  return (
    <div className="eh">
      <style dangerouslySetInnerHTML={{ __html: `
        .eh{display:flex;flex-direction:column;gap:18px}
        .eh-hero{border-radius:18px;padding:22px 24px;color:#fff;background:linear-gradient(135deg,#06253d 0%,#0a4a78 55%,#0098d8 100%);position:relative;overflow:hidden}
        .eh-hero:after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.07)}
        .eh-kpis{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
        .eh-kpi{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 16px;min-width:130px}
        .eh-kpi b{display:block;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}
        .eh-kpi span{font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.85}
        .eh-techs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
        .eh-tech{display:flex;flex-direction:column;gap:6px;text-align:left;border:1.5px solid var(--border);background:var(--surface-1);color:var(--text-primary);border-radius:14px;padding:12px 14px;cursor:pointer;transition:transform .12s,box-shadow .12s,background .12s;font:inherit}
        .eh-tech:hover{transform:translateY(-2px);box-shadow:var(--card-shadow)}
        .eh-tech[aria-pressed="true"]{color:#fff;border-color:transparent;box-shadow:0 8px 22px -8px var(--c)}
        .eh-tech .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 15%,transparent);color:var(--c)}
        .eh-tech[aria-pressed="true"] .ic{background:rgba(255,255,255,.22);color:#fff}
        .eh-tech .n{font-weight:800;font-size:14.5px}
        .eh-tech .m{font-size:11.5px;opacity:.8;font-variant-numeric:tabular-nums}
        .eh-tabs{display:flex;gap:8px;flex-wrap:wrap}
        .eh-tab{border:1px solid var(--border);background:var(--surface-1);color:var(--text-secondary);border-radius:999px;padding:8px 16px;font:600 13px inherit;cursor:pointer}
        .eh-tab[aria-pressed="true"]{background:var(--text-primary);color:var(--surface-1);border-color:var(--text-primary)}
        .eh-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
        .eh-stat{border:1px solid var(--border);border-radius:12px;padding:14px 16px;background:var(--surface-1)}
        .eh-stat b{display:block;font-size:28px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
        .eh-chip{display:inline-flex;gap:6px;align-items:baseline;border:1px solid var(--border);background:var(--surface-1);border-radius:999px;padding:5px 12px;font-size:12.5px}
        .eh-post{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;border:1px solid var(--border);border-radius:12px;padding:10px;background:var(--surface-1);text-decoration:none;color:inherit}
        .eh-post img{width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--gridline)}
        .eh-soon{border:1.5px dashed var(--border);border-radius:12px;padding:14px 16px}
        .eh-btn{display:inline-block;margin-top:8px;border:0;background:var(--text-primary);color:var(--surface-1);border-radius:999px;padding:7px 14px;font:700 12px inherit;cursor:default;opacity:.9}
        @media (max-width:560px){.eh-hero{padding:18px}.eh-post{grid-template-columns:52px 1fr}.eh-post img{width:52px;height:52px}.eh-post .r{grid-column:1/-1}}
      ` }} />

      <section className="eh-hero">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85 }}>Escucha social</div>
        <h2 style={{ margin: "6px 0 4px", fontSize: 26, letterSpacing: "-.01em", textWrap: "balance" as CSSProperties["textWrap"] }}>Qué grabar antes que la competencia y dónde activar campaña</h2>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.9, maxWidth: 640 }}>
          Cada técnica con su rendimiento, sus productos y especies, sus zonas y la competencia que la trabaja.
        </p>
        <div className="eh-kpis">
          <div className="eh-kpi"><b>{withText.length}</b><span>Publicaciones analizadas</span></div>
          <div className="eh-kpi"><b>{detected.length}</b><span>Técnicas detectadas</span></div>
          <div className="eh-kpi"><b>{pct(globalEng)}</b><span>Interacción media</span></div>
        </div>
      </section>

      <div>
        <div style={{ ...eyebrow, marginBottom: 10 }}>Elige una técnica</div>
        <div className="eh-techs" role="group" aria-label="Técnica">
          <button className="eh-tech" aria-pressed={sel === "all"} onClick={() => setSel("all")} style={{ ["--c" as string]: "#0098d8", background: sel === "all" ? "linear-gradient(135deg,#0a4a78,#0098d8)" : undefined }}>
            <span className="ic"><Icon d="M4 6h16M4 12h16M4 18h16" /></span>
            <span className="n">Todas</span>
            <span className="m">{items.length} publicaciones</span>
          </button>
          {rows.map((r) => (
            <button key={r.tech.id} className="eh-tech" aria-pressed={sel === r.tech.id} onClick={() => setSel(r.tech.id)}
              style={{ ["--c" as string]: r.tech.color, background: sel === r.tech.id ? r.tech.color : undefined, opacity: r.items.length === 0 && sel !== r.tech.id ? 0.62 : 1 }}>
              <span className="ic"><Icon d={r.tech.icon} /></span>
              <span className="n">{r.tech.label}</span>
              <span className="m">{r.items.length ? `${r.items.length} pub. · ${r.avgEng !== null ? pct(r.avgEng) : "s/d"}` : "Sin publicaciones"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="eh-tabs" role="group" aria-label="Sección">
        {TABS.map((t) => <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Tab>)}
      </div>

      {tab === "rend" && (
        <section style={card}>
          <div style={{ ...eyebrow, color: accent }}>{current ? current.tech.label : "Todas las técnicas"} · periodo seleccionado</div>
          <div className="eh-grid3" style={{ marginTop: 12 }}>
            <div className="eh-stat"><span style={eyebrow}>Publicaciones</span><b>{scope.length}</b></div>
            <div className="eh-stat">
              <span style={eyebrow}>Interacción media</span>
              <b>{scopeEng !== null ? pct(scopeEng) : "s/d"}</b>
              {current && delta !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? "var(--success)" : "var(--text-muted)" }}>
                  {delta >= 0 ? "▲" : "▼"} {pct(Math.abs(delta), 0)} frente a la media ({pct(globalEng)})
                </span>
              )}
            </div>
            <div className="eh-stat"><span style={eyebrow}>Interacciones</span><b>{fmt(scope.reduce((a, i) => a + i.interactions, 0))}</b></div>
          </div>
          <div style={{ ...eyebrow, margin: "18px 0 10px" }}>Piezas que mejor funcionan</div>
          {top.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Sin publicaciones de esta técnica en el periodo.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top.map((p) => (
                <a key={p.id} className="eh-post" href={p.url} target="_blank" rel="noreferrer">
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span style={{ width: 64, height: 64, borderRadius: 8, background: "var(--gridline)" }} />}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{p.type} · {p.network === "instagram" ? "Instagram" : "Facebook"} · {p.date.slice(0, 10)}</span>
                    <span style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.content || "Sin texto"}</span>
                  </span>
                  <span className="r" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{fmt(p.interactions)}<span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>interacciones</span></span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "prod" && (
        <section style={card}>
          <div style={{ ...eyebrow, color: accent }}>Especies mencionadas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 18px" }}>
            {species.length ? species.map(([s, n]) => <span key={s} className="eh-chip"><b style={{ textTransform: "capitalize" }}>{s}</b> {n} pub.</span>) : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin especies mencionadas en el periodo.</span>}
          </div>
          <div style={{ ...eyebrow, color: accent }}>Etiquetas más usadas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {tags.length ? tags.map(([t, n]) => <span key={t} className="eh-chip">#{t} <b>{n}</b></span>) : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin etiquetas en el periodo.</span>}
          </div>
          <div style={{ marginTop: 18 }}>{ownAnalysis}</div>
        </section>
      )}

      {tab === "donde" && <IberiaMap compact />}

      {tab === "comp" && (
        <section style={card}>
          <div style={{ ...eyebrow, color: accent }}>Competencia en Instagram</div>
          <div className="eh-grid3" style={{ marginTop: 12 }}>
            <div className="eh-stat" style={{ borderColor: "var(--brand-instagram, #cc1236)" }}>
              <span style={eyebrow}>Shimano Spain</span><b>{fmt(own[3]!)}</b>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>▲ {pct(ownG)} desde agosto</span>
            </div>
            {comp.map((c) => (
              <div key={c.name} className="eh-stat">
                <span style={eyebrow}>{c.name}</span><b>{fmt(c.last)}</b>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.g !== null ? `▲ ${pct(c.g)} desde agosto` : "Sin dato de agosto"}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
            Bocarde TV ({fmt(COMP_YT[1].values[3]!)} suscriptores) y Fox Fishing TV España ({fmt(COMP_YT[2].values[3]!)}) se siguen en YouTube.
          </p>
          <div style={{ ...eyebrow, margin: "20px 0 10px" }}>Módulos por conectar</div>
          <div className="eh-grid3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
            {[
              ["Contenido de la comunidad", "Publicaciones que etiquetan a Shimano, clasificadas por técnica, especie y país."],
              ["Clasificación de comentarios", "Preguntas técnicas, de producto, de precio y de soporte para detectar dudas recurrentes."],
              ["Piezas de la competencia", "Formatos, frecuencia y publicaciones con más respuesta de Daiwa, Fox y Hart."],
            ].map(([t, d]) => (
              <div key={t} className="eh-soon">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{d}</p>
                <span className="eh-btn">Pendiente de conectar</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button onClick={() => setOpen((o) => !o)} style={{ ...eyebrow, background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}>
        {open ? "▾" : "▸"} Notas sobre el método
      </button>
      {open && (
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          Las técnicas se detectan por el vocabulario habitual del sector en el texto de las publicaciones de Shimano Iberia. Solo cuentan las
          publicaciones del periodo seleccionado.
        </p>
      )}
    </div>
  );
}
