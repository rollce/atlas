import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefix = "/app";
const authEntryPaths = new Set(["/login", "/signup"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(protectedPrefix)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("atlas_session")?.value);
  if (hasSession) {
    return NextResponse.next();
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (authEntryPaths.has(refererUrl.pathname)) {
        return NextResponse.next();
      }
    } catch {
      // Ignore invalid referer and continue with redirect logic.
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
