import type { ContentItem } from "@/lib/metricool";

export type ContentGroupKind = "producto" | "técnica";

export type ContentGroupResult = {
  name: string;
  kind: ContentGroupKind;
  count: number;
  avgEngagement: number;
  totalInteractions: number;
};

export type ContentAnalysis = {
  standouts: ContentGroupResult[];
  mostMentioned: ContentGroupResult | null;
  periodMeanEngagement: number;
  unconfirmedTerms: string[];
};

// Generic, brand-independent fishing technique vocabulary — safe to match
// literally since these are standard industry terms, not guesses about what
// Shimano sells.
const TECHNIQUE_PATTERNS: { label: string; patterns: string[] }[] = [
  { label: "Surfcasting", patterns: ["surfcasting", "surf casting"] },
  { label: "Carpfishing", patterns: ["carpfishing", "carp fishing", "carp & roll", "carp and roll"] },
  { label: "Pesca de altura / Big Game", patterns: ["big game", "biggame", "pesca de altura"] },
  { label: "Spinning", patterns: ["spinning"] },
  { label: "Feeder", patterns: ["feeder"] },
  { label: "Curricán / Trolling", patterns: ["curricán", "curriean", "currican", "trolling"] },
  { label: "Pesca a mosca / Fly fishing", patterns: ["fly fishing", "flyfishing", "pesca a mosca", "montaje de moscas"] },
  { label: "Jigging", patterns: ["jigging"] },
  { label: "Eging", patterns: ["eging"] },
];

// Family names that are structurally "Shimano <Word>" but aren't products
// (channel/brand references), so they're excluded from product detection.
const PRODUCT_STOP_WORDS = new Set(["Fishing", "Reels", "Iberia", "Spain", "España", "Team", "Life"]);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractHashtags(text: string): string[] {
  return Array.from(text.matchAll(/#(\w+)/g)).map((m) => m[1]);
}

// Only trusts a "product family" when it's literally written as "Shimano
// <Name>" somewhere in the period's captions — this is Shimano's own team
// naming their own product, not an inference. Extraction is capped at two
// words after "Shimano" so that, e.g., "Aero Technium Competition 420CX" and
// "Aero Technium MGS 14000 XSD" both collapse to the shared family "Aero
// Technium" instead of being treated as two unrelated model names.
function extractConfirmedProductFamilies(items: ContentItem[]): Map<string, { display: string; ids: Set<string> }> {
  const families = new Map<string, { display: string; ids: Set<string> }>();
  const wordPattern = /(?:[A-ZÀ-Ý][a-zà-ÿ]+|[A-Z]{2,5})/;
  const regex = new RegExp(`Shimano\\s+(${wordPattern.source})(?:\\s+(${wordPattern.source}))?`, "g");

  for (const item of items) {
    if (!item.content) continue;
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(item.content))) {
      const w1 = m[1];
      if (!w1 || PRODUCT_STOP_WORDS.has(w1)) continue;
      const w2 = m[2] && !PRODUCT_STOP_WORDS.has(m[2]) ? m[2] : null;
      const display = w2 ? `${w1} ${w2}` : w1;
      const key = normalize(display);
      if (key.length < 4) continue; // avoid noisy single short tokens
      if (!families.has(key)) families.set(key, { display, ids: new Set() });
      families.get(key)!.ids.add(item.id);
    }
  }
  return families;
}

export function analyzeContent(items: ContentItem[]): ContentAnalysis {
  const withText = items.filter((i) => i.content);
  const confirmedFamilies = extractConfirmedProductFamilies(withText);

  // Extend recall: an item that mentions a confirmed family only via hashtag
  // (e.g. #AeroTechnium, no literal "Shimano Aero Technium" in that specific
  // caption) is folded into that same, already-verified family — never used
  // to invent a new one.
  for (const item of withText) {
    const tags = extractHashtags(item.content).map(normalize);
    for (const [key, group] of confirmedFamilies) {
      if (group.ids.has(item.id)) continue;
      if (tags.some((t) => t.includes(key))) group.ids.add(item.id);
    }
  }

  // Hashtag-only terms that never got confirmed via a literal "Shimano X"
  // mention this period — surfaced for human review, never auto-classified.
  const unconfirmedCounts = new Map<string, number>();
  for (const item of withText) {
    const tags = extractHashtags(item.content);
    for (const tag of tags) {
      const norm = normalize(tag);
      if (norm.length < 5) continue;
      const isConfirmed = Array.from(confirmedFamilies.keys()).some((k) => norm.includes(k) || k.includes(norm));
      if (!isConfirmed && /shimano/.test(norm)) {
        unconfirmedCounts.set(tag, (unconfirmedCounts.get(tag) ?? 0) + 1);
      }
    }
  }
  const unconfirmedTerms = Array.from(unconfirmedCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([tag]) => tag);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const allEngagements = items.map((i) => i.engagementRate).filter((v): v is number => v !== null);
  const periodMeanEngagement = allEngagements.length > 0 ? allEngagements.reduce((a, b) => a + b, 0) / allEngagements.length : 0;

  function toGroupResult(name: string, kind: ContentGroupKind, ids: Set<string>): ContentGroupResult | null {
    const groupItems = Array.from(ids)
      .map((id) => itemById.get(id))
      .filter((i): i is ContentItem => !!i);
    const engagements = groupItems.map((i) => i.engagementRate).filter((v): v is number => v !== null);
    if (engagements.length === 0) return null;
    return {
      name,
      kind,
      count: groupItems.length,
      avgEngagement: engagements.reduce((a, b) => a + b, 0) / engagements.length,
      totalInteractions: groupItems.reduce((a, i) => a + i.interactions, 0),
    };
  }

  const groups: ContentGroupResult[] = [];

  for (const [, group] of confirmedFamilies) {
    const r = toGroupResult(group.display, "producto", group.ids);
    if (r && r.count >= 3) groups.push(r);
  }

  for (const tech of TECHNIQUE_PATTERNS) {
    const ids = new Set<string>();
    for (const item of withText) {
      const norm = normalize(item.content);
      if (tech.patterns.some((p) => norm.includes(normalize(p)))) ids.add(item.id);
    }
    const r = toGroupResult(tech.label, "técnica", ids);
    if (r && r.count >= 3) groups.push(r);
  }

  const standouts = groups
    .filter((g) => periodMeanEngagement > 0 && g.avgEngagement > periodMeanEngagement * 1.3)
    .sort((a, b) => b.avgEngagement / periodMeanEngagement - a.avgEngagement / periodMeanEngagement)
    .slice(0, 3);

  const mostMentioned =
    standouts.length === 0 && groups.length > 0 ? groups.slice().sort((a, b) => b.count - a.count)[0] : null;

  return { standouts, mostMentioned, periodMeanEngagement, unconfirmedTerms };
}
