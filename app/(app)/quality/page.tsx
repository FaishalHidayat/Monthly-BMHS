import { Card, Empty, InsightPanel, SectionTitle } from "@/components/ui";
import { Bars, GroupBars, ScoreBar } from "@/components/charts";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { fmtPct, signed } from "@/lib/format";
import type { Period, QualityBlock, SlideInsight } from "@/lib/types";

type Kind = "inbound" | "outbound" | "chat";

function QualitySection({
  kind,
  title,
  source,
  history,
  insight,
  catInsight,
  agentInsight,
}: {
  kind: Kind;
  title: string;
  source: string;
  history: Period[];
  insight?: SlideInsight;
  catInsight?: SlideInsight;
  agentInsight?: SlideInsight;
}) {
  const blocks = history.map((h) => h.metrics.quality?.[kind]).filter((b): b is QualityBlock => !!b && b.score != null);
  const cur = blocks[blocks.length - 1];
  const prev = blocks.length > 1 ? blocks[blocks.length - 2] : undefined;
  if (!cur) return null;
  const cats = cur.categories.map((c) => ({ name: c.name, current: c.pct, previous: prev?.categories.find((p) => p.name === c.name)?.pct ?? null }));
  const hasPrevCats = cats.some((c) => c.previous != null);
  const below = cur.agents.filter((a) => a.score < 0.95).length;

  return (
    <>
      <SectionTitle title={title} desc={`Periode QA terbaru: ${cur.label}`} />
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2" title={`Score ${title.replace("Quality ", "")}`} subtitle={prev?.score != null ? `${signed((cur.score! - prev.score) * 100, 2)} poin vs periode QA sebelumnya` : undefined} source={source}>
          <Bars data={blocks.map((b) => ({ name: b.label, value: b.score! }))} fmt="pct" height={260} name="Score" />
        </Card>
        <div className="xl:col-span-3">
          <InsightPanel insight={insight} />
        </div>
      </div>
      {cats.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="Score per Parameter" source={source}>
            <GroupBars
              horizontal
              data={cats}
              series={hasPrevCats ? [{ key: "previous", label: prev!.label, color: "var(--s2)" }, { key: "current", label: cur.label }] : [{ key: "current", label: cur.label }]}
              fmt="pct"
              labels
              labelWidth={200}
              domain={[0.5, 1]}
            />
          </Card>
          <div className="xl:col-span-2">
            <InsightPanel insight={catInsight} compact />
          </div>
        </div>
      )}
      {cur.agents.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="Score per Agent" subtitle={`${below} agent di bawah target 95%`} source={source}>
            <ul className="space-y-2.5">
              {cur.agents.map((a) => (
                <li key={a.name} className="grid grid-cols-[minmax(0,180px)_1fr_56px] items-center gap-3 text-[13px]">
                  <span className="truncate text-ink-2">{a.name}</span>
                  <ScoreBar value={a.score} />
                  <span className={`tabular text-right font-semibold ${a.score < 0.95 ? "text-orange-600 dark:text-orange-400" : "text-ink"}`}>{fmtPct(a.score, 0)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">Garis tipis menandai target 95%.</p>
          </Card>
          <div className="xl:col-span-2">
            <InsightPanel insight={agentInsight} compact />
          </div>
        </div>
      )}
    </>
  );
}

export default async function QualityPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, history, insights } = await loadPage(searchParams);
  if (!current?.metrics.quality) return <Empty title="Data quality belum tersedia">Upload file SCORE Inbound, Outbound, dan Chat.</Empty>;
  return (
    <div>
      <QualitySection kind="inbound" title="Quality Performance Inbound" source="Score Inbound" history={history} insight={insights.quality_inbound} catInsight={insights.quality_inbound_category} agentInsight={insights.quality_inbound_agent} />
      <QualitySection kind="outbound" title="Quality Performance Outbound" source="Score outbond" history={history} insight={insights.quality_outbound} catInsight={insights.quality_outbound_category} />
      <QualitySection kind="chat" title="Quality Performance Chat" source="Score chat" history={history} insight={insights.quality_chat} catInsight={insights.quality_chat_category} />
    </div>
  );
}
