import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { availablePeriods, buildReport, type PeriodKind } from "@/lib/report/data";
import { renderReportHtml } from "@/lib/report/render";
import { buildAssets, htmlToPdf } from "@/lib/report/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Informe descargable (PDF) a partir del histórico guardado.
 *   /api/informe?tipo=mes&id=2026-10            → PDF del mes
 *   /api/informe?tipo=trimestre&id=2026-Q3      → PDF del trimestre
 *   añadir &formato=html para verlo en el navegador sin generar el PDF
 *   /api/informe?periodos=1                     → lista de periodos disponibles
 * Cualquiera con el enlace del dashboard puede generarlo (decisión de Closeup: el enlace es privado).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: "MISSING_DATABASE_URL" }, { status: 503 });

  if (searchParams.get("periodos")) {
    return NextResponse.json(await availablePeriods(sql));
  }

  const tipo = (searchParams.get("tipo") ?? "mes") as PeriodKind;
  const id = searchParams.get("id") ?? "";
  const okId = tipo === "mes" ? /^\d{4}-(0[1-9]|1[0-2])$/.test(id) : tipo === "trimestre" ? /^\d{4}-Q[1-4]$/.test(id) : false;
  if (!okId) return NextResponse.json({ error: "BAD_PERIOD", detail: "tipo=mes&id=AAAA-MM o tipo=trimestre&id=AAAA-Qn" }, { status: 400 });

  try {
    const data = await buildReport(sql, tipo, id);
    if ("error" in data) return NextResponse.json(data, { status: data.error === "SIN_DATOS" ? 404 : 400 });
    const assets = await buildAssets(data);
    const html = renderReportHtml(data, assets);
    if (searchParams.get("formato") === "html") {
      return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    const pdf = await htmlToPdf(html);
    const name = `Informe_Shimano_Iberia_${id}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "REPORT_ERROR", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
