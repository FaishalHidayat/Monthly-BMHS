import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Enkripsi AES-256-GCM untuk secret yang disimpan di DB (mis. API key AI).
const key = () => createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(token: string): string {
  const [v, iv, tag, data] = token.split(":");
  if (v !== "v1") throw new Error("Format secret tidak dikenal");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
