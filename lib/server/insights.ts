import "server-only";
import { sql } from "./db";
import { ruleInsights } from "../report/rule-insights";
import type { InsightMap, Period, SlideInsight } from "../types";

export type InsightSource = "ai" | "rule" | "manual";

/** Teks tersimpan di DB menimpa draf otomatis; slide tanpa simpanan pakai draf aturan. */
export async function getInsights(history: Period[]): Promise<{ map: InsightMap; sources: Record<string, InsightSource> }> {
  const cur = history[history.length - 1];
  const map = ruleInsights(history);
  const sources: Record<string, InsightSource> = Object.fromEntries(Object.keys(map).map((k) => [k, "rule"]));
  if (!cur) return { map, sources };
  const rows = await sql<{ slide_key: string; highlight: string[]; action: string[]; source: InsightSource }[]>`
    select slide_key, highlight, action, source from insights where period_id = ${cur.id}`;
  for (const r of rows) {
    map[r.slide_key] = { highlight: r.highlight, action: r.action };
    sources[r.slide_key] = r.source;
  }
  return { map, sources };
}

export async function saveInsights(periodId: number, map: Record<string, SlideInsight>, source: InsightSource) {
  await sql.begin(async (tx) => {
    for (const [key, v] of Object.entries(map)) {
      await tx`insert into insights (period_id, slide_key, highlight, action, source)
        values (${periodId}, ${key}, ${tx.json(v.highlight)}, ${tx.json(v.action)}, ${source})
        on conflict (period_id, slide_key) do update set highlight = excluded.highlight,
          action = excluded.action, source = excluded.source, updated_at = now()`;
    }
  });
}

export async function resetInsights(periodId: number) {
  await sql`delete from insights where period_id = ${periodId}`;
}
