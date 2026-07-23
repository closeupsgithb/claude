import { NextResponse } from "next/server";
import { fetchNetworkSnapshot, MissingCredentialsError } from "@/lib/metricool";

export const dynamic = "force-dynamic";

const BRANDS = {
  es: { id: 5991450, label: "España" },
  pt: { id: 5991465, label: "Portugal" },
} as const;

function toMetricoolIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? "30") || 30, 1), 90);

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = toMetricoolIso(from);
  const toIso = toMetricoolIso(to);

  try {
    const [esInstagram, esFacebook, ptInstagram, ptFacebook] = await Promise.all([
      fetchNetworkSnapshot("instagram", BRANDS.es.id, fromIso, toIso),
      fetchNetworkSnapshot("facebook", BRANDS.es.id, fromIso, toIso),
      fetchNetworkSnapshot("instagram", BRANDS.pt.id, fromIso, toIso),
      fetchNetworkSnapshot("facebook", BRANDS.pt.id, fromIso, toIso),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      from: fromIso,
      to: toIso,
      days,
      es: { label: BRANDS.es.label, instagram: esInstagram, facebook: esFacebook },
      pt: { label: BRANDS.pt.label, instagram: ptInstagram, facebook: ptFacebook },
    });
  } catch (err) {
    if (err instanceof MissingCredentialsError) {
      return NextResponse.json({ error: "MISSING_CREDENTIALS" }, { status: 503 });
    }
    return NextResponse.json(
      { error: "UPSTREAM_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
