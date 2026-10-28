import { Card, DataTable, Empty, InsightPanel, SectionTitle, Stat } from "@/components/ui";
import { Bars } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtNum, fmtPct } from "@/lib/format";

export default async function OmniPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, insights } = await loadPage(searchParams);
  const oi = current?.metrics.omniIncoming;
  const e = current?.metrics.escalation;
  if (!current || (!oi && !e)) return <Empty title="Data omni channel belum tersedia">Upload file Omni chat (eskalasi) dan Tiket Omni status incoming.</Empty>;

  return (
    <div>
      <SectionTitle title="Sociomile Omni Channel (Chat)" desc={current.label} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pesan Masuk" value={fmtNum(oi?.total)} tone="brand" hint="tanpa spam" />
        <Stat label="Spam" value={fmtNum(oi?.spam)} />
        <Stat label="Tiket Eskalasi" value={fmtNum(e?.total)} />
        <Stat label="RS Tujuan Terbanyak" value={e?.byRs[0]?.name ?? "-"} hint={e ? `${fmtNum(e.byRs[0]?.count)} tiket` : undefined} />
      </div>

      {oi && (
        <>
          <SectionTitle title="Kategori Tiket: Pesan Masuk" desc="Tag kosong (-) dihitung sebagai Pendaftaran ChatBot; spam tidak dihitung" />
          <Card title="Category Ticket" source="Omni (status incoming)">
            <Bars data={oi.byCategory.map((c) => ({ name: c.name, value: c.count }))} horizontal labelWidth={290} />
          </Card>
          <div className="mt-4">
            <InsightPanel insight={insights.omni_incoming} />
          </div>
        </>
      )}

      {e && (
        <>
          <SectionTitle title="Total Eskalasi Ticketing" desc={`${fmtNum(e.total)} tiket dieskalasi ke unit RS`} />
          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3" title="Jumlah Tiket Eskalasi per RS" source="Omni chat">
              <Bars data={e.byRs.map((r) => ({ name: r.name, value: r.count }))} horizontal labelWidth={190} name="Tiket" />
            </Card>
            <div className="xl:col-span-2">
              <InsightPanel insight={insights.omni_escalation} compact />
            </div>
          </div>

          <SectionTitle title="Topik Eskalasi per RS" desc="Topik diklasifikasikan otomatis dari isi kebutuhan pasien pada komentar tiket" />
          <div className="grid gap-4 lg:grid-cols-2">
            {e.topics.map((t) => (
              <Card key={t.rs} title={t.rs} subtitle={`${fmtNum(t.total)} tiket · ${fmtPct(e.total ? t.total / e.total : 0, 1)} dari semua RS`} source="Omni chat">
                {t.items.length ? (
                  <DataTable
                    dense
                    head={["No", "Topik Eskalasi", "Jumlah", "% RS", "% Semua"]}
                    align={["center", "left", "right", "right", "right"]}
                    rows={t.items.map((x, i) => [i + 1, x.name, fmtNum(x.count), fmtPct(x.count / t.total, 1), fmtPct(x.count / e.total, 1)])}
                  />
                ) : (
                  <p className="text-sm text-ink-3">Tidak ada eskalasi pada periode ini.</p>
                )}
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <InsightPanel insight={insights.omni_topics} compact />
          </div>
        </>
      )}
    </div>
  );
}
