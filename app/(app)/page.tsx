import Link from "next/link";
import { Clock, Gauge, Headphones, MessageCircle, PhoneMissed, PhoneOutgoing, Star, Timer, Upload } from "lucide-react";
import { Card, Delta, Empty, Stat } from "@/components/ui";
import { Donut, GroupBars } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtDur, fmtNum, fmtPct, signed } from "@/lib/format";
import { RS_LIST } from "@/lib/rs";

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, history, insights } = await loadPage(searchParams);
  if (!current)
    return (
      <Empty title="Belum ada data laporan">
        Admin dapat membuat periode dan meng-upload raw data di menu{" "}
        <Link className="font-semibold text-brand" href="/upload">
          Upload Data
        </Link>
        .
      </Empty>
    );
  const m = current.metrics;
  const prev = history.length > 1 ? history[history.length - 2].metrics : undefined;
  const ib = m.inbound;
  const pib = prev?.inbound;
  const q = m.quality ?? {};
  const pq = prev?.quality ?? {};
  const ex = insights.exec_summary?.highlight ?? [];
  const parts = [
    { title: "Key Performance Indicator", text: ex[0], icon: Gauge },
    { title: "Quality Performance", text: ex[1], icon: Star },
    { title: "Summary Case", text: ex[2], icon: Headphones },
    { title: "Coverage Area", text: ex[3], icon: MessageCircle },
  ];
  const pts = (a?: number | null, b?: number | null) => (a != null && b != null ? (a - b) * 100 : NaN);

  return (
    <div className="space-y-6">
      <section className="hero-grad fade-up relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-emerald-50/80">Executive Summary</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{current.label}</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/85">
              Contact Center melayani {RS_LIST.length} cabang RS Bunda Group melalui telepon inbound, outbound telesales, dan omni channel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["Total tiket", fmtNum(m.tickets?.total)],
              ["Pesan chat", fmtNum(m.omniIncoming?.total)],
              ["Appointment outbound", fmtNum(m.outbound?.success)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/12 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur">
                <div className="text-[11px] text-emerald-50/75">{k}</div>
                <div className="tabular text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-16 size-72 rounded-full bg-white/10 blur-2xl" />
      </section>

      {current.is_seed && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          <Upload size={16} /> Periode ini berisi data historis dari PPT (ringkasan saja). Upload raw data untuk melihat grafik lengkap.
        </div>
      )}

      {ib && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Incoming Call" value={fmtNum(ib.incoming)} icon={<Headphones size={16} />} tone="brand"
            delta={pib && <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-xs font-semibold">{signed(ib.incoming - pib.incoming)}</span>}
            hint={pib ? "vs periode lalu" : undefined} />
          <Stat label="Answered" value={fmtNum(ib.answered)} icon={<Headphones size={16} />} delta={pib && <Delta value={ib.answered - pib.answered} text={signed(ib.answered - pib.answered)} trend="neutral" />} />
          <Stat label="Service Level" value={fmtPct(ib.sl)} icon={<Gauge size={16} />} delta={pib && <Delta value={pts(ib.sl, pib.sl)} text={`${signed(pts(ib.sl, pib.sl), 2)} pt`} />} />
          <Stat label="Abandon Rate" value={fmtPct(ib.abandonRate)} icon={<PhoneMissed size={16} />} hint="target ≤ 5%" delta={pib && <Delta value={pts(ib.abandonRate, pib.abandonRate)} text={`${signed(pts(ib.abandonRate, pib.abandonRate), 2)} pt`} trend="up-bad" />} />
          <Stat label="Avg Handling Time" value={fmtDur(ib.ahtSec)} icon={<Timer size={16} />} hint="target ≤ 00:05:00" delta={pib && <Delta value={ib.ahtSec - pib.ahtSec} text={`${signed(ib.ahtSec - pib.ahtSec)} dtk`} trend="up-bad" />} />
          <Stat label="Speed of Answer" value={fmtDur(ib.soaSec)} icon={<Clock size={16} />} hint="target ≤ 00:01:00" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([["Inbound", q.inbound, pq.inbound], ["Outbound", q.outbound, pq.outbound], ["Chat", q.chat, pq.chat]] as const).map(([name, b, pb]) => (
          <Stat key={name} label={`Quality Score ${name}`} value={fmtPct(b?.score)} icon={<Star size={16} />} hint={b?.label}
            delta={b?.score != null && pb?.score != null ? <Delta value={pts(b.score, pb.score)} text={`${signed(pts(b.score, pb.score), 2)} pt`} /> : undefined} />
        ))}
        {m.outbound && (
          <Stat label="Outbound · Connected / Success" value={`${fmtPct(m.outbound.connectRate)} · ${fmtPct(m.outbound.successRate)}`} icon={<PhoneOutgoing size={16} />}
            hint={`${fmtNum(m.outbound.leads)} leads, ${fmtNum(m.outbound.success)} appointment`} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {parts.map((p) => (
          <Card key={p.title} title={<span className="flex items-center gap-2"><p.icon size={16} className="text-brand" /> {p.title}</span>}>
            <p className="text-sm leading-relaxed text-ink-2">{p.text ?? "-"}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Tren Inbound 3 Periode" subtitle="Incoming, answered, dan abandon per periode" source="call detail">
          <GroupBars
            data={history.filter((h) => h.metrics.inbound).map((h) => ({ name: h.month_label, incoming: h.metrics.inbound!.incoming, answered: h.metrics.inbound!.answered, abandon: h.metrics.inbound!.abandon }))}
            series={[{ key: "incoming", label: "Incoming" }, { key: "answered", label: "Answered" }, { key: "abandon", label: "Abandon" }]}
            labels
          />
        </Card>
        <Card className="lg:col-span-2" title="Komposisi Tiket Inbound" source="Inbound">
          {m.tickets ? (
            <Donut data={m.tickets.byCategory.map((c) => ({ name: c.name, value: c.count }))} center={{ value: fmtNum(m.tickets.total), label: "tiket" }} height={200} />
          ) : (
            <p className="text-sm text-ink-3">Belum ada data tiket.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
