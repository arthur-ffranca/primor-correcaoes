import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");

  if (!req.auth && isProtected && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (req.auth && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
