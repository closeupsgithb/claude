import { NextResponse } from "next/server";
import { fetchNetworkSnapshot, fetchAdsBreakdown, fetchTopPosts, MissingCredentialsError, BRAND_ID } from "@/lib/metricool";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BRANDS = {
  es: { id: BRAND_ID.es, label: "España" },
  pt: { id: BRAND_ID.pt, label: "Portugal" },
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
    const [esInstagram, esFacebook, ptInstagram, ptFacebook, ads, esPosts, ptPosts] = await Promise.all([
      fetchNetworkSnapshot("instagram", BRANDS.es.id, fromIso, toIso),
      fetchNetworkSnapshot("facebook", BRANDS.es.id, fromIso, toIso),
      fetchNetworkSnapshot("instagram", BRANDS.pt.id, fromIso, toIso),
      fetchNetworkSnapshot("facebook", BRANDS.pt.id, fromIso, toIso),
      fetchAdsBreakdown(fromIso, toIso),
      fetchTopPosts("es", fromIso, toIso),
      fetchTopPosts("pt", fromIso, toIso),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      from: fromIso,
      to: toIso,
      days,
      es: { label: BRANDS.es.label, instagram: esInstagram, facebook: esFacebook },
      pt: { label: BRANDS.pt.label, instagram: ptInstagram, facebook: ptFacebook },
      ads,
      posts: [...esPosts, ...ptPosts],
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
