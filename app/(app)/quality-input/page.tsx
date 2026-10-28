import { requireAdminPage } from "@/lib/server/auth";
import { listPeriods } from "@/lib/server/periods";
import type { SearchParams } from "@/lib/server/page-data";
import { QualityInput } from "./quality-input";

export default async function QualityInputPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const periods = await listPeriods();
  const sp = await searchParams;
  const p = Number(Array.isArray(sp.p) ? sp.p[0] : sp.p);
  const initial = periods.find((x) => x.id === p)?.id ?? periods.find((x) => !x.is_seed)?.id ?? periods[0]?.id;
  return <QualityInput periods={periods} initialId={initial} />;
}
