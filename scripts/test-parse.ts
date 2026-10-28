import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse";
import { computeMetrics } from "../lib/metrics";
import type { DatasetRows } from "../lib/types";
const dir = process.argv[2];
const data: DatasetRows = {};
for (const f of readdirSync(dir)) {
  if (!/\.xlsx?$/.test(f)) continue;
  const p = parseWorkbook(readFileSync(`${dir}/${f}`), f);
  console.log(f, "->", p.dataset, p.info);
  (data as any)[p.dataset] = p.rows;
}
const m = computeMetrics(data, { start: "2026-09-26", end: "2026-10-25", qaLabel: "26 Agustus - 25 September 2026" });
writeFileSync(process.argv[3], JSON.stringify(m, null, 1));
writeFileSync(process.argv[4], JSON.stringify(data));
