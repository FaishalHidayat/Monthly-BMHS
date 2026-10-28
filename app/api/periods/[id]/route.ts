import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { deletePeriod, getAutoMetrics, getOverrides, getPeriod, setOverrides } from "@/lib/server/periods";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser();
  const p = await getPeriod(Number((await params).id));
  if (!p) throw new HttpError(404, "Periode tidak ditemukan");
  return Response.json({ period: p, overrides: await getOverrides(p.id), auto: await getAutoMetrics(p.id) });
});

// Koreksi manual (mis. angka quality) yang menimpa hasil hitung otomatis.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await apiUser("admin");
  const { overrides } = await req.json();
  await setOverrides(Number((await params).id), overrides ?? {});
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser("admin");
  await deletePeriod(Number((await params).id));
  return Response.json({ ok: true });
});
