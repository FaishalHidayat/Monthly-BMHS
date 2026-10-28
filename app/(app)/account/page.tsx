"use client";

import { useState } from "react";
import { Card, SectionTitle } from "@/components/ui";

export default function AccountPage() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="max-w-lg">
      <SectionTitle title="Akun Saya" desc="Ganti password login Anda." />
      <Card>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (f.get("next") !== f.get("confirm")) return setMsg({ ok: false, text: "Konfirmasi password tidak sama" });
            const r = await fetch("/api/me/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: f.get("current"), next: f.get("next") }) });
            const d = await r.json();
            setMsg(r.ok ? { ok: true, text: "Password berhasil diganti." } : { ok: false, text: d.error });
            if (r.ok) e.currentTarget.reset();
          }}
        >
          {[
            ["current", "Password saat ini"],
            ["next", "Password baru (min. 8 karakter)"],
            ["confirm", "Ulangi password baru"],
          ].map(([n, l]) => (
            <label key={n} className="block text-xs font-semibold text-ink-3">
              {l}
              <input name={n} type="password" required className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink" />
            </label>
          ))}
          {msg && <p className={`text-sm ${msg.ok ? "text-brand" : "text-red-600"}`}>{msg.text}</p>}
          <button className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Simpan</button>
        </form>
      </Card>
    </div>
  );
}
