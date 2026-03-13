import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefix = "/app";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(protectedPrefix)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("atlas_session")?.value);
  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
