type Props = {
  label: string;
  esValue: number;
  ptValue: number;
  esDelta?: number;
  ptDelta?: number;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
}

function Delta({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span style={{ fontSize: 11, color: positive ? "var(--success)" : "var(--text-muted)", marginLeft: 6 }}>
      {positive ? "+" : ""}
      {formatNumber(value)}
    </span>
  );
}

export default function KpiCard({ label, esValue, ptValue, esDelta, ptDelta }: Props) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 180,
        flex: "1 1 180px",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--series-es)", display: "inline-block" }} />
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{formatNumber(esValue)}</span>
          {esDelta !== undefined && <Delta value={esDelta} />}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--series-pt)", display: "inline-block" }} />
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{formatNumber(ptValue)}</span>
          {ptDelta !== undefined && <Delta value={ptDelta} />}
        </div>
      </div>
    </div>
  );
}
