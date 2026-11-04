import { NextResponse } from "next/server";
const SESSION_COOKIE = "library_session";

export function middleware(request) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isLogin = request.nextUrl.pathname === "/login";
  if (!session && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (session && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"] };
