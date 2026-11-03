export * from "./types";
export * from "./rules";
export * from "./evaluate";

import type { Input } from "./types";
import { EMPTY_KUKSI1_PROFILE } from "./kuksi1-assessment";

export * from "./kuksi1-assessment";

/** 시연 기본 시나리오: 월 130만 원, 35세 이상, 임차, 구직급여 소진 후 3개월 */
export const DEFAULT_INPUT: Input = {
  income: 1_300_000,
  ageGroup: "adult",
  housing: "tenant",
  unemploymentBenefit: "ended",
  monthsSinceEnded: 3,
  rejectedIds: [],
  kuksi1Profile: { ...EMPTY_KUKSI1_PROFILE },
};
