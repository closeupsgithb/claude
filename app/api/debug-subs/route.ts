import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const METRICOOL_BASE = "https://app.metricool.com/api";
const BRAND_ID_ES = 5991450;

async function tryMetric(metric: string, from: string, to: string) {
  const userToken = process.env.METRICOOL_USER_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  if (!userToken || !userId) return { metric, ok: false, note: "MISSING_CREDENTIALS" };

  const url = new URL(`${METRICOOL_BASE}/v2/analytics/timelines`);
  url.searchParams.set("network", "youtube");
  url.searchParams.set("metric", metric);
  url.searchParams.set("subject", "account");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("blogId", String(BRAND_ID_ES));
  url.searchParams.set("userId", userId);

  try {
    const res = await fetch(url.toString(), { headers: { "X-Mc-Auth": userToken }, cache: "no-store" });
    const text = await res.text();
    let rowCount = 0;
    let sample: unknown = null;
    try {
      const json = JSON.parse(text);
      const values = json?.data?.[0]?.values;
      rowCount = Array.isArray(values) ? values.length : 0;
      sample = Array.isArray(values) ? values.slice(-3) : json;
    } catch {
      sample = text.slice(0, 200);
    }
    return { metric, status: res.status, ok: res.ok, rowCount, sample };
  } catch (err) {
    return { metric, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "60");
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const toIso = to.toISOString().replace(/\.\d{3}Z$/, "+00:00");

  const candidates = [
    "subscribers",
    "Subscribers",
    "followers",
    "Followers",
    "subscriberCount",
    "totalSubscribers",
    "channelSubscribers",
    "subscribersCount",
    "totalFollowers",
    "gained",
    "subscribersGained",
  ];

  const results = await Promise.all(candidates.map((m) => tryMetric(m, fromIso, toIso)));
  return NextResponse.json({ from: fromIso, to: toIso, results });
}
