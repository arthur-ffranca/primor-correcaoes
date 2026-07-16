import { describe, expect, it } from "vitest";
import { runEssayPipeline } from "@/lib/essay/pipeline";

describe("runEssayPipeline", () => {
  it("marks a readable essay as ready for review", async () => {
    const result = await runEssayPipeline({
      rawText: "Escrevo este post para dialogar com voces sobre minha experiencia.",
      imageQuality: "good",
    });

    expect(result.status).toBe("ready_for_review");
    expect(result.totalRawScore).toBe(8.5);
    expect(result.total1000Score).toBe(1000);
  });

  it("requests resubmission when the image is too poor", async () => {
    const result = await runEssayPipeline({
      rawText: "",
      imageQuality: "poor",
    });

    expect(result.status).toBe("needs_resubmission");
    expect(result.resubmissionReason).toContain("foto");
  });
});
