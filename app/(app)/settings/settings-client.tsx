"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, PlugZap } from "lucide-react";
import { Card, Pill, SectionTitle } from "@/components/ui";

const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (rekomendasi, kualitas terbaik)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (lebih cepat & hemat)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (paling hemat)" },
];

export function SettingsClient() {
  const [s, setS] = useState<{ apiKey: string | null; hasKey: boolean; model: string } | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = async () => setS(await (await fetch("/api/settings")).json());
  useEffect(() => {
    load();
  }, []);

  async function save(body: object) {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Pengaturan tersimpan." } : { ok: false, text: d.error });
    setKey("");
    load();
  }

  return (
    <div>
      <SectionTitle title="Pengaturan" desc="Koneksi AI untuk menulis Highlight & Action secara otomatis." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="API Key AI (Anthropic Claude)" right={s && <Pill tone={s.hasKey ? "good" : "bad"}>{s.hasKey ? "Terhubung" : "Belum diisi"}</Pill>}>
          <p className="text-sm text-ink-2">
            Buat API key di{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
              console.anthropic.com
            </a>{" "}
            lalu tempel di bawah. Key disimpan terenkripsi (AES-256) di database dan tidak pernah dikirim ke browser.
          </p>
          {s?.apiKey && (
            <p className="mt-3 flex items-center gap-2 text-sm">
              <KeyRound size={14} className="text-brand" /> Key aktif: <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{s.apiKey}</code>
            </p>
          )}
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-api03-…"
            type="password"
            autoComplete="off"
            className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy || !key} onClick={() => save({ apiKey: key })} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Simpan key
            </button>
            <button
              disabled={busy || !s?.hasKey}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                const r = await fetch("/api/settings/test", { method: "POST" });
                const d = await r.json();
                setBusy(false);
                setMsg(r.ok ? { ok: true, text: `Koneksi berhasil (${d.model}) — balasan: "${d.reply}"` } : { ok: false, text: d.error });
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ink-2 ring-1 ring-line disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />} Tes koneksi
            </button>
            {s?.hasKey && (
              <button disabled={busy} onClick={() => confirm("Hapus API key?") && save({ clearKey: true })} className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600">
                Hapus key
              </button>
            )}
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-brand" : "text-red-600"}`}>{msg.text}</p>}
        </Card>
        <Card title="Model AI">
          <div className="space-y-2">
            {MODELS.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-line hover:bg-surface-2">
                <input type="radio" name="model" checked={s?.model === m.id} onChange={() => save({ model: m.id })} className="accent-green-700" />
                <span className="text-sm">{m.label}</span>
                {s?.model === m.id && <CheckCircle2 size={16} className="ml-auto text-brand" />}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-3">Biaya per generate (±30 slide) umumnya hanya beberapa sen USD.</p>
        </Card>
      </div>
    </div>
  );
}
