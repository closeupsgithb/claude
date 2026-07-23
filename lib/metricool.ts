const METRICOOL_TIMELINES_URL = "https://app.metricool.com/api/v2/analytics/timelines";

export type SeriesPoint = { date: string; value: number };

export type NetworkKey = "instagram" | "facebook";

export type NetworkSnapshot = {
  followers: number;
  followersDelta: number;
  followersSeries: SeriesPoint[];
  reach: number;
  reachSeries: SeriesPoint[];
  interactions: number;
  interactionsSeries: SeriesPoint[];
  posts: number;
};

// Field names validated directly against Metricool's /v2/analytics/timelines
// endpoint (its accepted values differ from the Data Studio field IDs used
// elsewhere in Metricool's product, e.g. "Followers" not "IGEV01").
const METRIC_FIELD: Record<NetworkKey, { followers: string; reach: string; interactions: string; posts: string }> = {
  instagram: { followers: "Followers", reach: "reach", interactions: "postsInteractions", posts: "postsCount" },
  // Facebook's Page-level reach/impressions fields returned no data for this
  // account; page_media_view is the closest working visibility proxy.
  facebook: { followers: "pageFollows", reach: "page_media_view", interactions: "postsInteractions", posts: "postsCount" },
};

class MissingCredentialsError extends Error {
  constructor() {
    super("MISSING_CREDENTIALS");
  }
}

async function fetchTimeline(params: {
  network: NetworkKey;
  metric: string;
  from: string;
  to: string;
  blogId: number;
}): Promise<SeriesPoint[]> {
  const userToken = process.env.METRICOOL_USER_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  if (!userToken || !userId) {
    throw new MissingCredentialsError();
  }

  const url = new URL(METRICOOL_TIMELINES_URL);
  url.searchParams.set("network", params.network);
  url.searchParams.set("metric", params.metric);
  url.searchParams.set("subject", "account");
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
  url.searchParams.set("blogId", String(params.blogId));
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    headers: { "X-Mc-Auth": userToken },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Metricool ${res.status} (${params.network}/${params.metric}): ${body}`);
  }

  const json = (await res.json()) as { data?: Array<{ values?: Array<{ dateTime: string; value: number }> }> };
  const values = json.data?.[0]?.values ?? [];

  return values
    .map((v) => ({ date: v.dateTime, value: Number(v.value) }))
    .filter((v) => Number.isFinite(v.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sum(series: SeriesPoint[]): number {
  return series.reduce((acc, p) => acc + p.value, 0);
}

export async function fetchNetworkSnapshot(
  network: NetworkKey,
  blogId: number,
  from: string,
  to: string
): Promise<NetworkSnapshot> {
  const fields = METRIC_FIELD[network];

  const [followersSeries, reachSeries, interactionsSeries, postsSeries] = await Promise.all([
    fetchTimeline({ network, metric: fields.followers, from, to, blogId }),
    fetchTimeline({ network, metric: fields.reach, from, to, blogId }),
    fetchTimeline({ network, metric: fields.interactions, from, to, blogId }),
    fetchTimeline({ network, metric: fields.posts, from, to, blogId }),
  ]);

  const followers = followersSeries.at(-1)?.value ?? 0;
  const followersStart = followersSeries[0]?.value ?? followers;

  return {
    followers,
    followersDelta: followers - followersStart,
    followersSeries,
    reach: sum(reachSeries),
    reachSeries,
    interactions: sum(interactionsSeries),
    interactionsSeries,
    posts: sum(postsSeries),
  };
}

export { MissingCredentialsError };
