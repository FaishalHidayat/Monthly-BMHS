import "server-only";
import { sql } from "./db";
import { decrypt, encrypt } from "./crypto";

export const DEFAULT_MODEL = "claude-opus-5-5";

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql<{ value: string }[]>`select value from settings where key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  if (value == null) {
    await sql`delete from settings where key = ${key}`;
    return;
  }
  await sql`insert into settings (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export async function getAiConfig() {
  const [enc, model] = await Promise.all([getSetting("anthropic_api_key"), getSetting("ai_model")]);
  let apiKey: string | null = null;
  if (enc) {
    try {
      apiKey = decrypt(enc);
    } catch {
      apiKey = null;
    }
  }
  apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;
  return { apiKey, model: model || DEFAULT_MODEL };
}

export async function saveApiKey(key: string | null) {
  await setSetting("anthropic_api_key", key ? encrypt(key) : null);
}

export const maskKey = (k: string | null) => (k ? `${k.slice(0, 10)}…${k.slice(-4)}` : null);
