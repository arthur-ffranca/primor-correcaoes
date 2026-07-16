import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("rejects a short password", () => {
    const parsed = loginSchema.safeParse({
      email: "teacher@example.com",
      password: "123",
    });

    expect(parsed.success).toBe(false);
  });
});
