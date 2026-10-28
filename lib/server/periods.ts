import "server-only";
import { sql } from "./db";
import { computeMetrics } from "../metrics";
import { monthLabel, periodLabel, previousRange, qaLabel } from "../format";
import type { DatasetKey, DatasetRows, Period, PeriodMetrics } from "../types";

export interface PeriodSummary {
  id: number;
  label: string;
  month_label: string;
  start_date: string;
  end_date: string;
  is_seed: boolean;
}

const toIso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

/** Gabungkan metrics hasil hitung dengan koreksi manual (overrides). */
function merge(base: PeriodMetrics, over: Partial<PeriodMetrics>): PeriodMetrics {
  const out: PeriodMetrics = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      (out as Record<string, unknown>)[k] = { ...((base as Record<string, object>)[k] ?? {}), ...v };
    }
  }
  return out;
}

export async function listPeriods(): Promise<PeriodSummary[]> {
  const rows = await sql<PeriodSummary[]>`
    select id, label, month_label, start_date, end_date, is_seed from periods order by start_date desc`;
  return rows.map((r) => ({ ...r, start_date: toIso(r.start_date), end_date: toIso(r.end_date) }));
}

export async function getPeriod(id: number): Promise<Period | null> {
  const rows = await sql`select * from periods where id = ${id}`;
  if (!rows[0]) return null;
  const r = rows[0];
  const ups = await sql`select dataset, row_count, filename, uploaded_at from uploads where period_id = ${id}`;
  return {
    id: r.id,
    label: r.label,
    month_label: r.month_label,
    start_date: toIso(r.start_date),
    end_date: toIso(r.end_date),
    is_seed: r.is_seed,
    metrics: merge(r.metrics ?? {}, r.overrides ?? {}),
    datasets: Object.fromEntries(
      ups.map((u) => [u.dataset, { rows: u.row_count, filename: u.filename, uploaded_at: String(u.uploaded_at) }]),
    ),
  };
}

/** Periode terpilih + hingga 2 periode sebelumnya (untuk tren 3 bulan). */
export async function getPeriodBundle(id?: number) {
  const all = await listPeriods();
  if (!all.length) return { all, current: null, history: [] as Period[] };
  const target = all.find((p) => p.id === id) ?? all.find((p) => !p.is_seed) ?? all[0];
  const idx = all.findIndex((p) => p.id === target.id);
  const ids = all.slice(idx, idx + 3).map((p) => p.id);
  const periods = (await Promise.all(ids.map(getPeriod))).filter(Boolean) as Period[];
  // history: dari terlama ke terbaru, termasuk current di akhir
  return { all, current: periods[0], history: [...periods].reverse() };
}

export async function createPeriod(start: string, end: string) {
  const rows = await sql`
    insert into periods (label, month_label, start_date, end_date)
    values (${periodLabel(start, end)}, ${monthLabel(end)}, ${start}, ${end})
    on conflict (start_date, end_date) do update set updated_at = now()
    returning id`;
  return rows[0].id as number;
}

export async function saveChunk(opts: {
  periodId: number;
  dataset: DatasetKey;
  chunk: number;
  totalChunks: number;
  totalRows: number;
  rows: unknown[];
  filename: string;
  userId: number;
}) {
  const { periodId, dataset, chunk, rows } = opts;
  await sql.begin(async (tx) => {
    if (chunk === 0) await tx`delete from raw_rows where period_id = ${periodId} and dataset = ${dataset}`;
    await tx`insert into raw_rows (period_id, dataset, chunk, rows)
      values (${periodId}, ${dataset}, ${chunk}, ${tx.json(rows as never)})
      on conflict (period_id, dataset, chunk) do update set rows = excluded.rows`;
    if (chunk === opts.totalChunks - 1) {
      await tx`insert into uploads (period_id, dataset, filename, row_count, uploaded_by)
        values (${periodId}, ${dataset}, ${opts.filename}, ${opts.totalRows}, ${opts.userId})
        on conflict (period_id, dataset) do update set filename = excluded.filename,
          row_count = excluded.row_count, uploaded_by = excluded.uploaded_by, uploaded_at = now()`;
    }
  });
}

export async function recompute(periodId: number) {
  const [p] = await sql`select start_date, end_date from periods where id = ${periodId}`;
  if (!p) throw new Error("Periode tidak ditemukan");
  const start = toIso(p.start_date);
  const end = toIso(p.end_date);
  const chunks = await sql`select dataset, rows from raw_rows where period_id = ${periodId} order by dataset, chunk`;
  const data: DatasetRows = {};
  for (const c of chunks) {
    const k = c.dataset as DatasetKey;
    ((data as Record<string, unknown[]>)[k] ??= []).push(...(c.rows as unknown[]));
  }
  const prev = previousRange(start, end);
  const metrics = computeMetrics(data, { start, end, qaLabel: qaLabel(prev.start, prev.end) });
  await sql`update periods set metrics = ${sql.json(metrics as never)}, is_seed = false, updated_at = now() where id = ${periodId}`;
  return metrics;
}

export async function setOverrides(periodId: number, overrides: Partial<PeriodMetrics>) {
  await sql`update periods set overrides = ${sql.json(overrides as never)}, updated_at = now() where id = ${periodId}`;
}

export async function getOverrides(periodId: number): Promise<Partial<PeriodMetrics>> {
  const [r] = await sql`select overrides from periods where id = ${periodId}`;
  return r?.overrides ?? {};
}

/** Metrics hasil hitung otomatis (tanpa koreksi manual). */
export async function getAutoMetrics(periodId: number): Promise<PeriodMetrics> {
  const [r] = await sql`select metrics from periods where id = ${periodId}`;
  return r?.metrics ?? {};
}

export async function deletePeriod(periodId: number) {
  await sql`delete from periods where id = ${periodId}`;
}
