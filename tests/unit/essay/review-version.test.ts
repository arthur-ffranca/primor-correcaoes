import { describe, expect, it } from "vitest";
import {
  MAX_REVIEW_VERSIONS,
  buildInitialReviewVersion,
  getLatestReviewVersion,
} from "@/lib/essay/review-version";

describe("essay review versions", () => {
  it("uses a fixed maximum of three review versions", () => {
    expect(MAX_REVIEW_VERSIONS).toBe(3);
  });

  it("builds the first review version from the preliminary analysis", () => {
    const version = buildInitialReviewVersion({
      essaySubmissionId: "essay_1",
      transcriptionSnapshot: "Texto transcrito.",
      issues: [],
      criterionScores: {
        genre: 2,
        purpose: 1.5,
        interlocution: 1,
        image: 1,
        sourceText: 1,
        cohesionAndCoherence: 0.8,
        grammar: 0.4,
        aesthetics: 0,
      },
      totalRawScore: 7.7,
      total1000Score: 906,
    });

    expect(version).toEqual({
      essaySubmissionId: "essay_1",
      versionNumber: 1,
      source: "ai_initial",
      transcriptionSnapshot: "Texto transcrito.",
      issuesPayload: [],
      criterionScoresPayload: {
        genre: 2,
        purpose: 1.5,
        interlocution: 1,
        image: 1,
        sourceText: 1,
        cohesionAndCoherence: 0.8,
        grammar: 0.4,
        aesthetics: 0,
      },
      totalRawScore: 7.7,
      total1000Score: 906,
    });
  });

  it("selects the latest review version by version number", () => {
    expect(
      getLatestReviewVersion([
        { id: "v1", versionNumber: 1 },
        { id: "v3", versionNumber: 3 },
        { id: "v2", versionNumber: 2 },
      ]),
    ).toEqual({ id: "v3", versionNumber: 3 });
  });
});
