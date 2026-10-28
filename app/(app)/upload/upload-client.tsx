"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, FileSpreadsheet, Loader2, Plus, Sparkles, Trash2, UploadCloud, XCircle } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { DATASETS, type DatasetKey, type Period } from "@/lib/types";
import { defaultRange, fmtNum } from "@/lib/format";
import type { PeriodSummary } from "@/lib/server/periods";

interface Item {
  file: File;
  status: "parsing" | "ready" | "error" | "uploading" | "done";
  dataset?: DatasetKey;
  rows?: unknown[];
  info?: string;
  error?: string;
  progress?: number;
}

const CHUNK = 1000;

export function UploadClient({ periods }: { periods: PeriodSummary[] }) {
  const router = useRouter();
  const [periodId, setPeriodId] = useState<number | undefined>(periods.find((p) => !p.is_seed)?.id ?? periods[0]?.id);
  const [creating, setCreating] = useState(periods.length === 0);
  const [range, setRange] = useState(defaultRange());
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [detail, setDetail] = useState<{ period: Period; overrides: Record<string, unknown> } | null>(null);
  const [drag, setDrag] = useState(false);

  const loadDetail = useCallback(async (id?: number) => {
    if (!id) return setDetail(null);
    const r = await fetch(`/api/periods/${id}`);
    if (r.ok) setDetail(await r.json());
  }, []);
  useEffect(() => {
    loadDetail(periodId);
  }, [periodId, loadDetail]);

  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => /\.xlsx?$/i.test(f.name));
    const start = items.length;
    setItems((x) => [...x, ...list.map((file) => ({ file, status: "parsing" as const }))]);
    const { parseWorkbook } = await import("@/lib/parse");
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        const buf = await f.arrayBuffer();
        const res = parseWorkbook(buf, f.name);
        setItems((x) => x.map((it, j) => (j === start + i ? { ...it, status: "ready", dataset: res.dataset, rows: res.rows, info: res.info } : it)));
      } catch (e) {
        setItems((x) => x.map((it, j) => (j === start + i ? { ...it, status: "error", error: e instanceof Error ? e.message : String(e) } : it)));
      }
    }
  }

  async function createPeriod() {
    const r = await fetch("/api/periods", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(range) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setPeriodId(d.id);
    setCreating(false);
    router.refresh();
    return d.id as number;
  }

  async function upload() {
    setBusy(true);
    setMsg(null);
    try {
      const pid = creating ? await createPeriod() : periodId;
      if (!pid) throw new Error("Pilih atau buat periode terlebih dahulu");
      const ready = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.status === "ready");
      for (const { it, idx } of ready) {
        const rows = it.rows!;
        const total = Math.max(1, Math.ceil(rows.length / CHUNK));
        setItems((x) => x.map((v, j) => (j === idx ? { ...v, status: "uploading", progress: 0 } : v)));
        for (let c = 0; c < total; c++) {
          const r = await fetch(`/api/periods/${pid}/upload`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dataset: it.dataset, filename: it.file.name, chunk: c, totalChunks: total, totalRows: rows.length, rows: rows.slice(c * CHUNK, (c + 1) * CHUNK) }),
          });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Upload ${it.file.name} gagal`);
          setItems((x) => x.map((v, j) => (j === idx ? { ...v, progress: (c + 1) / total } : v)));
        }
        setItems((x) => x.map((v, j) => (j === idx ? { ...v, status: "done" } : v)));
      }
      const rc = await fetch(`/api/periods/${pid}/recompute`, { method: "POST" });
      if (!rc.ok) throw new Error((await rc.json()).error);
      setMsg({ tone: "ok", text: `${ready.length} file berhasil diproses. Dashboard sudah diperbarui.` });
      await loadDetail(pid);
      router.refresh();
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function generateAi() {
    if (!periodId) return;
    setBusy(true);
    setMsg({ tone: "ok", text: "AI sedang menyusun narasi untuk semua slide (± 1–3 menit)…" });
    const r = await fetch(`/api/periods/${periodId}/insights/generate`, { method: "POST" });
    const d = await r.json().catch(() => ({ error: "Respons tidak valid" }));
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: `Narasi AI berhasil dibuat untuk ${d.slides} slide (model ${d.model}).` } : { tone: "err", text: d.error });
    router.refresh();
  }

  const uploaded = detail?.period.datasets ?? {};

  return (
    <div>
      <SectionTitle title="Upload Raw Data" desc="Seret semua file Excel sekaligus — jenis file terdeteksi otomatis dari header kolom." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="1. Periode Laporan" className="xl:col-span-1">
          {!creating ? (
            <div className="space-y-3">
              <select value={periodId} onChange={(e) => setPeriodId(Number(e.target.value))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.is_seed ? " (historis)" : ""}
                  </option>
                ))}
              </select>
              <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                <Plus size={16} /> Buat periode baru
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-ink-3">
                  Mulai
                  <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink" />
                </label>
                <label className="text-xs text-ink-3">
                  Selesai
                  <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink" />
                </label>
              </div>
              <p className="text-xs text-ink-3">Periode standar: tanggal 26 s/d 25 bulan berikutnya. Periode dibuat saat upload.</p>
              {periods.length > 0 && (
                <button onClick={() => setCreating(false)} className="text-sm font-semibold text-ink-3">
                  Batal, pilih periode yang ada
                </button>
              )}
            </div>
          )}

          {detail && !creating && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Status raw data</div>
              <ul className="space-y-1.5 text-sm">
                {DATASETS.map((d) => {
                  const u = uploaded[d.key];
                  return (
                    <li key={d.key} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {u ? <CheckCircle2 size={16} className="text-brand" /> : <CircleDashed size={16} className="text-ink-3" />}
                        {d.label}
                      </span>
                      <span className="text-xs text-ink-3">{u ? `${fmtNum(u.rows)} baris` : "belum"}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={busy} onClick={generateAi} className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-ink ring-1 ring-brand/20 disabled:opacity-60">
                  <Sparkles size={16} /> Generate Narasi AI
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (!periodId || !confirm(`Hapus periode "${detail.period.label}" beserta seluruh datanya?`)) return;
                    await fetch(`/api/periods/${periodId}`, { method: "DELETE" });
                    location.reload();
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-500/30"
                >
                  <Trash2 size={16} /> Hapus periode
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="2. File Raw Data" className="xl:col-span-2">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            className={clsx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
              drag ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50 hover:bg-surface-2",
            )}
          >
            <UploadCloud className="text-brand" size={32} />
            <span className="font-semibold">Seret file ke sini atau klik untuk memilih</span>
            <span className="text-xs text-ink-3">.xls / .xlsx · file diproses di browser, ukuran besar (&gt; 2 MB) aman</span>
            <input type="file" multiple accept=".xls,.xlsx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </label>

          {items.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-2xl ring-1 ring-line">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <FileSpreadsheet size={18} className="shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.file.name}</div>
                    <div className="text-xs text-ink-3">
                      {it.status === "parsing" && "Membaca file…"}
                      {it.status === "error" && <span className="text-red-600">{it.error}</span>}
                      {(it.status === "ready" || it.status === "uploading" || it.status === "done") && (
                        <>
                          <b className="text-ink-2">{DATASETS.find((d) => d.key === it.dataset)?.label}</b> · {it.info}
                        </>
                      )}
                    </div>
                    {it.status === "uploading" && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full bg-brand transition-all" style={{ width: `${(it.progress ?? 0) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  {it.status === "parsing" && <Loader2 size={16} className="animate-spin text-ink-3" />}
                  {it.status === "uploading" && <Loader2 size={16} className="animate-spin text-brand" />}
                  {it.status === "done" && <CheckCircle2 size={16} className="text-brand" />}
                  {it.status === "error" && <XCircle size={16} className="text-red-600" />}
                  {(it.status === "ready" || it.status === "error") && (
                    <button onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="text-xs text-ink-3 hover:text-red-600">
                      hapus
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {msg && (
            <div className={clsx("mt-4 rounded-xl px-4 py-3 text-sm", msg.tone === "ok" ? "bg-brand-soft text-brand-ink" : "bg-red-500/10 text-red-700 dark:text-red-300")}>{msg.text}</div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              disabled={busy || !items.some((i) => i.status === "ready")}
              onClick={upload}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Upload & Proses
            </button>
          </div>
        </Card>
      </div>

      {detail && !creating && (
        <Card className="mt-4" title="Input Manual Quality Score" subtitle="Skor total, per parameter, dan per agent untuk Inbound, Outbound, dan Chat bisa diisi manual.">
          <Link href={`/quality-input?p=${detail.period.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Buka Input Quality
          </Link>
        </Card>
      )}
    </div>
  );
}
