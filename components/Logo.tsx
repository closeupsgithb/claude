export default function Logo() {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: "0.5px",
          color: "#0098d8",
          lineHeight: 1,
        }}
      >
        SHIMANO
      </span>
      <div style={{ display: "flex", height: 3, width: "100%" }}>
        <span style={{ flex: 1, background: "#7dc242" }} />
        <span style={{ flex: 1, background: "#29abe2" }} />
        <span style={{ flex: 1, background: "#003da5" }} />
      </div>
    </div>
  );
}
