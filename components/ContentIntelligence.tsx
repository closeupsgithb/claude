"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ContentItem } from "@/lib/metricool";
import { analyzeContent, type ContentGroupResult } from "@/lib/contentAnalysis";

type Props = { items: ContentItem[] };

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function standoutSentence(g: ContentGroupResult, periodMean: number): string {
  if (g.kind === "técnica") {
    return `El contenido de ${g.name} es el que mejor está funcionando este periodo: ${formatPct(
      g.avgEngagement
    )} de interacción media sobre ${g.count} publicaciones, frente al ${formatPct(periodMean)} de media del periodo.`;
  }
  return `Las publicaciones sobre "${g.name}" logran ${formatPct(g.avgEngagement)} de interacción media (${
    g.count
  } publicaciones), frente al ${formatPct(periodMean)} de media del periodo.`;
}

export default function ContentIntelligence({ items }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);
  const analysis = useMemo(() => analyzeContent(items), [items]);

  const hasNothing = analysis.standouts.length === 0 && !analysis.mostMentioned;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
        <span style={eyebrowStyle}>Producto y técnica</span>
        <button onClick={() => setShowMethodology((s) => !s)} style={toggleButtonStyle}>
          {showMethodology ? "Ocultar metodología" : "Ver metodología"}
        </button>
      </div>

      {showMethodology && (
        <p style={methodologyStyle}>
          Los productos se identifican solo cuando aparecen escritos de forma literal como &quot;Shimano + nombre&quot; en el
          texto de una publicación de este periodo (más los hashtags asociados a ese mismo nombre en otras publicaciones). Las
          técnicas se detectan por vocabulario estándar del sector (surfcasting, carpfishing, spinning, etc.). Un producto o
          técnica solo se reporta con al menos 3 publicaciones en el periodo.
        </p>
      )}

      {hasNothing && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>
          Sin volumen suficiente de menciones de producto o técnica este periodo para extraer conclusiones fiables.
        </p>
      )}

      {analysis.standouts.length > 0 && (
        <ul style={listStyle}>
          {analysis.standouts.map((g, i) => (
            <li key={i} style={itemStyle}>
              <span style={dotStyle} />
              {standoutSentence(g, analysis.periodMeanEngagement)}
            </li>
          ))}
        </ul>
      )}

      {analysis.standouts.length === 0 && analysis.mostMentioned && (
        <ul style={listStyle}>
          <li style={itemStyle}>
            <span style={dotStyle} />
            {analysis.mostMentioned.kind === "técnica"
              ? `${analysis.mostMentioned.name} es la técnica con más presencia este periodo (${analysis.mostMentioned.count} publicaciones, ${formatPct(
                  analysis.mostMentioned.avgEngagement
                )} de interacción media), sin destacar aún claramente sobre la media del periodo.`
              : `"${analysis.mostMentioned.name}" es el producto con más presencia este periodo (${analysis.mostMentioned.count} publicaciones, ${formatPct(
                  analysis.mostMentioned.avgEngagement
                )} de interacción media), sin destacar aún claramente sobre la media del periodo.`}
          </li>
        </ul>
      )}

      {analysis.unconfirmedTerms.length > 0 && (
        <p style={footnoteStyle}>
          Términos con posible mención de producto detectados pero no confirmados de forma fiable este periodo — revisar
          manualmente: {analysis.unconfirmedTerms.join(", ")}.
        </p>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--series-pt) 8%, var(--surface-1)), var(--surface-1))",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "14px 18px",
  boxShadow: "var(--card-shadow)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  fontWeight: 700,
};

const toggleButtonStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-secondary)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "3px 8px",
  cursor: "pointer",
};

const methodologyStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  margin: "8px 0 0",
  lineHeight: 1.5,
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: "10px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const itemStyle: CSSProperties = {
  fontSize: 13.5,
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  lineHeight: 1.4,
};

const dotStyle: CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  background: "var(--series-pt)",
  marginTop: 6,
  flexShrink: 0,
};

const footnoteStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  margin: "10px 0 0",
  paddingTop: 8,
  borderTop: "1px solid var(--gridline)",
};
