import type { NextAuthConfig } from "next-auth";
import { authCallbacks } from "@/lib/auth-callbacks";

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? "local-development-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: authCallbacks,
  providers: [],
} satisfies NextAuthConfig;
