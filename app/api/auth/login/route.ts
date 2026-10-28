import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "@/lib/server/db";
import { handle, HttpError } from "@/lib/server/auth";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session";

export const POST = handle(async (req: Request) => {
  const { email, password } = await req.json();
  if (!email || !password) throw new HttpError(400, "Email dan password wajib diisi");
  const rows = await sql`select id, email, name, role, password_hash from users where lower(email) = lower(${String(email).trim()})`;
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password), u.password_hash))) throw new HttpError(401, "Email atau password salah");
  await sql`update users set last_login_at = now() where id = ${u.id}`;
  const token = await signSession({ id: u.id, email: u.email, name: u.name, role: u.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return Response.json({ ok: true, role: u.role });
});
