import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { getPeriodBundle } from "@/lib/server/periods";
import { getInsights, resetInsights, saveInsights } from "@/lib/server/insights";
import { SLIDE_KEYS } from "@/lib/report/slides";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser();
  const { history } = await getPeriodBundle(Number((await params).id));
  return Response.json(await getInsights(history));
});

// Simpan edit manual satu atau beberapa slide.
export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await apiUser("admin");
  const { insights } = await req.json();
  for (const k of Object.keys(insights ?? {})) if (!SLIDE_KEYS.includes(k)) throw new HttpError(400, `Slide ${k} tidak dikenal`);
  await saveInsights(Number((await params).id), insights, "manual");
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser("admin");
  await resetInsights(Number((await params).id));
  return Response.json({ ok: true });
});
