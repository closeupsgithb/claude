import type { ReportData } from "./data";
import type { Assets } from "./render";

/** Descarga una imagen y la devuelve como data URI (las URL de Instagram/Facebook caducan, el PDF no debe depender de ellas). */
async function toDataUri(url: string | null | undefined, maxBytes = 1_500_000): Promise<string | null> {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes || buf.length < 200) return null;
    const type = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function buildAssets(d: ReportData): Promise<Assets> {
  const pieces = [...Object.values(d.top).flat(), ...d.youtube.top];
  const unique = new Map(pieces.map((p) => [p.id, p]));
  const entries = await Promise.all(
    [...unique.values()].map(async (p) => [p.id, await toDataUri(p.image)] as const)
  );
  const thumbs: Record<string, string> = {};
  for (const [id, uri] of entries) if (uri) thumbs[id] = uri;
  const hero = d.hero ? (thumbs[d.hero.id] ?? (await toDataUri(d.hero.image, 2_500_000))) : null;
  return { hero, thumbs };
}

const WIN_CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

/** HTML → PDF. En Vercel usa un Chromium para servidores; en local usa el Chrome instalado (variable CHROME_PATH). */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import("puppeteer-core")).default;
  const onVercel = !!process.env.VERCEL;
  let browser;
  if (onVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  } else {
    const { existsSync } = await import("node:fs");
    const exe = process.env.CHROME_PATH || WIN_CHROME_CANDIDATES.find((p) => existsSync(p));
    if (!exe) throw new Error("No se encontró Chrome: define CHROME_PATH");
    browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] });
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
