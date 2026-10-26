"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Periods = { meses: string[]; trimestres: string[]; desde: string | null; hasta: string | null };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function labelOf(kind: "mes" | "trimestre", id: string) {
  if (kind === "mes") {
    const [y, m] = id.split("-").map(Number);
    return `${MESES[m - 1].replace(/^./, (c) => c.toUpperCase())} ${y}`;
  }
  const [y, q] = id.split("-Q");
  return `${q}.º trimestre ${y}`;
}

/** Botón "Informe PDF": elige mes o trimestre y descarga el informe con el diseño de marca. */
export default function ReportButton({ buttonStyle }: { buttonStyle: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [periods, setPeriods] = useState<Periods | null>(null);
  const [kind, setKind] = useState<"mes" | "trimestre">("mes");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || periods) return;
    fetch("/api/informe?periodos=1")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("sin histórico"))))
      .then((p: Periods) => {
        setPeriods(p);
        setId(p.meses[0] ?? "");
      })
      .catch(() => setError("El histórico todavía no está disponible."));
  }, [open, periods]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const options = periods ? (kind === "mes" ? periods.meses : periods.trimestres) : [];

  useEffect(() => {
    if (periods) setId(options[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, periods]);

  async function generate() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/informe?tipo=${kind}&id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("No se pudo generar el informe");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_Shimano_Iberia_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar el informe");
    } finally {
      setBusy(false);
    }
  }

  const field: CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--border, #d9e0e6)",
    background: "var(--surface, #fff)",
    fontSize: 13,
    color: "inherit",
  };

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={buttonStyle}>
        Informe PDF
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 280,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #d9e0e6)",
            boxShadow: "0 12px 32px rgba(11,42,74,.16)",
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Informe para compartir</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary, #5b6b7a)", marginBottom: 10 }}>
            Se genera con los datos guardados y el diseño de marca.
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["mes", "trimestre"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 8,
                  border: "1px solid var(--border, #d9e0e6)",
                  background: kind === k ? "#0B2A4A" : "transparent",
                  color: kind === k ? "#fff" : "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {k === "mes" ? "Mensual" : "Trimestral"}
              </button>
            ))}
          </div>
          {periods && options.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-secondary, #5b6b7a)", marginBottom: 8 }}>
              Aún no hay histórico suficiente para un informe {kind === "mes" ? "mensual" : "trimestral"}.
            </div>
          ) : (
            <select value={id} onChange={(e) => setId(e.target.value)} style={field}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {labelOf(kind, o)}
                </option>
              ))}
            </select>
          )}
          {error && <div style={{ fontSize: 12, color: "#b7791f", marginTop: 8 }}>{error}</div>}
          <button
            onClick={generate}
            disabled={busy || !id}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: 0,
              background: "#009DDD",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || !id ? "default" : "pointer",
              opacity: busy || !id ? 0.6 : 1,
            }}
          >
            {busy ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
