import type { CSSProperties } from "react";

type Props = {
  insights: string[];
};

export default function InsightBanner({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div style={wrapStyle}>
      <span style={eyebrowStyle}>Lo más relevante</span>
      <ul style={listStyle}>
        {insights.map((text, i) => (
          <li key={i} style={itemStyle}>
            <span style={dotStyle} />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--series-es) 8%, var(--surface-1)), var(--surface-1))",
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

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: "8px 0 0",
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
  background: "var(--series-es)",
  marginTop: 6,
  flexShrink: 0,
};
