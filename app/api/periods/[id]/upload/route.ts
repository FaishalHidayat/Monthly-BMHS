import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { saveChunk } from "@/lib/server/periods";
import { DATASETS, type DatasetKey } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const me = await apiUser("admin");
  const periodId = Number((await params).id);
  const b = await req.json();
  if (!DATASETS.some((d) => d.key === b.dataset)) throw new HttpError(400, "Dataset tidak dikenal");
  if (!Array.isArray(b.rows)) throw new HttpError(400, "Data baris tidak valid");
  await saveChunk({
    periodId,
    dataset: b.dataset as DatasetKey,
    chunk: Number(b.chunk),
    totalChunks: Number(b.totalChunks),
    totalRows: Number(b.totalRows),
    rows: b.rows,
    filename: String(b.filename ?? ""),
    userId: me.id,
  });
  return Response.json({ ok: true });
});
