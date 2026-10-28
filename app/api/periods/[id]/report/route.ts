import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { getPeriodBundle } from "@/lib/server/periods";
import { getInsights } from "@/lib/server/insights";

type Ctx = { params: Promise<{ id: string }> };

// Data lengkap untuk membuat file PPT di browser.
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser();
  const { current, history } = await getPeriodBundle(Number((await params).id));
  if (!current) throw new HttpError(404, "Periode tidak ditemukan");
  const { map } = await getInsights(history);
  return Response.json({ history, insights: map });
});
