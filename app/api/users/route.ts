import bcrypt from "bcryptjs";
import { sql } from "@/lib/server/db";
import { apiUser, handle, HttpError } from "@/lib/server/auth";

export const GET = handle(async () => {
  await apiUser("admin");
  const rows = await sql`select id, email, name, role, created_at, last_login_at from users order by id`;
  return Response.json({ users: rows });
});

export const POST = handle(async (req: Request) => {
  await apiUser("admin");
  const { email, name, password, role } = await req.json();
  if (!email || !name || !password) throw new HttpError(400, "Nama, email, dan password wajib diisi");
  if (String(password).length < 8) throw new HttpError(400, "Password minimal 8 karakter");
  if (!["admin", "user"].includes(role)) throw new HttpError(400, "Role tidak valid");
  const exists = await sql`select 1 from users where lower(email) = lower(${email})`;
  if (exists.length) throw new HttpError(409, "Email sudah terdaftar");
  const [u] = await sql`insert into users (email, name, password_hash, role)
    values (${String(email).trim().toLowerCase()}, ${String(name).trim()}, ${await bcrypt.hash(String(password), 10)}, ${role})
    returning id, email, name, role, created_at`;
  return Response.json({ user: u });
});
