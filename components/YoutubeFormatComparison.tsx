import type { CSSProperties } from "react";
import type { YoutubeVideoItem } from "@/lib/metricool";
import InfoTip from "@/components/InfoTip";

type Props = { videos: YoutubeVideoItem[] };

type FormatStats = {
  count: number;
  viewsPerVideo: number;
  likesPerVideo: number;
  commentsPerVideo: number;
  watchMinutesPerVideo: number;
  avgEngagement: number;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function formatDecimal(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
}

function statsFor(videos: YoutubeVideoItem[]): FormatStats | null {
  if (videos.length === 0) return null;
  const engagements = videos.map((v) => v.engagementRate).filter((v): v is number => v !== null);
  return {
    count: videos.length,
    viewsPerVideo: videos.reduce((a, v) => a + v.views, 0) / videos.length,
    likesPerVideo: videos.reduce((a, v) => a + v.likes, 0) / videos.length,
    commentsPerVideo: videos.reduce((a, v) => a + v.comments, 0) / videos.length,
    watchMinutesPerVideo: videos.reduce((a, v) => a + v.watchMinutes, 0) / videos.length,
    avgEngagement: engagements.length > 0 ? engagements.reduce((a, b) => a + b, 0) / engagements.length : 0,
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function FormatCard({ title, colorVar, stats }: { title: string; colorVar: string; stats: FormatStats | null }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, var(${colorVar}) 6%, var(--surface-1)), var(--surface-1) 90px)`,
        border: "1px solid var(--border)",
        borderTop: `3px solid var(${colorVar})`,
        borderRadius: 12,
        padding: "16px 18px",
        flex: "1 1 240px",
        minWidth: 220,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{stats ? `${stats.count} publicados` : "0 publicados"}</span>
      </div>
      {stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Metric label="Views / publicación" value={formatNumber(stats.viewsPerVideo)} />
          <Metric label="Engagement medio" value={`${formatDecimal(stats.avgEngagement)}%`} />
          <Metric label="Likes / publicación" value={formatNumber(stats.likesPerVideo)} />
          <Metric label="Watch time / publicación" value={`${formatDecimal(stats.watchMinutesPerVideo)} min`} />
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>Sin publicaciones de este formato en el periodo.</p>
      )}
    </div>
  );
}

// Three tiers, from strongest to weakest evidence — never a flat refusal when
// there's at least a directional signal, but never a confident claim without
// a real sample either.
function buildConclusion(shorts: FormatStats | null, videos: FormatStats | null): string {
  if (!shorts || !videos) {
    return "Todavía no hay publicaciones de ambos formatos este periodo para comparar.";
  }

  const viewsRatio = videos.viewsPerVideo > 0 ? shorts.viewsPerVideo / videos.viewsPerVideo : 0;
  const engagementLeaderIsVideo = videos.avgEngagement > shorts.avgEngagement;
  const engagementGapPct = shorts.avgEngagement > 0 ? Math.abs((videos.avgEngagement - shorts.avgEngagement) / shorts.avgEngagement) * 100 : 0;

  const strongSample = shorts.count >= 3 && videos.count >= 3;
  const hedge = strongSample ? "" : ", aunque la muestra todavía es limitada";

  if (viewsRatio >= 1.4 && engagementGapPct >= 15) {
    return `Los Shorts generan ${formatDecimal(viewsRatio)}× más visualizaciones por publicación, pero los ${
      engagementLeaderIsVideo ? "vídeos tradicionales" : "Shorts"
    } obtienen más engagement por publicación este periodo${hedge}.`;
  }
  if (viewsRatio >= 1.4) {
    return `Los Shorts generan ${formatDecimal(viewsRatio)}× más visualizaciones por publicación que los vídeos tradicionales este periodo${hedge}.`;
  }
  if (viewsRatio > 0 && viewsRatio <= 0.72) {
    return `Los vídeos tradicionales generan ${formatDecimal(1 / viewsRatio)}× más visualizaciones por publicación que los Shorts este periodo${hedge}.`;
  }
  if (engagementGapPct >= 20) {
    return `Los ${engagementLeaderIsVideo ? "vídeos tradicionales" : "Shorts"} están obteniendo más engagement por publicación este periodo${hedge}.`;
  }
  return "Sin diferencia relevante entre formatos este periodo.";
}

export default function YoutubeFormatComparison({ videos }: Props) {
  const shortsVideos = videos.filter((v) => v.format === "short");
  const longVideos = videos.filter((v) => v.format === "video");
  const shortsStats = statsFor(shortsVideos);
  const videosStats = statsFor(longVideos);

  if (videos.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Formato</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Sin publicaciones en este periodo.</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <h3 style={titleStyle}>Shorts vs. Vídeos</h3>
        <InfoTip text="Métricas medias por publicación, para comparar formatos con distinto volumen." />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        <FormatCard title="Shorts" colorVar="--series-yt" stats={shortsStats} />
        <FormatCard title="Vídeos" colorVar="--series-es" stats={videosStats} />
      </div>

      <p style={conclusionStyle}>{buildConclusion(shortsStats, videosStats)}</p>
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

const conclusionStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--text-primary)",
  background: "var(--page-plane)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  margin: 0,
  lineHeight: 1.4,
};
