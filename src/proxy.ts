import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { sessionCookieName } from "@/lib/auth/constants";
import { env } from "@/lib/env";

function getSecretKey() {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSecretKey());
    return verified.payload as { role?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/intake") ||
    pathname.startsWith("/api/stripe/webhooks") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/affiliate") ||
    pathname.startsWith("/api/admin")
  ) {
    const session = await readSession(request);

    if (!session?.role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (session.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/affiliate", request.url));
      }
    }

    if (pathname.startsWith("/affiliate")) {
      if (session.role !== "AFFILIATE_ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/affiliate/:path*", "/api/admin/:path*", "/login"],
};
