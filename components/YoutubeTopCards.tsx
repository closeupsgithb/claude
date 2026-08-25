import type { ReactNode } from "react";
import InfoTip from "@/components/InfoTip";

type Props = {
  subscribers: number | null;
  subscribersDelta: number | null;
  subscribersGainedPrev: number | null;
  subscribersSince: string | null;
  views: number;
  viewsPrev: number;
  watchMinutes: number;
  interactions: number;
  interactionsPrev: number;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${formatNumber(n)}`;
}

function formatWatchTime(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 1) return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(hours)} h`;
  return `${formatNumber(minutes)} min`;
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long" }).format(new Date(iso));
}

// Renders "▲ +18%", "▼ -6%" or a neutral "—" when there's nothing to compare
// against yet — never a sentence explaining why.
function ChangeChip({ current, previous, since }: { current: number | null; previous: number | null; since?: string | null }) {
  if (current === null || previous === null) {
    return (
      <span className="info-tip" tabIndex={0} style={{ fontSize: 12, color: "var(--text-muted)" }}>
        <span>—</span>
        <span className="info-tip-bubble" role="tooltip">
          Histórico todavía insuficiente para comparar con el periodo anterior.
        </span>
      </span>
    );
  }
  const pct = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
  const direction = pct > 1 ? "up" : pct < -1 ? "down" : "flat";
  const color = direction === "up" ? "var(--success)" : direction === "down" ? "var(--decline)" : "var(--text-muted)";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•";
  const chip = (
    <span style={{ fontSize: 12, color, fontWeight: 700 }}>
      {arrow} {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
  if (!since) return chip;
  return (
    <span className="info-tip" tabIndex={0}>
      {chip}
      <span className="info-tip-bubble" role="tooltip">
        Histórico diario disponible desde el {formatDateShort(since)}.
      </span>
    </span>
  );
}

function Stat({ label, tip, value, deltaLine, children }: { label: string; tip?: string; value: string; deltaLine?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
        {value}
        {deltaLine && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}> {deltaLine}</span>}
      </span>
      {children}
    </div>
  );
}

export default function YoutubeTopCards({
  subscribers,
  subscribersDelta,
  subscribersGainedPrev,
  subscribersSince,
  views,
  viewsPrev,
  watchMinutes,
  interactions,
  interactionsPrev,
}: Props) {
  return (
    <section
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 28,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <Stat label="Suscriptores" value={subscribers !== null ? formatNumber(subscribers) : "–"} deltaLine={subscribersDelta ? `(${formatSigned(subscribersDelta)})` : undefined}>
        <ChangeChip current={subscribersDelta} previous={subscribersGainedPrev} since={subscribersSince} />
      </Stat>
      <Stat label="Visualizaciones" value={formatNumber(views)}>
        <ChangeChip current={views} previous={viewsPrev} />
      </Stat>
      <Stat
        label="Tiempo de visualización"
        tip="Tiempo total que los usuarios han dedicado a ver contenidos del canal durante el periodo seleccionado."
        value={formatWatchTime(watchMinutes)}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>&nbsp;</span>
      </Stat>
      <Stat
        label="Interacciones"
        tip="Suma de likes, comentarios y compartidos de los vídeos publicados en el periodo."
        value={formatNumber(interactions)}
      >
        <ChangeChip current={interactions} previous={interactionsPrev} />
      </Stat>
    </section>
  );
}
