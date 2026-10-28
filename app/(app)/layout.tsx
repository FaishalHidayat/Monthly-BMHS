import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/server/auth";
import { listPeriods } from "@/lib/server/periods";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const periods = await listPeriods();
  return (
    <Suspense>
      <Shell user={user} periods={periods.map((p) => ({ id: p.id, label: p.label, is_seed: p.is_seed }))}>
        {children}
      </Shell>
    </Suspense>
  );
}
