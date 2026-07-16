import { describe, expect, it } from "vitest";
import { createEssayUploadKey } from "@/lib/storage";

describe("createEssayUploadKey", () => {
  it("nests files under the owner and essay id", () => {
    const key = createEssayUploadKey({
      userId: "user_1",
      essayId: "essay_1",
      pageOrder: 2,
      extension: "jpg",
    });

    expect(key).toBe("users/user_1/essays/essay_1/page-2.jpg");
  });
});
