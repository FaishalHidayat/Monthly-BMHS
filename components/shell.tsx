"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  PencilLine,
  FileDown,
  Headphones,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  PhoneOutgoing,
  Settings,
  Sparkles,
  Star,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { SessionUser } from "@/lib/session";

interface PeriodOpt {
  id: number;
  label: string;
  is_seed: boolean;
}

const NAV = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/inbound", label: "Inbound", icon: Headphones },
  { href: "/outbound", label: "Outbound", icon: PhoneOutgoing },
  { href: "/omni", label: "Omni Chat", icon: MessageCircle },
  { href: "/quality", label: "Quality", icon: Star },
  { href: "/appendix", label: "Appendix", icon: BarChart3 },
  { href: "/insights", label: "Narasi AI", icon: Sparkles },
];
const ADMIN_NAV = [
  { href: "/upload", label: "Upload Data", icon: Upload },
  { href: "/quality-input", label: "Input Quality", icon: PencilLine },
  { href: "/users", label: "Pengguna", icon: Users },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function Shell({ user, periods, children }: { user: SessionUser; periods: PeriodOpt[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
      {NAV.map((n) => (
        <NavLink key={n.href} {...n} active={n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)} />
      ))}
      {user.role === "admin" && (
        <>
          <div className="mt-5 px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/50">Admin</div>
          {ADMIN_NAV.map((n) => (
            <NavLink key={n.href} {...n} active={pathname.startsWith(n.href)} />
          ))}
        </>
      )}
      <div className="mt-auto pt-6">
        <NavLink href="/account" label="Akun Saya" icon={KeyRound} active={pathname.startsWith("/account")} />
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} aria-hidden /> Keluar
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside
        className={clsx(
          "hero-grad fixed inset-y-0 left-0 z-40 flex w-64 flex-col text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-white shadow-sm">
              <Image src="/brand/bunda-logo.png" alt="" width={30} height={20} />
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight">Monthly Report</span>
              <span className="block text-xs text-emerald-50/70">Contact Center BMHS</span>
            </span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <X size={20} />
          </button>
        </div>
        {nav}
        <div className="border-t border-white/10 px-5 py-4 text-xs">
          <div className="font-semibold">{user.name}</div>
          <div className="text-emerald-50/70">{user.role === "admin" ? "Administrator" : "Viewer"}</div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
          <PeriodSelect periods={periods} />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <DownloadPpt periods={periods} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Users; active: boolean }) {
  const sp = useSearchParams();
  const p = sp.get("p");
  return (
    <Link
      href={p && !["/upload", "/users", "/settings", "/account"].includes(href) ? `${href}?p=${p}` : href}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active ? "bg-white text-green-900 shadow-sm font-semibold" : "text-emerald-50/85 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon size={18} aria-hidden /> {label}
    </Link>
  );
}

export function usePeriodId(periods: PeriodOpt[]) {
  const sp = useSearchParams();
  const p = Number(sp.get("p"));
  return periods.find((x) => x.id === p)?.id ?? periods.find((x) => !x.is_seed)?.id ?? periods[0]?.id;
}

function PeriodSelect({ periods }: { periods: PeriodOpt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = usePeriodId(periods);
  if (!periods.length) return <span className="text-sm text-ink-3">Belum ada periode</span>;
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
      <CalendarRange size={16} className="shrink-0 text-brand" aria-hidden />
      <span className="sr-only">Periode laporan</span>
      <select
        value={current}
        onChange={(e) => router.push(`${pathname}?p=${e.target.value}`)}
        className="min-w-0 max-w-[60vw] truncate bg-transparent text-sm font-semibold text-ink outline-none sm:max-w-none"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.is_seed ? " (data historis)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  return (
    <button
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("bmhs-theme", next);
        } catch {}
        setDark(!dark);
      }}
      className="grid size-10 place-items-center rounded-xl bg-surface text-ink-2 ring-1 ring-line hover:text-brand"
      aria-label={dark ? "Mode terang" : "Mode gelap"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function DownloadPpt({ periods }: { periods: PeriodOpt[] }) {
  const id = usePeriodId(periods);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="relative">
      <button
        disabled={!id || busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch(`/api/periods/${id}/report`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const { buildPpt } = await import("@/lib/report/ppt");
            await buildPpt(data);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Gagal membuat PPT");
          } finally {
            setBusy(false);
          }
        }}
        className="flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-strong disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
        <span className="hidden sm:inline">{busy ? "Menyusun PPT…" : "Download PPT"}</span>
      </button>
      {err && <div className="absolute right-0 top-12 w-64 rounded-xl bg-red-600 p-3 text-xs text-white shadow-lg">{err}</div>}
    </div>
  );
}
