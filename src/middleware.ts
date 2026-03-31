import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/share", "/api/webhooks", "/api/share", "/api/auth", "/api/seed"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  // NextAuth v5 sets either the secure or non-secure cookie depending on protocol
  const hasSession =
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
