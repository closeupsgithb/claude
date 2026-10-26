import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { ingestRange } from "@/lib/history";
import { MissingCredentialsError } from "@/lib/metricool";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Guarda en Neon los datos de Metricool para que no se pierdan a los 90 días.
 *  - Sin parámetros: últimos 14 días (lo ejecuta Vercel Cron cada día; reescribe sin duplicar).
 *  - ?from=AAAA-MM-DD&to=AAAA-MM-DD: relleno histórico (se trocea en ventanas de 80 días).
 * Protegido con CRON_SECRET: Vercel Cron lo envía solo en la cabecera Authorization.
 * Para lanzarlo a mano: /api/cron/snapshot?key=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const ok = !!secret && (auth === `Bearer ${secret}` || searchParams.get("key") === secret);
  if (!ok) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const sql = getSql();
  if (!sql) return NextResponse.json({ error: "MISSING_DATABASE_URL" }, { status: 503 });

  const to = searchParams.get("to") ? new Date(`${searchParams.get("to")}T23:59:59Z`) : new Date();
  const from = searchParams.get("from")
    ? new Date(`${searchParams.get("from")}T00:00:00Z`)
    : new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ error: "BAD_RANGE" }, { status: 400 });
  }
  // Un solo trozo por llamada para no pasar del tiempo máximo de la función.
  if (to.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "RANGE_TOO_LONG", detail: "Máximo 90 días por llamada; repite con el siguiente tramo." }, { status: 400 });
  }

  try {
    const kind = searchParams.get("from") ? "backfill" : "daily";
    const res = await ingestRange(sql, from, to, kind);
    return NextResponse.json({ ok: true, kind, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), ...res });
  } catch (err) {
    if (err instanceof MissingCredentialsError) {
      return NextResponse.json({ error: "MISSING_CREDENTIALS" }, { status: 503 });
    }
    return NextResponse.json({ error: "INGEST_ERROR", detail: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
