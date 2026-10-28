import { apiUser, handle } from "@/lib/server/auth";
import { recompute } from "@/lib/server/periods";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  await apiUser("admin");
  const metrics = await recompute(Number((await params).id));
  return Response.json({ ok: true, sections: Object.keys(metrics) });
});
