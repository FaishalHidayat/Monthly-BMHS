import { apiUser, handle, HttpError } from "@/lib/server/auth";
import { getAiConfig, maskKey, saveApiKey, setSetting } from "@/lib/server/settings";

export const GET = handle(async () => {
  await apiUser("admin");
  const { apiKey, model } = await getAiConfig();
  return Response.json({ apiKey: maskKey(apiKey), hasKey: !!apiKey, model });
});

export const PUT = handle(async (req: Request) => {
  await apiUser("admin");
  const { apiKey, model, clearKey } = await req.json();
  if (clearKey) await saveApiKey(null);
  if (apiKey) {
    if (!/^sk-ant-/.test(String(apiKey).trim())) throw new HttpError(400, "Format API key Anthropic tidak valid (harus diawali sk-ant-)");
    await saveApiKey(String(apiKey).trim());
  }
  if (model) await setSetting("ai_model", String(model));
  return Response.json({ ok: true });
});
