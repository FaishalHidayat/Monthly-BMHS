"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { Card, DataTable, Pill, SectionTitle } from "@/components/ui";

interface U {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  last_login_at: string | null;
}

export function UsersClient({ meId }: { meId: number }) {
  const [users, setUsers] = useState<U[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => setUsers((await (await fetch("/api/users")).json()).users ?? []);
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <SectionTitle title="Pengguna" desc="Admin: akses penuh (upload, edit narasi, pengaturan). User: hanya melihat grafik & download PPT." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Tambah Pengguna">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMsg(null);
              const r = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
              const d = await r.json();
              setBusy(false);
              if (!r.ok) return setMsg(d.error);
              setForm({ name: "", email: "", password: "", role: "user" });
              setMsg(`Akun ${d.user.email} dibuat.`);
              load();
            }}
          >
            {(["name", "email", "password"] as const).map((k) => (
              <label key={k} className="block text-xs font-semibold text-ink-3">
                {k === "name" ? "Nama" : k === "email" ? "Email" : "Password (min. 8 karakter)"}
                <input
                  required
                  type={k === "password" ? "text" : k === "email" ? "email" : "text"}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
              </label>
            ))}
            <label className="block text-xs font-semibold text-ink-3">
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink">
                <option value="user">User (lihat & download PPT)</option>
                <option value="admin">Admin (akses penuh)</option>
              </select>
            </label>
            {msg && <p className="text-sm text-brand">{msg}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Tambah
            </button>
          </form>
        </Card>
        <Card title="Daftar Pengguna" className="xl:col-span-2">
          <DataTable
            head={["Nama", "Email", "Role", "Login terakhir", ""]}
            align={["left", "left", "center", "left", "right"]}
            rows={users.map((u) => [
              <b key="n" className="text-ink">{u.name}</b>,
              u.email,
              <select
                key="r"
                disabled={u.id === meId}
                value={u.role}
                onChange={async (e) => {
                  await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: e.target.value }) });
                  load();
                }}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>,
              u.last_login_at ? new Date(u.last_login_at).toLocaleString("id-ID") : <Pill key="p">belum</Pill>,
              <span key="a" className="flex justify-end gap-1">
                <button
                  title="Reset password"
                  onClick={async () => {
                    const p = prompt(`Password baru untuk ${u.email} (min. 8 karakter):`);
                    if (!p) return;
                    const r = await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: p }) });
                    alert(r.ok ? "Password diperbarui" : (await r.json()).error);
                  }}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 ring-1 ring-line hover:text-brand"
                >
                  <KeyRound size={14} />
                </button>
                {u.id !== meId && (
                  <button
                    title="Hapus"
                    onClick={async () => {
                      if (!confirm(`Hapus akun ${u.email}?`)) return;
                      await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                      load();
                    }}
                    className="grid size-8 place-items-center rounded-lg text-ink-3 ring-1 ring-line hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}
