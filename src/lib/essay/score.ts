export const UNICAMP_MAX_RAW_SCORE = 8.5;

export function convertRawScoreToThousand(rawScore: number, maxRawScore = UNICAMP_MAX_RAW_SCORE) {
  return Math.round((rawScore / maxRawScore) * 1000);
}
