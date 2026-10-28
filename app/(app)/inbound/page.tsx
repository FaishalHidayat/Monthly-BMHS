import { Card, DataTable, Empty, InsightPanel, Pill, SectionTitle, Stat } from "@/components/ui";
import { Bars, Donut, GroupBars, Lines } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtDur, fmtNum, fmtPct, signed } from "@/lib/format";
import { RS_LIST } from "@/lib/rs";

const scoreOf = (kind: "solving" | "aht" | "abandon" | "soa", v: number) => {
  if (kind === "solving") return v > 0.85 ? 3 : v > 0.7 ? 2 : 1;
  if (kind === "aht") return v <= 300 ? 3 : v <= 600 ? 2 : 1;
  if (kind === "abandon") return v <= 0.05 ? 3 : v <= 0.1 ? 2 : 1;
  return v <= 60 ? 3 : v <= 120 ? 2 : 1;
};

export default async function InboundPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, history, insights } = await loadPage(searchParams);
  if (!current?.metrics.inbound && !current?.metrics.tickets) return <Empty title="Data inbound belum tersedia">Upload file call detail & tiket inbound untuk periode ini.</Empty>;
  const m = current.metrics;
  const ib = m.inbound;
  const t = m.tickets;
  const months = history.filter((h) => h.metrics.inbound);

  const kpiRows: [string, string, (h: (typeof months)[number]) => string][] = [
    ["Avg Handling Time", "00:05:00", (h) => fmtDur(h.metrics.inbound!.ahtSec)],
    ["Speed of Answer", "00:01:00", (h) => fmtDur(h.metrics.inbound!.soaSec)],
    ["Abandon Rate", "5%", (h) => fmtPct(h.metrics.inbound!.abandonRate)],
    ["Solving Ticket", "85%", (h) => fmtPct(h.metrics.tickets?.solvingRate ?? 1, 0)],
  ];

  const perf = [
    { key: "incoming", label: "Incoming", fmt: "num" as const, get: (x: NonNullable<typeof ib>) => x.incoming },
    { key: "answered", label: "Answered", fmt: "num" as const, get: (x: NonNullable<typeof ib>) => x.answered },
    { key: "abandon", label: "Abandon", fmt: "num" as const, get: (x: NonNullable<typeof ib>) => x.abandon },
    { key: "aht", label: "Handling Time", fmt: "dur" as const, get: (x: NonNullable<typeof ib>) => x.ahtSec },
    { key: "sl", label: "Service Level", fmt: "pct" as const, get: (x: NonNullable<typeof ib>) => x.sl },
  ];

  const scoring = ib && [
    ["Solving Ticket", "85%", fmtPct(t?.solvingRate ?? 1, 0), "1: ≤70% · 2: >70–85% · 3: >85%", scoreOf("solving", t?.solvingRate ?? 1)],
    ["AHT", "00:05:00", fmtDur(ib.ahtSec), "1: >10 mnt · 2: 5–10 mnt · 3: ≤5 mnt", scoreOf("aht", ib.ahtSec)],
    ["Abandon Rate", "5%", fmtPct(ib.abandonRate), "1: >10% · 2: 5–10% · 3: ≤5%", scoreOf("abandon", ib.abandonRate)],
    ["Speed of Answer", "00:01:00", fmtDur(ib.soaSec), "1: >2 mnt · 2: 1–2 mnt · 3: ≤1 mnt", scoreOf("soa", ib.soaSec)],
  ];
  const totalScore = scoring?.reduce((a, r) => a + Number(r[4]), 0) ?? 0;

  const dk = t?.dokterKhusus;
  const dkRs = dk ? [...new Set(dk.byDoctor.flatMap((d) => Object.keys(d.perRs)))].filter((r) => r !== "LAINNYA") : [];

  return (
    <div>
      <SectionTitle title="Key Performance Indicator Inbound" desc={current.label} />
      {ib && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="KPI 3 Bulan Terakhir" source="call detail">
            <DataTable
              head={["KPI", "Target", ...months.map((h) => h.month_label)]}
              align={["left", "center", ...months.map(() => "center" as const)]}
              rows={kpiRows.map(([k, target, f]) => [<b key={k} className="text-ink">{k}</b>, target, ...months.map((h) => f(h))])}
            />
            <div className="mt-4">
              <InsightPanel insight={insights.inbound_kpi} compact />
            </div>
          </Card>
          <Card className="xl:col-span-2" title="Skor KPI Inbound" subtitle="Skala 1–3 per indikator" source="call detail" right={<Pill tone={totalScore === 12 ? "good" : "bad"}>{Math.round((totalScore / 12) * 100)}%</Pill>}>
            <DataTable
              dense
              head={["KPI", "Target", "Actual", "Skor"]}
              align={["left", "center", "center", "center"]}
              rows={(scoring ?? []).map((r) => [<span key="k" title={String(r[3])} className="font-medium text-ink">{r[0]}</span>, r[1], r[2], <Pill key="s" tone={r[4] === 3 ? "good" : "bad"}>{r[4]}</Pill>])}
            />
            <p className="mt-3 text-xs text-ink-3">Total skor {totalScore} dari maksimal 12.</p>
          </Card>
        </div>
      )}

      {ib && (
        <>
          <SectionTitle title="Inbound Performance" desc="Perbandingan 3 periode" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {perf.map((p) => {
              const vals = months.map((h) => ({ name: h.month_label, value: p.get(h.metrics.inbound!) }));
              const d = vals.length > 1 ? vals[vals.length - 1].value - vals[vals.length - 2].value : 0;
              return (
                <Card key={p.key} title={p.label} right={vals.length > 1 ? <Pill tone="neutral">{p.fmt === "pct" ? `${signed(d * 100, 2)} pt` : p.fmt === "dur" ? `${signed(d)} dtk` : signed(d)}</Pill> : null}>
                  <Bars data={vals} fmt={p.fmt} height={190} color={["incoming", "answered"].includes(p.key) ? 0 : p.key === "abandon" ? 2 : 1} name={p.label} />
                </Card>
              );
            })}
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.inbound_performance} />
          </div>

          <SectionTitle title="Call Performance Harian" desc="Volume panggilan & service level per hari" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Incoming" value={fmtNum(ib.incoming)} />
            <Stat label="Answered" value={fmtNum(ib.answered)} />
            <Stat label="Abandon" value={fmtNum(ib.abandon)} />
            <Stat label="Handling Time" value={fmtDur(ib.ahtSec)} />
            <Stat label="Service Level" value={fmtPct(ib.sl)} tone="brand" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Call per Hari" subtitle="Answered + abandon = total incoming" source="call detail">
              <GroupBars
                data={ib.daily.map((d) => ({ name: d.date.slice(8), answered: d.answered, abandon: d.abandon }))}
                series={[{ key: "answered", label: "Success Call" }, { key: "abandon", label: "Abandon", color: "var(--s3)" }]}
                stacked
                height={300}
              />
            </Card>
            <Card title="Service Level Harian" source="call detail">
              <Lines data={ib.daily.map((d) => ({ name: d.date, sl: d.sl }))} series={[{ key: "sl", label: "Service Level" }]} fmt="pct" xFmt="date" domain={[0.9, 1]} height={300} />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.call_performance} />
          </div>
        </>
      )}

      {t && dk && (
        <>
          <SectionTitle title="Pendaftaran Dokter Khusus" desc={`${fmtNum(dk.total)} tiket sub-kategori "Pendaftaran Dokter Khusus"`} />
          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-2" title="RS Tujuan" source="Inbound">
              <Bars data={dk.byRs.map((r) => ({ name: r.name, value: r.count }))} horizontal name="Appointment" />
            </Card>
            <Card className="xl:col-span-3" title="Dokter dengan Appointment Terbanyak" subtitle="Nama dokter diekstrak otomatis dari deskripsi tiket" source="Inbound">
              <GroupBars
                horizontal
                stacked
                data={dk.byDoctor.slice(0, 10).map((d) => ({ name: d.doctor, ...Object.fromEntries(dkRs.map((r) => [r, d.perRs[r] ?? 0])) }))}
                series={dkRs.map((r) => ({ key: r, label: r }))}
                labelWidth={220}
              />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.dokter_khusus} />
          </div>

          <SectionTitle title="Case Category" desc={`Total ${fmtNum(t.total)} tiket`} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Kategori Tiket" source="Inbound">
              <Donut data={t.byCategory.map((c) => ({ name: c.name, value: c.count }))} center={{ value: fmtNum(t.total), label: "tiket" }} />
            </Card>
            <Card title="Keluhan" source="Inbound">
              <Bars data={t.keluhan.map((k) => ({ name: k.name, value: k.count }))} horizontal color={2} />
              <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
                {t.keluhanList.map((k, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                      <Pill tone="bad">{k.sub.replace("Keluhan - ", "")}</Pill>
                      <span className="font-semibold text-ink">{k.rs}</span>
                      <span className="text-ink-3">{k.date.slice(0, 10)}</span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-line">{k.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Top Permintaan" source="Inbound">
              <Bars data={t.permintaan.slice(0, 10).map((k) => ({ name: k.name.replace("Permintaan - ", ""), value: k.count }))} horizontal labelWidth={250} />
            </Card>
            <Card title="Top Informasi" source="Inbound">
              <Bars data={t.informasi.slice(0, 8).map((k) => ({ name: k.name.replace("Informasi - ", ""), value: k.count }))} horizontal color={1} labelWidth={250} />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.case_category} />
          </div>

          <SectionTitle title="Appointment Voucher SHARECARECC" desc={`Filter kolom Notes "SHARECAREC" · ${fmtNum(t.sharecare.total)} pendaftaran`} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Kategori" source="Inbound · SHARECAREC">
              <Bars data={t.sharecare.bySub.map((k) => ({ name: k.name.replace("Permintaan - ", ""), value: k.count }))} horizontal labelWidth={250} />
            </Card>
            <Card title="RS Tujuan" source="Inbound · SHARECAREC">
              <Bars data={t.sharecare.byRs.map((k) => ({ name: k.name, value: k.count }))} color={1} />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.sharecare} />
          </div>
          <p className="mt-8 text-xs text-ink-3">Cabang yang dilayani: {RS_LIST.map((r) => r.name).join(", ")}.</p>
        </>
      )}
    </div>
  );
}
