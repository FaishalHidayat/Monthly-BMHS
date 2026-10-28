import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { SESSION_COOKIE, verifySession, type SessionUser } from "../session";

/** User yang sedang login (divalidasi ulang ke DB). */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const rows = await sql<SessionUser[]>`select id, email, name, role from users where id = ${s.id}`;
  return rows[0] ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiUser(role?: "admin"): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Silakan login terlebih dahulu");
  if (role === "admin" && u.role !== "admin") throw new HttpError(403, "Hanya admin yang dapat melakukan aksi ini");
  return u;
}

/** Bungkus handler API agar error dikembalikan sebagai JSON. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : "Terjadi kesalahan";
      if (status === 500) console.error(e);
      return Response.json({ error: message }, { status });
    }
  };
}
