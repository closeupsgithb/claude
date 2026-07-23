"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import KpiCard from "@/components/KpiCard";
import TrendChart from "@/components/TrendChart";
import type { NetworkSnapshot } from "@/lib/metricool";

type ApiResponse = {
  generatedAt: string;
  days: number;
  es: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
  pt: { label: string; instagram: NetworkSnapshot; facebook: NetworkSnapshot };
};

type ApiError = { error: "MISSING_CREDENTIALS" | "UPSTREAM_ERROR"; detail?: string };

const REFRESH_MS = 5 * 60 * 1000;
const DAY_OPTIONS = [7, 30, 90];

export default function Page() {
  const [platform, setPlatform] = useState<"instagram" | "facebook">("instagram");
  const [days, setDays] = useState(30);
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

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Shimano Iberia</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Redes sociales — España y Portugal, en tiempo real
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {data && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Actualizado {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt))}
            </span>
          )}
          <button onClick={load} disabled={loading} style={refreshButtonStyle}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["instagram", "facebook"] as const).map((p) => (
            <button key={p} onClick={() => setPlatform(p)} style={tabStyle(platform === p)}>
              {p === "instagram" ? "Instagram" : "Facebook"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)} style={tabStyle(days === d)}>
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

      {data && (
        <>
          <section style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <KpiCard
              label="Seguidores"
              esValue={data.es[platform].followers}
              ptValue={data.pt[platform].followers}
              esDelta={data.es[platform].followersDelta}
              ptDelta={data.pt[platform].followersDelta}
            />
            <KpiCard
              label={platform === "instagram" ? "Alcance" : "Visualizaciones de contenido"}
              esValue={data.es[platform].reach}
              ptValue={data.pt[platform].reach}
            />
            <KpiCard label="Interacciones" esValue={data.es[platform].interactions} ptValue={data.pt[platform].interactions} />
            <KpiCard label="Publicaciones" esValue={data.es[platform].posts} ptValue={data.pt[platform].posts} />
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TrendChart
              title="Evolución de seguidores"
              esSeries={data.es[platform].followersSeries}
              ptSeries={data.pt[platform].followersSeries}
            />
            <TrendChart
              title={platform === "instagram" ? "Alcance diario" : "Visualizaciones de contenido diarias"}
              esSeries={data.es[platform].reachSeries}
              ptSeries={data.pt[platform].reachSeries}
            />
            <TrendChart
              title="Interacciones diarias"
              esSeries={data.es[platform].interactionsSeries}
              ptSeries={data.pt[platform].interactionsSeries}
            />
          </section>
        </>
      )}

      {!data && !error && loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Cargando datos…</p>}
    </main>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: active ? "var(--series-es)" : "var(--surface-1)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  };
}

const refreshButtonStyle: CSSProperties = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-1)",
  color: "var(--text-secondary)",
  cursor: "pointer",
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
