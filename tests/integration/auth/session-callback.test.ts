import { describe, expect, it } from "vitest";
import { authCallbacks } from "@/lib/auth-callbacks";

describe("authCallbacks", () => {
  it("copies the authenticated user id into the session", async () => {
    const jwt = await authCallbacks.jwt({
      token: {},
      user: {
        id: "user_123",
        email: "teacher@example.com",
      },
      account: null,
      profile: undefined,
      trigger: "signIn",
      session: undefined,
    } as never);

    const session = await authCallbacks.session({
      session: {
        user: {
          email: "teacher@example.com",
        },
        expires: "2026-07-16T00:00:00.000Z",
      },
      token: jwt as never,
      user: undefined,
      newSession: undefined,
      trigger: undefined,
    } as never);

    expect(session.user.id).toBe("user_123");
  });
});
