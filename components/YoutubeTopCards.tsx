import type { ReactNode } from "react";

type Props = {
  subscribers: number | null;
  subscribersDelta: number | null;
  subscribersGainedPrev: number | null;
  subscribersSince: string | null;
  views: number;
  viewsPrev: number;
  viewsSince: string | null;
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
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

function ChangeChip({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) {
    return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sin comparativa disponible</span>;
  }
  const pct = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current > 0 ? 100 : 0;
  const direction = pct > 1 ? "up" : pct < -1 ? "down" : "flat";
  const color = direction === "up" ? "var(--success)" : direction === "down" ? "var(--decline)" : "var(--text-muted)";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•";
  return (
    <span style={{ fontSize: 11.5, color, fontWeight: 700 }}>
      {arrow} {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}% vs. periodo anterior
    </span>
  );
}

function Card({
  label,
  value,
  deltaLine,
  changeChip,
  note,
}: {
  label: string;
  value: string;
  deltaLine?: string;
  changeChip: ReactNode;
  note?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
        {value}
        {deltaLine && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}> {deltaLine}</span>}
      </span>
      {changeChip}
      {note && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{note}</span>}
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
  viewsSince,
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
      <Card
        label="Suscriptores"
        value={subscribers !== null ? formatNumber(subscribers) : "–"}
        deltaLine={subscribersDelta !== null && subscribersDelta !== 0 ? `(${formatSigned(subscribersDelta)})` : undefined}
        changeChip={<ChangeChip current={subscribersDelta} previous={subscribersGainedPrev} />}
        note={subscribersSince ? `Histórico diario desde ${formatDateShort(subscribersSince)}` : "Sin histórico diario disponible todavía"}
      />
      <Card
        label="Visualizaciones"
        value={formatNumber(views)}
        changeChip={<ChangeChip current={views} previous={viewsPrev} />}
        note={viewsSince ? `Todo el canal · histórico diario desde ${formatDateShort(viewsSince)}` : "Todo el canal en el periodo"}
      />
      <Card
        label="Tiempo de visualización"
        value={formatWatchTime(watchMinutes)}
        changeChip={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>Vídeos publicados en el periodo</span>}
      />
      <Card
        label="Interacciones"
        value={formatNumber(interactions)}
        changeChip={<ChangeChip current={interactions} previous={interactionsPrev} />}
        note="Likes + comentarios + shares de los vídeos publicados en el periodo"
      />
    </section>
  );
}
