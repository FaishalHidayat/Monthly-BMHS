import bcrypt from "bcryptjs";
import { sql } from "@/lib/server/db";
import { apiUser, handle, HttpError } from "@/lib/server/auth";

export const POST = handle(async (req: Request) => {
  const me = await apiUser();
  const { current, next } = await req.json();
  if (!next || String(next).length < 8) throw new HttpError(400, "Password baru minimal 8 karakter");
  const [u] = await sql`select password_hash from users where id = ${me.id}`;
  if (!(await bcrypt.compare(String(current ?? ""), u.password_hash))) throw new HttpError(400, "Password saat ini salah");
  await sql`update users set password_hash = ${await bcrypt.hash(String(next), 10)} where id = ${me.id}`;
  return Response.json({ ok: true });
});
