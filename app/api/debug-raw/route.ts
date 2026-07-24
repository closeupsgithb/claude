import { NextResponse } from "next/server";

const METRICOOL_BASE = "https://app.metricool.com/api";

async function metricoolGet(path: string, params: Record<string, string>) {
  const userToken = process.env.METRICOOL_USER_TOKEN!;
  const userId = process.env.METRICOOL_USER_ID!;
  const url = new URL(`${METRICOOL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("userId", userId);
  const res = await fetch(url.toString(), { headers: { "X-Mc-Auth": userToken }, cache: "no-store" });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const toIso = to.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const blogId = searchParams.get("blogId") ?? "5991450";

  const [fbReels, adsEndpointA, adsEndpointB, adsEndpointC] = await Promise.all([
    metricoolGet("/v2/analytics/reels/facebook", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/ads/facebookads", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/campaigns/ads/facebookads", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/promotedPosts/facebookads", { from: fromIso, to: toIso, blogId }),
  ]);

  return NextResponse.json({
    fbReelSample: fbReels?.data?.slice(0, 2) ?? fbReels,
    adsEndpointA_sample: Array.isArray(adsEndpointA?.data) ? adsEndpointA.data.slice(0, 3) : adsEndpointA,
    adsEndpointB_sample: Array.isArray(adsEndpointB?.data) ? adsEndpointB.data.slice(0, 3) : adsEndpointB,
    adsEndpointC_sample: Array.isArray(adsEndpointC?.data) ? adsEndpointC.data.slice(0, 3) : adsEndpointC,
  });
}
