import { NextResponse } from "next/server";

// TEMPORARY diagnostic route used to inspect the raw shape of Metricool's
// YouTube REST endpoints before building the real integration. Not linked
// from any UI. Remove before merging to production.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const METRICOOL_BASE = "https://app.metricool.com/api";
const BRAND_ID_ES = 5991450;

async function tryEndpoint(path: string, params: Record<string, string>) {
  const userToken = process.env.METRICOOL_USER_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  if (!userToken || !userId) {
    return { path, ok: false, status: 0, body: "MISSING_CREDENTIALS" };
  }
  const url = new URL(`${METRICOOL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("userId", userId);
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Mc-Auth": userToken },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json?.data)) {
        body = { dataLength: json.data.length, sample: json.data.slice(0, 3) };
      } else {
        body = json;
      }
    } catch {
      body = text.slice(0, 500);
    }
    return { path, ok: res.ok, status: res.status, body };
  } catch (err) {
    return { path, ok: false, status: -1, body: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "30");
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const toIso = to.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const params = { from: fromIso, to: toIso, blogId: String(BRAND_ID_ES) };

  const candidates = [
    "/v2/analytics/countries/youtube",
    "/v2/analytics/demographics/youtube",
  ];

  const timelineMetricCandidates = ["subscribers", "videoViews", "views", "gained", "lost", "engagement", "likes"];

  const [results, timelineResults] = await Promise.all([
    Promise.all(candidates.map((p) => tryEndpoint(p, { ...params, network: "youtube" }))),
    Promise.all(
      timelineMetricCandidates.map((metric) =>
        tryEndpoint("/v2/analytics/timelines", { ...params, network: "youtube", metric, subject: "account" })
      )
    ),
  ]);

  return NextResponse.json({ from: fromIso, to: toIso, results, timelineResults });
}
