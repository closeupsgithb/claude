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

  const [igPosts, igReels, fbPosts, fbAdsCampaigns] = await Promise.all([
    metricoolGet("/v2/analytics/posts/instagram", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/reels/instagram", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/posts/facebook", { from: fromIso, to: toIso, blogId }),
    metricoolGet("/v2/analytics/campaigns/facebookads", { from: fromIso, to: toIso, blogId }),
  ]);

  return NextResponse.json({
    igPostSample: igPosts?.data?.slice(0, 2) ?? igPosts,
    igReelSample: igReels?.data?.slice(0, 2) ?? igReels,
    fbPostSample: fbPosts?.data?.slice(0, 2) ?? fbPosts,
    adsCampaignSample: fbAdsCampaigns?.data?.slice(0, 3) ?? fbAdsCampaigns,
  });
}
