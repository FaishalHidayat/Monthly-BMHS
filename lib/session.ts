// Token sesi (JWT) — dipakai di proxy (edge) dan server.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "bmhs_session";
export const SESSION_DAYS = 7;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
}

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export async function signSession(u: SessionUser) {
  return new SignJWT({ email: u.email, name: u.name, role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: Number(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}
