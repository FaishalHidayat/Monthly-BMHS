import bcrypt from "bcryptjs";
import { sql } from "@/lib/server/db";
import { apiUser, handle, HttpError } from "@/lib/server/auth";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await apiUser("admin");
  const id = Number((await params).id);
  const { name, role, password } = await req.json();
  if (role && !["admin", "user"].includes(role)) throw new HttpError(400, "Role tidak valid");
  if (id === me.id && role === "user") throw new HttpError(400, "Anda tidak dapat menurunkan role akun sendiri");
  if (name) await sql`update users set name = ${String(name).trim()} where id = ${id}`;
  if (role) await sql`update users set role = ${role} where id = ${id}`;
  if (password) {
    if (String(password).length < 8) throw new HttpError(400, "Password minimal 8 karakter");
    await sql`update users set password_hash = ${await bcrypt.hash(String(password), 10)} where id = ${id}`;
  }
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await apiUser("admin");
  const id = Number((await params).id);
  if (id === me.id) throw new HttpError(400, "Anda tidak dapat menghapus akun sendiri");
  await sql`delete from users where id = ${id}`;
  return Response.json({ ok: true });
});
