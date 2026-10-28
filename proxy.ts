import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

// Pemeriksaan sesi untuk semua halaman & API, kecuali login.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth/login") || pathname === "/api/health";
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (isPublic) {
    if (session && pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
