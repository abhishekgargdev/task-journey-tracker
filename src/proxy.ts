import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.SESSION_SECRET || "default-session-secret-key-at-least-32-chars-long";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login, public API routes, and static assets to bypass check
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("tjt_session")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Session verification using jose
    await jwtVerify(sessionToken, encodedKey, {
      algorithms: ["HS256"],
    });
    return NextResponse.next();
  } catch (error) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("tjt_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
