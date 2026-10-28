"use client";

import Image from "next/image";
import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="hero-grad relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white">
            <Image src="/brand/bunda-logo.png" alt="" width={36} height={24} />
          </span>
          <span className="text-lg font-bold">RS Bunda Group</span>
        </div>
        <div className="mt-auto max-w-lg">
          <h1 className="text-4xl font-bold leading-tight">Monthly Report Contact Center</h1>
          <p className="mt-4 text-emerald-50/85">
            Pantau KPI inbound, outbound, omni channel, dan quality dalam satu dashboard. Unduh laporan PPT lengkap dengan narasi
            otomatis berbasis AI.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <form
          className="w-full max-w-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            const f = new FormData(e.currentTarget);
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setErr(data.error ?? "Login gagal");
              setBusy(false);
              return;
            }
            const next = new URLSearchParams(location.search).get("next");
            location.href = next && next.startsWith("/") ? next : "/";
          }}
        >
          <div className="mb-8 lg:hidden">
            <Image src="/brand/bunda-logo.png" alt="BUNDA" width={120} height={80} />
          </div>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
            <LockKeyhole size={20} />
          </div>
          <h2 className="text-2xl font-bold">Masuk</h2>
          <p className="mt-1 text-sm text-ink-3">Gunakan akun yang diberikan oleh admin.</p>
          <label className="mt-6 block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="username" className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          {err && <div className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</div>}
          <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />} Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
