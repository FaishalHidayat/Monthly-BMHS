"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { fmtPct } from "@/lib/format";
import type { PeriodMetrics, QualityBlock, QualityMetrics } from "@/lib/types";
import type { PeriodSummary } from "@/lib/server/periods";

type Kind = "inbound" | "outbound" | "chat";
const KINDS: { key: Kind; label: string; agents: boolean }[] = [
  { key: "inbound", label: "Inbound", agents: true },
  { key: "outbound", label: "Outbound", agents: false },
  { key: "chat", label: "Chat", agents: true },
];

// Nilai di form disimpan sebagai teks persen (mis. "94,99") agar mudah diketik.
interface Row {
  name: string;
  value: string;
}
interface Form {
  label: string;
  score: string;
  categories: Row[];
  agents: Row[];
}

const toText = (v: number | null | undefined) => (v == null ? "" : (v * 100).toFixed(2).replace(".", ","));
const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", ".").replace("%", "").trim());
  return Number.isFinite(n) ? n / 100 : null;
};

const toForm = (b?: QualityBlock): Form => ({
  label: b?.label ?? "",
  score: toText(b?.score),
  categories: (b?.categories ?? []).map((c) => ({ name: c.name, value: toText(c.pct) })),
  agents: (b?.agents ?? []).map((a) => ({ name: a.name, value: toText(a.score) })),
});

const toBlock = (f: Form): QualityBlock => ({
  label: f.label.trim(),
  score: toNum(f.score),
  categories: f.categories.filter((r) => r.name.trim() && toNum(r.value) != null).map((r) => ({ name: r.name.trim(), pct: toNum(r.value)! })),
  agents: f.agents
    .filter((r) => r.name.trim() && toNum(r.value) != null)
    .map((r) => ({ name: r.name.trim(), score: toNum(r.value)! }))
    .sort((a, b) => b.score - a.score),
});

const inputCls = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand";

