import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { createPeriod, listPeriods } from "@/lib/server/periods";

export const GET = handle(async () => {
  await apiUser();
  return Response.json({ periods: await listPeriods() });
});

export const POST = handle(async (req: Request) => {
  await apiUser("admin");
  const { start, end } = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end)
    throw new HttpError(400, "Tanggal periode tidak valid");
  return Response.json({ id: await createPeriod(start, end) });
});
