import { Empty } from "@/components/ui";
import { loadPage, type SearchParams } from "@/lib/server/page-data";
import { currentUser } from "@/lib/server/auth";
import { InsightsEditor } from "./editor";

export default async function InsightsPage({ searchParams }: { searchParams: SearchParams }) {
  const { current, insights, sources } = await loadPage(searchParams);
  const user = await currentUser();
  if (!current) return <Empty title="Belum ada periode" />;
  return <InsightsEditor periodId={current.id} label={current.label} insights={insights} sources={sources} canEdit={user?.role === "admin"} />;
}
