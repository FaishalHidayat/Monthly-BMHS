"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Loader2, PencilLine, RotateCcw, Save, Sparkles, Wand2 } from "lucide-react";
import { Card, InsightPanel, Pill, SectionTitle } from "@/components/ui";
import { SLIDES } from "@/lib/report/slides";
import type { InsightMap } from "@/lib/types";

const SOURCE_LABEL = { ai: "AI", rule: "Otomatis", manual: "Diedit" } as const;

export function InsightsEditor({
  periodId,
  label,
  insights,
  sources,
  canEdit,
}: {
  periodId: number;
  label: string;
  insights: InsightMap;
  sources: Record<string, "ai" | "rule" | "manual">;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ highlight: "", action: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const sections = [...new Set(SLIDES.map((s) => s.section))];

  async function generate() {
    setBusy(true);
    setMsg({ tone: "ok", text: "AI sedang membaca data terbaru dan menyusun narasi semua slide (± 1–3 menit)…" });
    const r = await fetch(`/api/periods/${periodId}/insights/generate`, { method: "POST" });
    const d = await r.json().catch(() => ({ error: "Respons tidak valid" }));
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: `Selesai — ${d.slides} slide diperbarui oleh ${d.model}.` } : { tone: "err", text: d.error });
    router.refresh();
  }

  return (
    <div>
      <SectionTitle
        title="Narasi Highlight & Action"
        desc={`${label} · teks ini dipakai di dashboard dan file PPT`}
        right={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Kembalikan semua narasi ke teks otomatis (tanpa AI)?")) return;
                  await fetch(`/api/periods/${periodId}/insights`, { method: "DELETE" });
                  router.refresh();
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-2 ring-1 ring-line hover:bg-surface"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button disabled={busy} onClick={generate} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate dengan AI
              </button>
            </div>
          )
        }
      />
      {msg && <div className={clsx("mb-4 rounded-xl px-4 py-3 text-sm", msg.tone === "ok" ? "bg-brand-soft text-brand-ink" : "bg-red-500/10 text-red-700 dark:text-red-300")}>{msg.text}</div>}
      <p className="mb-6 flex items-start gap-2 text-sm text-ink-3">
        <Bot size={16} className="mt-0.5 shrink-0 text-brand" />
        Setiap upload data baru, teks otomatis langsung menyesuaikan angka terbaru. Tombol &quot;Generate dengan AI&quot; menulis ulang semua narasi berdasarkan temuan data terbaru; admin tetap bisa mengedit tiap slide.
      </p>
      {sections.map((sec) => (
        <div key={sec} className="mb-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-3">{sec}</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {SLIDES.filter((s) => s.section === sec).map((s) => (
              <Card
                key={s.key}
                title={s.title}
                right={
                  <>
                    <Pill tone={sources[s.key] === "ai" ? "brand" : sources[s.key] === "manual" ? "good" : "neutral"}>
                      {sources[s.key] === "ai" ? <Wand2 size={11} className="mr-1" /> : null}
                      {SOURCE_LABEL[sources[s.key] ?? "rule"]}
                    </Pill>
                    {canEdit && editing !== s.key && (
                      <button
                        onClick={() => {
                          setEditing(s.key);
                          setDraft({ highlight: (insights[s.key]?.highlight ?? []).join("\n"), action: (insights[s.key]?.action ?? []).join("\n") });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-ink-3 ring-1 ring-line hover:text-brand"
                        aria-label="Edit"
                      >
                        <PencilLine size={15} />
                      </button>
                    )}
                  </>
                }
              >
                {editing === s.key ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-ink-3">
                      Highlight (satu butir per baris)
                      <textarea value={draft.highlight} onChange={(e) => setDraft({ ...draft, highlight: e.target.value })} rows={6} className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink" />
                    </label>
                    {s.hasAction && (
                      <label className="block text-xs font-semibold text-ink-3">
                        Action (satu butir per baris)
                        <textarea value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink" />
                      </label>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(null)} className="rounded-xl px-3 py-2 text-sm text-ink-3">
                        Batal
                      </button>
                      <button
                        onClick={async () => {
                          const split = (x: string) => x.split("\n").map((l) => l.trim()).filter(Boolean);
                          await fetch(`/api/periods/${periodId}/insights`, {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ insights: { [s.key]: { highlight: split(draft.highlight), action: split(draft.action) } } }),
                          });
                          setEditing(null);
                          router.refresh();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Save size={15} /> Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <InsightPanel insight={insights[s.key]} compact />
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