export function QualityInput({ periods, initialId }: { periods: PeriodSummary[]; initialId?: number }) {
  const router = useRouter();
  const [periodId, setPeriodId] = useState(initialId);
  const [kind, setKind] = useState<Kind>("inbound");
  const [forms, setForms] = useState<Record<Kind, Form> | null>(null);
  const [overrides, setOverrides] = useState<Partial<PeriodMetrics>>({});
  const [auto, setAuto] = useState<QualityMetrics>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (id?: number) => {
    if (!id) return;
    setForms(null);
    const r = await fetch(`/api/periods/${id}`);
    const d = await r.json();
    const q: QualityMetrics = d.period.metrics.quality ?? {};
    setOverrides(d.overrides ?? {});
    setAuto(d.auto?.quality ?? {});
    setForms({ inbound: toForm(q.inbound), outbound: toForm(q.outbound), chat: toForm(q.chat) });
  }, []);
  useEffect(() => {
    setMsg(null);
    load(periodId);
  }, [periodId, load]);

  const manual = (overrides.quality ?? {}) as QualityMetrics;
  const f = forms?.[kind];
  const set = (patch: Partial<Form>) => forms && setForms({ ...forms, [kind]: { ...forms[kind], ...patch } });
  const setRow = (list: "categories" | "agents", i: number, patch: Partial<Row>) =>
    f && set({ [list]: f[list].map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  async function save(quality: QualityMetrics | null) {
    if (!periodId) return;
    setBusy(true);
    setMsg(null);
    const next = { ...overrides } as Record<string, unknown>;
    if (quality && Object.keys(quality).length) next.quality = quality;
    else delete next.quality;
    const r = await fetch(`/api/periods/${periodId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ overrides: next }) });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Tersimpan. Dashboard, narasi otomatis, dan PPT memakai angka ini." } : { ok: false, text: (await r.json()).error });
    await load(periodId);
    router.refresh();
  }

  const saveCurrent = () => {
    if (!f) return;
    const b = toBlock(f);
    if (b.score == null) return setMsg({ ok: false, text: "Score total wajib diisi (contoh: 94,99)." });
    save({ ...manual, [kind]: b });
  };
  const resetCurrent = () => {
    const rest = { ...manual };
    delete rest[kind];
    save(rest);
  };

  return (
    <div>
      <SectionTitle title="Input Manual Quality Score" desc="Isi skor quality sesuai hasil QA. Angka manual menimpa hasil hitung otomatis dari file SCORE." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={periodId} onChange={(e) => setPeriodId(Number(e.target.value))} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold">
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.is_seed ? " (historis)" : ""}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-surface p-1 ring-1 ring-line">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={clsx("rounded-lg px-4 py-1.5 text-sm font-semibold", kind === k.key ? "bg-brand text-white" : "text-ink-2 hover:text-brand")}
            >
              {k.label}
              {manual[k.key] && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle" title="Manual" />}
            </button>
          ))}
        </div>
      </div>

      {!f ? (
        <div className="card flex items-center gap-2 p-6 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            title={`Quality ${KINDS.find((k) => k.key === kind)!.label}`}
            right={<Pill tone={manual[kind] ? "brand" : "neutral"}>{manual[kind] ? "Manual" : "Otomatis"}</Pill>}
          >
            <label className="block text-xs font-semibold text-ink-3">
              Label periode QA
              <input value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="26 Agustus'26 - 25 September'26" className={clsx(inputCls, "mt-1")} />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-3">
              Score total (%)
              <input value={f.score} onChange={(e) => set({ score: e.target.value })} placeholder="94,99" inputMode="decimal" className={clsx(inputCls, "mt-1 text-lg font-bold")} />
            </label>
            <p className="mt-3 text-xs text-ink-3">
              Hasil otomatis dari file: <b>{fmtPct(auto[kind]?.score)}</b>
              {auto[kind]?.label ? ` (${auto[kind]!.label})` : ""}
            </p>
            {msg && <p className={clsx("mt-3 text-sm", msg.ok ? "text-brand" : "text-red-600")}>{msg.text}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy} onClick={saveCurrent} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan
              </button>
              {manual[kind] && (
                <button disabled={busy} onClick={resetCurrent} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-2 ring-1 ring-line">
                  <RotateCcw size={15} /> Kembali ke otomatis
                </button>
              )}
            </div>
          </Card>

          <RowsEditor
            title="Score per Parameter"
            nameLabel="Parameter"
            rows={f.categories}
            onChange={(i, p) => setRow("categories", i, p)}
            onAdd={() => set({ categories: [...f.categories, { name: "", value: "" }] })}
            onRemove={(i) => set({ categories: f.categories.filter((_, j) => j !== i) })}
          />
          {KINDS.find((k) => k.key === kind)!.agents ? (
            <RowsEditor
              title="Score per Agent"
              nameLabel="Nama agent"
              rows={f.agents}
              onChange={(i, p) => setRow("agents", i, p)}
              onAdd={() => set({ agents: [...f.agents, { name: "", value: "" }] })}
              onRemove={(i) => set({ agents: f.agents.filter((_, j) => j !== i) })}
            />
          ) : (
            <Card title="Score per Agent">
              <p className="text-sm text-ink-3">Template PPT tidak menampilkan skor per agent untuk Outbound.</p>
            </Card>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-ink-3">
        Format angka: persen dengan koma atau titik, mis. 94,99 atau 94.99. Baris tanpa nama atau nilai diabaikan. Pastikan nama parameter sama dengan periode sebelumnya agar grafik perbandingan cocok.
      </p>
    </div>
  );
}

function RowsEditor({
  title,
  nameLabel,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  nameLabel: string;
  rows: Row[];
  onChange: (i: number, p: Partial<Row>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <Card title={title} right={<Pill>{rows.length} baris</Pill>}>
      <div className="mb-1.5 grid grid-cols-[1fr_84px_32px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        <span>{nameLabel}</span>
        <span>Score %</span>
        <span />
      </div>
      <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_84px_32px] items-center gap-2">
            <input value={r.name} onChange={(e) => onChange(i, { name: e.target.value })} className={inputCls} aria-label={nameLabel} />
            <input value={r.value} onChange={(e) => onChange(i, { value: e.target.value })} inputMode="decimal" className={clsx(inputCls, "text-right tabular")} aria-label="Score" />
            <button onClick={() => onRemove(i)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:text-red-600" aria-label="Hapus baris">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-ink-3">Belum ada data.</p>}
      </div>
      <button onClick={onAdd} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand">
        <Plus size={15} /> Tambah baris
      </button>
    </Card>
  );
}
