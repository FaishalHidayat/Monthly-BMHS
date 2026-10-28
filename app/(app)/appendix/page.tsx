import { Card, DataTable, Empty, InsightPanel, Pill, SectionTitle, Stat } from "@/components/ui";
import { Bars, GroupBars, Lines } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtNum, fmtPct } from "@/lib/format";

export default async function AppendixPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, insights } = await loadPage(searchParams);
  if (!current) return <Empty title="Belum ada data" />;
  const { transfer: tf, tickets: t, inbound: ib } = current.metrics;

  return (
    <div>
      {tf && (
        <>
          <SectionTitle title="Transfer Call ke Unit" desc="Call #1 Agent TF Unit — tersambung vs abandoned" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Call TF Unit" value={fmtNum(tf.total)} tone="brand" />
            <Stat label="Tersambung" value={fmtNum(tf.answered)} hint={fmtPct(tf.answered / (tf.total || 1), 0)} />
            <Stat label="Abandoned" value={fmtNum(tf.abandoned)} hint={fmtPct(tf.abandoned / (tf.total || 1), 0)} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3" title="Abandoned per RS & Unit Tujuan" subtitle="Rajal · Rajal & Ranap · Ranap · Operator" source="Transfer call">
              <GroupBars
                horizontal
                stacked
                data={tf.byRs.map((r) => ({ name: r.rs, rajal: r.rajal, rajalRanap: r.rajalRanap, ranap: r.ranap, operator: r.operator }))}
                series={[
                  { key: "rajal", label: "Rajal" },
                  { key: "rajalRanap", label: "Rajal & Ranap" },
                  { key: "ranap", label: "Ranap" },
                  { key: "operator", label: "Operator" },
                ]}
                labelWidth={190}
              />
            </Card>
            <Card className="xl:col-span-2" title="Detail Abandoned" source="Transfer call">
              <DataTable
                dense
                head={["RS", "Abd", "% Total"]}
                align={["left", "right", "right"]}
                rows={tf.byRs.map((r) => [r.rs, fmtNum(r.abandoned), fmtPct(r.abandoned / (tf.abandoned || 1), 1)])}
              />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.transfer_call} />
          </div>
        </>
      )}

      {t && (
        <>
          <SectionTitle title="Pasien Tekan IGD (Tidak Terangkat)" desc={`Filter kolom Notes "FIGD" · ${fmtNum(t.igd.total)} call`} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="RS Tujuan IGD" source="Inbound · FIGD">
              <Bars data={t.igd.byRs.map((r) => ({ name: r.name, value: r.count }))} name="Call" />
            </Card>
            <Card title="Category Ticket IGD" source="Inbound · FIGD">
              <Bars data={t.igd.byCategory.map((r) => ({ name: r.name, value: r.count }))} horizontal color={1} labelWidth={110} />
            </Card>
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.igd} />
          </div>
        </>
      )}

      {ib && (
        <>
          <SectionTitle title="Average Incoming Call / Interval" desc="Rata-rata panggilan per jam (hari dengan panggilan di jam tersebut)" />
          <Card source="call detail">
            <Lines data={ib.interval.map((x) => ({ name: x.hour, avg: x.avgIncoming }))} series={[{ key: "avg", label: "Avg Incoming" }]} fmt="dec1" xFmt="hour" labels height={300} />
          </Card>
          <div className="mt-4">
            <InsightPanel insight={insights.interval} />
          </div>

          <SectionTitle title="AHT Daily" />
          <Card source="call detail">
            <Bars data={ib.daily.map((d) => ({ name: d.date.slice(8), value: d.ahtSec }))} fmt="dur" height={300} name="AHT" />
          </Card>
          <div className="mt-4">
            <InsightPanel insight={insights.aht_daily} />
          </div>

          <SectionTitle title="Abandon / Interval" />
          <Card source="call detail">
            <Lines data={ib.interval.map((x) => ({ name: x.hour, avg: x.avgAbandon }))} series={[{ key: "avg", label: "Avg Abandon", color: "var(--s3)" }]} fmt="dec1" xFmt="hour" labels height={280} />
          </Card>
          <div className="mt-4">
            <InsightPanel insight={insights.abandon_interval} />
          </div>
        </>
      )}

      {t && (
        <>
          <SectionTitle title="Permintaan & Informasi" desc="Rincian seluruh sub-kategori" />
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Permintaan" source="Inbound" right={<Pill tone="brand">{fmtNum(t.permintaan.reduce((a, b) => a + b.count, 0))}</Pill>}>
              <DataTable dense head={["Sub-kategori", "Total"]} align={["left", "right"]} rows={t.permintaan.map((r) => [r.name, fmtNum(r.count)])} />
            </Card>
            <Card title="Informasi" source="Inbound" right={<Pill tone="brand">{fmtNum(t.informasi.reduce((a, b) => a + b.count, 0))}</Pill>}>
              <DataTable dense head={["Sub-kategori", "Total"]} align={["left", "right"]} rows={t.informasi.map((r) => [r.name, fmtNum(r.count)])} />
            </Card>
          </div>

          <SectionTitle title="Spam" />
          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3" source="Inbound">
              <Bars data={t.spam.map((r) => ({ name: r.name, value: r.count }))} horizontal color={1} labelWidth={170} />
            </Card>
            <div className="xl:col-span-2">
              <InsightPanel insight={insights.spam} compact />
            </div>
          </div>

          <SectionTitle title="Keluhan Pelayanan Unit" desc="Detail diambil dari kolom Description" />
          <div className="grid gap-4 lg:grid-cols-2">
            {t.keluhanList.map((k, i) => (
              <Card key={i} title={k.sub} subtitle={`${k.rs} · ${k.date.slice(0, 10)}`} source="Inbound">
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{k.description}</p>
                {k.answer && <p className="mt-2 text-xs text-ink-3">Penanganan: {k.answer}</p>}
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.keluhan} />
          </div>
        </>
      )}
      {!tf && !t && !ib && <Empty title="Data appendix belum tersedia" />}
    </div>
  );
}
