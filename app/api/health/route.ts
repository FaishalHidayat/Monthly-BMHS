import { sql } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [r] = await sql`select count(*)::int as periods from periods`;
    return Response.json({ ok: true, db: "connected", periods: r.periods });
  } catch (e) {
    return Response.json({ ok: false, db: "error", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
