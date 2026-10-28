import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { getAiConfig } from "@/lib/server/settings";
import { testApiKey } from "@/lib/server/ai";

export const maxDuration = 60;

export const POST = handle(async () => {
  await apiUser("admin");
  const { apiKey, model } = await getAiConfig();
  if (!apiKey) throw new HttpError(400, "API key belum diisi");
  try {
    const reply = await testApiKey(apiKey, model);
    return Response.json({ ok: true, model, reply });
  } catch (e) {
    throw new HttpError(400, `Koneksi AI gagal: ${e instanceof Error ? e.message : String(e)}`);
  }
});
