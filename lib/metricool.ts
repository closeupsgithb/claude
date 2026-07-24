const METRICOOL_BASE = "https://app.metricool.com/api";

export type SeriesPoint = { date: string; value: number };

export type NetworkKey = "instagram" | "facebook";
export type CountryKey = "es" | "pt";

export type NetworkSnapshot = {
  followers: number;
  followersDelta: number;
  followersSeries: SeriesPoint[];
  reach: number;
  reachSeries: SeriesPoint[];
  interactions: number;
  interactionsSeries: SeriesPoint[];
  posts: number;
  secondaryLabel: string;
  secondary: number;
};

export type AdsTotals = {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

export type AdsBreakdown = {
  total: AdsTotals;
  es: AdsTotals;
  pt: AdsTotals;
  unclassified: AdsTotals;
  spendSeries: SeriesPoint[];
  impressionsSeries: SeriesPoint[];
  clicksSeries: SeriesPoint[];
};

export type ContentItem = {
  id: string;
  network: NetworkKey;
  country: CountryKey;
  url: string;
  image: string | null;
  date: string;
  type: string;
  reach: number;
  interactions: number;
  engagementRate: number;
};

const METRIC_FIELD: Record<NetworkKey, { followers: string; reach: string; interactions: string; posts: string }> = {
  instagram: { followers: "Followers", reach: "reach", interactions: "postsInteractions", posts: "postsCount" },
  facebook: { followers: "pageFollows", reach: "page_media_view", interactions: "postsInteractions", posts: "postsCount" },
};

const SECONDARY_METRIC: Record<NetworkKey, { label: string; metric: string; subject: string }> = {
  instagram: { label: "Visualizaciones de Reels", metric: "views", subject: "reels" },
  facebook: { label: "Visitas a la página", metric: "pageViews", subject: "account" },
};

const BRAND_ID: Record<CountryKey, number> = { es: 5991450, pt: 5991465 };

const IG_TYPE_LABEL: Record<string, string> = {
  FEED_IMAGE: "Imagen",
  FEED_CAROUSEL_ALBUM: "Carrusel",
  FEED_VIDEO: "Vídeo",
  REEL: "Reel",
};

const FB_TYPE_LABEL: Record<string, string> = {
  photo: "Imagen",
  video: "Vídeo",
  reel: "Reel",
  link: "Enlace",
  status: "Texto",
  album: "Carrusel",
};

class MissingCredentialsError extends Error {
  constructor() {
    super("MISSING_CREDENTIALS");
  }
}

function authHeaders(): { userToken: string; userId: string } {
  const userToken = process.env.METRICOOL_USER_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  if (!userToken || !userId) {
    throw new MissingCredentialsError();
  }
  return { userToken, userId };
}

async function metricoolGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const { userToken, userId } = authHeaders();
  const url = new URL(`${METRICOOL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    headers: { "X-Mc-Auth": userToken },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Metricool ${res.status} (${path}): ${body}`);
  }

  return (await res.json()) as T;
}

