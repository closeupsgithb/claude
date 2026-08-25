import type { CSSProperties } from "react";
import type { YoutubeVideoItem } from "@/lib/metricool";

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

function Row({ label, shorts, videos, format }: { label: string; shorts: number; videos: number; format: (n: number) => string }) {
  const max = Math.max(shorts, videos, 0.0001);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)" }}>
        <span>{label}</span>
      </div>
      <BarPair value={shorts} max={max} color="var(--series-yt)" format={format} />
      <BarPair value={videos} max={max} color="#c0392b" format={format} />
    </div>
  );
}

function BarPair({ value, max, color, format }: { value: number; max: number; color: string; format: (n: number) => string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 10, borderRadius: 4, background: "var(--gridline)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)", minWidth: 64, textAlign: "right" }}>{format(value)}</span>
    </div>
  );
}

function buildConclusion(shorts: FormatStats, videos: FormatStats): string | null {
  if (shorts.count < 3 || videos.count < 3) return null;

  const viewsRatio = videos.viewsPerVideo > 0 ? shorts.viewsPerVideo / videos.viewsPerVideo : 0;
  const watchRatio = shorts.watchMinutesPerVideo > 0 ? videos.watchMinutesPerVideo / shorts.watchMinutesPerVideo : 0;

  if (viewsRatio >= 1.5 && watchRatio >= 1.3) {
    return `Los Shorts generan ${formatDecimal(viewsRatio)}× más visualizaciones por publicación, pero cada vídeo tradicional acumula ${formatDecimal(
      watchRatio
    )}× más tiempo de visualización que un Short.`;
  }
  if (viewsRatio >= 1.5) {
    return `Los Shorts generan ${formatDecimal(viewsRatio)}× más visualizaciones por publicación que los vídeos tradicionales este periodo.`;
  }
  if (viewsRatio > 0 && viewsRatio <= 0.67) {
    return `Los vídeos tradicionales generan ${formatDecimal(1 / viewsRatio)}× más visualizaciones por publicación que los Shorts este periodo.`;
  }
  return null;
}

export default function YoutubeFormatComparison({ videos }: Props) {
  const shortsVideos = videos.filter((v) => v.format === "short");
  const longVideos = videos.filter((v) => v.format === "video");
  const shortsStats = statsFor(shortsVideos);
  const videosStats = statsFor(longVideos);

  if (!shortsStats && !videosStats) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Shorts vs. Vídeos</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Sin publicaciones en este periodo.</p>
      </div>
    );
  }

  const conclusion = shortsStats && videosStats ? buildConclusion(shortsStats, videosStats) : null;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h3 style={titleStyle}>Shorts vs. Vídeos</h3>
        <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text-secondary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--series-yt)", display: "inline-block" }} />
            Shorts ({shortsStats?.count ?? 0})
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#c0392b", display: "inline-block" }} />
            Vídeos ({videosStats?.count ?? 0})
          </span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 14px" }}>Métricas medias por publicación — permite comparar formatos con distinto volumen.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="Visualizaciones / publicación" shorts={shortsStats?.viewsPerVideo ?? 0} videos={videosStats?.viewsPerVideo ?? 0} format={formatNumber} />
        <Row label="Likes / publicación" shorts={shortsStats?.likesPerVideo ?? 0} videos={videosStats?.likesPerVideo ?? 0} format={formatNumber} />
        <Row
          label="Comentarios / publicación"
          shorts={shortsStats?.commentsPerVideo ?? 0}
          videos={videosStats?.commentsPerVideo ?? 0}
          format={formatNumber}
        />
        <Row
          label="Tiempo de visualización / publicación (min)"
          shorts={shortsStats?.watchMinutesPerVideo ?? 0}
          videos={videosStats?.watchMinutesPerVideo ?? 0}
          format={formatDecimal}
        />
        <Row
          label="Engagement medio"
          shorts={shortsStats?.avgEngagement ?? 0}
          videos={videosStats?.avgEngagement ?? 0}
          format={(n) => `${formatDecimal(n)}%`}
        />
      </div>

      {conclusion ? (
        <p style={conclusionStyle}>{conclusion}</p>
      ) : (
        shortsStats &&
        videosStats && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "14px 0 0" }}>
            Sin diferencia clara entre formatos este periodo — o volumen insuficiente para una conclusión fiable.
          </p>
        )
      )}
      {(!shortsStats || !videosStats) && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "14px 0 0" }}>
          Solo hay publicaciones de un formato este periodo — la comparativa aparecerá cuando existan ambos.
        </p>
      )}
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
  background: "color-mix(in srgb, var(--series-yt) 8%, var(--surface-1))",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  margin: "14px 0 0",
  lineHeight: 1.4,
};
