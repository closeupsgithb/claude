import type { CSSProperties } from "react";
import InfoTip from "@/components/InfoTip";

export type RankedStat = { label: string; avg: number; count: number };

type Props = {
  dayStats: RankedStat[];
  hourStats: RankedStat[];
  totalVideos: number;
  windowDays: number;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

// A day/slot only counts as real signal with at least 3 publications behind
// it — a single outlier video shouldn't read as "the best day to post."
const MIN_COUNT_PER_BUCKET = 3;
const MIN_BUCKETS_WITH_SIGNAL = 2;

function RankedBars({ stats }: { stats: RankedStat[] }) {
  const usable = stats.filter((s) => s.count >= MIN_COUNT_PER_BUCKET).sort((a, b) => b.avg - a.avg);
  const max = Math.max(1, ...usable.map((s) => s.avg));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {usable.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 84, flexShrink: 0, whiteSpace: "nowrap" }}>{s.label}</span>
          <div style={{ flex: 1, height: 10, borderRadius: 4, background: "var(--gridline)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(3, (s.avg / max) * 100)}%`, height: "100%", background: "var(--series-yt)", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", minWidth: 70, textAlign: "right" }}>
            {formatNumber(s.avg)} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>/ publ.</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function conclusionFor(stats: RankedStat[], subject: string): string | null {
  const usable = stats.filter((s) => s.count >= MIN_COUNT_PER_BUCKET);
  if (usable.length < MIN_BUCKETS_WITH_SIGNAL) return null;
  const sorted = [...usable].sort((a, b) => b.avg - a.avg);
  const leader = sorted[0];
  const runnerUp = sorted[1];
  if (!runnerUp || runnerUp.avg <= 0) return `${leader.label} concentra el mejor rendimiento medio por publicación en ${subject} este periodo.`;
  const gapPct = ((leader.avg - runnerUp.avg) / runnerUp.avg) * 100;
  if (gapPct >= 15) {
    return `${leader.label} obtiene un ${gapPct.toFixed(0)}% más de interacción media por publicación que el resto de ${subject === "día" ? "días" : "franjas"} este periodo.`;
  }
  return `${leader.label} presenta el mejor rendimiento medio por publicación en ${subject}, aunque sin una diferencia amplia sobre el resto.`;
}

function Panel({ title, stats, subject }: { title: string; stats: RankedStat[]; subject: string }) {
  const usableCount = stats.filter((s) => s.count >= MIN_COUNT_PER_BUCKET).length;
  const conclusion = conclusionFor(stats, subject);

  return (
    <div style={{ flex: "1 1 300px", minWidth: 260 }}>
      <h4 style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </h4>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-muted)" }}>Interacciones medias por publicación</p>
      {usableCount >= MIN_BUCKETS_WITH_SIGNAL ? (
        <>
          <RankedBars stats={stats} />
          {conclusion && <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "10px 0 0", lineHeight: 1.4 }}>{conclusion}</p>}
        </>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>Muestra todavía insuficiente para identificar un patrón fiable.</p>
      )}
    </div>
  );
}

export default function YoutubeBestTimes({ dayStats, hourStats, totalVideos, windowDays }: Props) {
  if (totalVideos === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Mejores momentos para publicar</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Todavía no hay histórico de publicaciones suficiente.</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h3 style={titleStyle}>Mejores momentos para publicar</h3>
          <InfoTip text="Interacción media por publicación (no el total) — para que un solo día muy activo no distorsione la comparación. Usa una ventana fija para tener muestra suficiente, independiente del periodo seleccionado arriba." />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Basado en los últimos {windowDays} días</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <Panel title="Por día de la semana" stats={dayStats} subject="día" />
        <Panel title="Por franja horaria" stats={hourStats} subject="franja" />
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "18px 18px 20px",
  boxShadow: "var(--card-shadow)",
};

const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" };