async function fetchTimeline(params: {
  network: string;
  metric: string;
  subject?: string;
  from: string;
  to: string;
  blogId: number;
}): Promise<SeriesPoint[]> {
  const json = await metricoolGet<{ data?: Array<{ values?: Array<{ dateTime: string; value: number }> }> }>(
    "/v2/analytics/timelines",
    {
      network: params.network,
      metric: params.metric,
      subject: params.subject ?? "account",
      from: params.from,
      to: params.to,
      blogId: String(params.blogId),
    }
  );

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
  const secondary = SECONDARY_METRIC[network];

  const [followersSeries, reachSeries, interactionsSeries, postsSeries, secondarySeries] = await Promise.all([
    fetchTimeline({ network, metric: fields.followers, from, to, blogId }),
    fetchTimeline({ network, metric: fields.reach, from, to, blogId }),
    fetchTimeline({ network, metric: fields.interactions, from, to, blogId }),
    fetchTimeline({ network, metric: fields.posts, from, to, blogId }),
    fetchTimeline({ network, metric: secondary.metric, subject: secondary.subject, from, to, blogId }),
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
    secondaryLabel: secondary.label,
    secondary: sum(secondarySeries),
  };
}

function finalizeTotals(t: { spend: number; reach: number; impressions: number; clicks: number }): AdsTotals {
  return {
    ...t,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    cpc: t.clicks > 0 ? t.spend / t.clicks : 0,
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0,
  };
}

// The Meta Ads account is shared between the Spain and Portugal brand
// profiles. Country is recovered from the campaign name (the confirmed
// naming convention uses the literal substrings ESPAÑA / PORTUGAL, with
// ESPANA / ESP / PT kept as defensive fallbacks). Facebook vs Instagram
// spend cannot be split reliably from the public API — Metricool only
// exposes that at the ad-set level through its internal Looker Studio
// connector, which isn't reachable with a personal API token.
function classifyCampaignCountry(name: string): CountryKey | "unknown" {
  const n = name.toUpperCase();
  if (n.includes("ESPAÑA") || n.includes("ESPANA") || n.includes("_ESP_") || n.endsWith("_ESP")) return "es";
  if (n.includes("PORTUGAL") || n.includes("_PT_") || n.endsWith("_PT")) return "pt";
  return "unknown";
}

type MetaCampaign = {
  name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spent: number;
};

export async function fetchAdsBreakdown(from: string, to: string): Promise<AdsBreakdown> {
  const [campaigns, spendSeries, impressionsSeries, clicksSeries] = await Promise.all([
    metricoolGet<{ data: MetaCampaign[] }>("/v2/analytics/campaigns/facebookads", {
      from,
      to,
      blogId: String(BRAND_ID.es),
    }).then((r) => r.data ?? []),
    fetchTimeline({ network: "facebookads", metric: "spend", from, to, blogId: BRAND_ID.es }),
    fetchTimeline({ network: "facebookads", metric: "impressions", from, to, blogId: BRAND_ID.es }),
    fetchTimeline({ network: "facebookads", metric: "clicks", from, to, blogId: BRAND_ID.es }),
  ]);

  const buckets: Record<"es" | "pt" | "unknown", { spend: number; reach: number; impressions: number; clicks: number }> = {
    es: { spend: 0, reach: 0, impressions: 0, clicks: 0 },
    pt: { spend: 0, reach: 0, impressions: 0, clicks: 0 },
    unknown: { spend: 0, reach: 0, impressions: 0, clicks: 0 },
  };

  for (const c of campaigns) {
    const country = classifyCampaignCountry(c.name ?? "");
    const bucket = buckets[country];
    bucket.spend += c.spent ?? 0;
    bucket.reach += c.reach ?? 0;
    bucket.impressions += c.impressions ?? 0;
    bucket.clicks += c.clicks ?? 0;
  }

  const total = finalizeTotals({
    spend: buckets.es.spend + buckets.pt.spend + buckets.unknown.spend,
    reach: buckets.es.reach + buckets.pt.reach + buckets.unknown.reach,
    impressions: buckets.es.impressions + buckets.pt.impressions + buckets.unknown.impressions,
    clicks: buckets.es.clicks + buckets.pt.clicks + buckets.unknown.clicks,
  });

  return {
    total,
    es: finalizeTotals(buckets.es),
    pt: finalizeTotals(buckets.pt),
    unclassified: finalizeTotals(buckets.unknown),
    spendSeries,
    impressionsSeries,
    clicksSeries,
  };
}

type IgPost = {
  postId: string;
  type: string;
  url: string;
  imageUrl?: string;
  publishedAt?: { dateTime: string };
  reach: number;
  interactions: number;
};

type FbPost = {
  postId: string;
  type: string;
  link: string;
  picture?: string;
  created?: { dateTime: string };
  timestamp?: number;
  impressionsUnique: number;
  reactions: number;
  comments: number;
  shares: number;
};

export async function fetchTopPosts(country: CountryKey, from: string, to: string): Promise<ContentItem[]> {
  const blogId = BRAND_ID[country];

  const [igRes, fbRes] = await Promise.all([
    metricoolGet<{ data: IgPost[] }>("/v2/analytics/posts/instagram", { from, to, blogId: String(blogId) }),
    metricoolGet<{ data: FbPost[] }>("/v2/analytics/posts/facebook", { from, to, blogId: String(blogId) }),
  ]);

  const igItems: ContentItem[] = (igRes.data ?? []).map((p) => ({
    id: p.postId,
    network: "instagram",
    country,
    url: p.url,
    image: p.imageUrl ?? null,
    date: p.publishedAt?.dateTime ?? "",
    type: IG_TYPE_LABEL[p.type] ?? p.type,
    reach: p.reach ?? 0,
    interactions: p.interactions ?? 0,
    engagementRate: p.reach > 0 ? (p.interactions / p.reach) * 100 : 0,
  }));

  const fbItems: ContentItem[] = (fbRes.data ?? []).map((p) => {
    const interactions = (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
    const reach = p.impressionsUnique ?? 0;
    return {
      id: p.postId,
      network: "facebook",
      country,
      url: p.link,
      image: p.picture ?? null,
      date: p.created?.dateTime ?? (p.timestamp ? new Date(p.timestamp).toISOString() : ""),
      type: FB_TYPE_LABEL[p.type] ?? p.type,
      reach,
      interactions,
      engagementRate: reach > 0 ? (interactions / reach) * 100 : 0,
    };
  });

  return [...igItems, ...fbItems];
}

export { MissingCredentialsError, BRAND_ID };
