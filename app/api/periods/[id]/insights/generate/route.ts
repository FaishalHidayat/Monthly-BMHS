import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { getPeriodBundle } from "@/lib/server/periods";
import { saveInsights } from "@/lib/server/insights";
import { generateAiInsights } from "@/lib/server/ai";

export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser("admin");
  const { current, history } = await getPeriodBundle(Number((await params).id));
  if (!current) throw new HttpError(404, "Periode tidak ditemukan");
  try {
    const { insights, model } = await generateAiInsights(history);
    await saveInsights(current.id, insights, "ai");
    return Response.json({ ok: true, model, slides: Object.keys(insights).length });
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : String(e));
  }
});
