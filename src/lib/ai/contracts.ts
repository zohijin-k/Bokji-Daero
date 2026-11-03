import type { BenefitId, Input } from "@/lib/engine";
import type { ProgressStatus } from "@/lib/state/app-state";

export type AiGuidanceRequest = {
  benefitId: BenefitId;
  input: Partial<Input>;
  progressStatus: ProgressStatus;
  routeReviewed: boolean;
};

/** Send only the values needed to explain the selected route. */
export function projectMinimalAiInput(benefitId: BenefitId, input: Input): Partial<Input> {
  if (benefitId === "kuksi-1" || benefitId === "kuksi-1-youth") {
    return {
      ageGroup: input.ageGroup,
      unemploymentBenefit: input.unemploymentBenefit,
      monthsSinceEnded: input.monthsSinceEnded,
      kuksi1Profile: input.kuksi1Profile,
    };
  }
  if (benefitId === "housing") {
    return { income: input.income, housing: input.housing };
  }
  if (benefitId === "emergency") {
    return { income: input.income, unemploymentBenefit: input.unemploymentBenefit };
  }
  if (benefitId === "kuksi-2") {
    return { income: input.income, ageGroup: input.ageGroup, unemploymentBenefit: input.unemploymentBenefit };
  }
  if (benefitId === "unemployment-benefit") {
    return { unemploymentBenefit: input.unemploymentBenefit };
  }
  return { income: input.income };
}

export type AiGuidance = {
  benefitId: BenefitId;
  routeStatus: "available" | "consult" | "waiting" | "blocked";
  assessmentStatus: "LIKELY_ELIGIBLE" | "NEEDS_MORE_INFO" | "CURRENTLY_INELIGIBLE" | "UNKNOWN" | "NOT_ASSESSED";
  summary: string;
  reasonExplanation: string;
  confirmedFacts: Array<{ conditionId: string; conditionName: string; result: "met" | "unmet"; appliedRule: string }>;
  missingInformation: Array<{ conditionId: string; conditionName: string; reason: string }>;
  nextActions: Array<{ actionId: string; title: string; description: string }>;
  clarificationQuestions: Array<{ conditionId: string; question: string }>;
  sourceReferences: Array<{ sourceId: string; name: string; url: string; role: "eligibility_rule" | "overview_only"; verifiedAt: string | null; effectiveFrom: string | null }>;
  limitations: string[];
  generatedAt: string;
};
