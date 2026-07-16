import { describe, expect, it } from "vitest";
import { convertRawScoreToThousand } from "@/lib/essay/score";

describe("convertRawScoreToThousand", () => {
  it("converts 8.5 into 1000", () => {
    expect(convertRawScoreToThousand(8.5, 8.5)).toBe(1000);
  });

  it("rounds 4.25 into 500", () => {
    expect(convertRawScoreToThousand(4.25, 8.5)).toBe(500);
  });
});
