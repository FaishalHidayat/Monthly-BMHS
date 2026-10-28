import { sql } from "@/lib/server/db";
import { getPeriodBundle, listPeriods } from "@/lib/server/periods";
import { getInsights } from "@/lib/server/insights";

export const dynamic = "force-dynamic";

// ?deep=1 menjalankan query yang sama dengan dashboard (paralel) untuk cek performa koneksi.
export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const [r] = await sql`select count(*)::int as periods from periods`;
    if (new URL(req.url).searchParams.get("deep")) {
      const [bundle] = await Promise.all([getPeriodBundle(), listPeriods(), listPeriods()]);
      await getInsights(bundle.history);
      return Response.json({ ok: true, db: "connected", periods: r.periods, deepMs: Date.now() - t0, region: process.env.VERCEL_REGION ?? null });
    }
    return Response.json({ ok: true, db: "connected", periods: r.periods, ms: Date.now() - t0 });
  } catch (e) {
    return Response.json({ ok: false, db: "error", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
