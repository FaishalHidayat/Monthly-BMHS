import { CalendarCheck, Ban, PhoneCall, PhoneOutgoing, Percent, Target } from "lucide-react";
import { Card, DataTable, Empty, InsightPanel, SectionTitle, Stat } from "@/components/ui";
import { Bars, Donut, GroupBars, Lines } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtNum, fmtPct } from "@/lib/format";

export default async function OutboundPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, history, insights } = await loadPage(searchParams);
  const o = current?.metrics.outbound;
  if (!current || !o) return <Empty title="Data outbound belum tersedia">Upload file outbound untuk periode ini.</Empty>;
  const months = history.filter((h) => h.metrics.outbound);
  const daily = o.daily.length > 0 && "connected" in o.daily[0];

  return (
    <div>
      <SectionTitle title="Outbound Performance" desc={`Outbound Telesales BMHS · ${current.label}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total Leads" value={fmtNum(o.leads)} icon={<PhoneOutgoing size={16} />} tone="brand" />
        <Stat label="Connected" value={fmtNum(o.connected)} icon={<PhoneCall size={16} />} />
        <Stat label="Success (Appointment)" value={fmtNum(o.success)} icon={<CalendarCheck size={16} />} />
        <Stat label="Connect Rate" value={fmtPct(o.connectRate)} icon={<Percent size={16} />} hint="target 8%" />
        <Stat label="Success Rate" value={fmtPct(o.successRate)} icon={<Target size={16} />} hint="dari connected" />
        <Stat label="BMHS Instruction" value={fmtNum(o.bmhsInstruction)} icon={<Ban size={16} />} hint="tidak boleh dihubungi" />
      </div>

      {o.failReasons.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="Alasan Gagal — Connected" source="outbond">
            <Bars data={o.failReasons.map((r) => ({ name: r.name, value: r.count }))} horizontal color={2} labelWidth={190} />
          </Card>
          <Card className="xl:col-span-2" title="Rincian Menolak (lain-lain)" subtitle="Dikelompokkan dari kolom Notes" source="outbond">
            <Donut data={o.menolakNotes.slice(0, 6).map((r) => ({ name: r.name, value: r.count }))} height={200} />
          </Card>
        </div>
      )}
      <div className="mt-4">
        <InsightPanel insight={insights.outbound_performance} />
      </div>

      <SectionTitle title="Key Performance Indicator Outbound" />
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="KPI 3 Bulan Terakhir" source="outbond">
          <DataTable
            head={["KPI", "Target", ...months.map((h) => h.month_label)]}
            align={["left", "center", ...months.map(() => "center" as const)]}
            rows={[
              ["Total Leads", "-", ...months.map((h) => fmtNum(h.metrics.outbound!.leads))],
              ["Total Connected Leads", "-", ...months.map((h) => fmtNum(h.metrics.outbound!.connected))],
              ["Success", "-", ...months.map((h) => fmtNum(h.metrics.outbound!.success))],
              ["Connected Rate", "8%", ...months.map((h) => fmtPct(h.metrics.outbound!.connectRate))],
              ["Success Rate", "-", ...months.map((h) => fmtPct(h.metrics.outbound!.successRate))],
            ].map((r) => [<b key="k" className="text-ink">{r[0]}</b>, ...r.slice(1)])}
          />
          <div className="mt-4">
            <InsightPanel insight={insights.outbound_kpi} compact />
          </div>
        </Card>
        <Card className="xl:col-span-2" title="Appointment per Periode" source="outbond">
          <Bars data={months.map((h) => ({ name: h.month_label, value: h.metrics.outbound!.success }))} name="Appointment" height={260} />
        </Card>
      </div>

      <SectionTitle title="Call Performance Outbound" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Leads & Connected per Tanggal Attempt" source="outbond">
          {daily ? (
            <Lines data={o.daily.map((d) => ({ name: d.date, leads: d.leads, connected: d.connected }))} series={[{ key: "leads", label: "Total Leads" }, { key: "connected", label: "Connected" }]} xFmt="date" labels height={300} />
          ) : (
            <p className="text-sm text-ink-3">Data harian tidak tersedia untuk periode historis.</p>
          )}
        </Card>
        <Card title="Appointment per RS" source="outbond">
          <Bars data={o.appointmentsByRs.map((r) => ({ name: r.name, value: r.count }))} horizontal labelWidth={160} name="Appointment" />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InsightPanel insight={insights.outbound_call} />
        <InsightPanel insight={insights.outbound_daily} />
      </div>

      {o.campaigns.length > 0 && (
        <>
          <SectionTitle title="Campaign & Status Not Connected" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Leads per Campaign" source="outbond">
              <Bars data={o.campaigns.map((r) => ({ name: r.name, value: r.count }))} horizontal labelWidth={230} color={1} />
            </Card>
            <Card title="Hasil Not Connected" source="outbond">
              <GroupBars horizontal data={o.notConnectedReasons.slice(0, 8).map((r) => ({ name: r.name, total: r.count }))} series={[{ key: "total", label: "Leads", color: "var(--s4)" }]} labels labelWidth={180} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
