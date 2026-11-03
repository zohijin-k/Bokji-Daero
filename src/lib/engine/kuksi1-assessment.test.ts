import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT, EMPTY_KUKSI1_PROFILE, assessKuksi1, evaluate } from "./index";
import type { Input, Kuksi1Profile } from "./types";

const completeProfile = (): Kuksi1Profile => ({
  ...EMPTY_KUKSI1_PROFILE,
  ageYears: 40,
  householdSize: 1,
  householdIncomeReferenceYear: 2026,
  householdMonthlyIncome: 1_500_000,
  householdAssets: 100_000_000,
  applicantMonthlyIncome: 1_500_000,
  employmentDaysLast2Years: 100,
  employmentHoursLast2Years: 800,
  workStatus: "not-employed",
  ableAndWillingToWork: "yes",
  studyingForAdmission: "no",
  otherRecentPublicSupport: "no",
  otherParticipationRestrictions: "no",
});

const assess = (overrides: Partial<Input> = {}) => assessKuksi1({
  ...DEFAULT_INPUT,
  unemploymentBenefit: "none",
  kuksi1Profile: completeProfile(),
  ...overrides,
});

describe("국민취업지원제도 I유형 공식 규칙 판정", () => {
  it("모든 핵심값을 확인해도 공식 심사 전의 likely 상태만 반환", () => {
    expect(assess().status).toBe("LIKELY_ELIGIBLE");
    expect(assess().conditions.every((condition) => condition.result === "met")).toBe(true);
  });

  it("하나의 확정 미충족 조건은 다른 충족 조건으로 상쇄되지 않음", () => {
    const result = assess({ kuksi1Profile: { ...completeProfile(), householdAssets: 450_000_000 } });
    expect(result.status).toBe("CURRENTLY_INELIGIBLE");
    expect(result.conditions.find((condition) => condition.conditionId === "kuksi1.household-assets")?.result).toBe("unmet");
  });

  it("필수 정보 누락은 긍정 판정 대신 needs more info", () => {
    const result = assess({ kuksi1Profile: EMPTY_KUKSI1_PROFILE });
    expect(result.status).toBe("NEEDS_MORE_INFO");
    expect(result.conditions.some((condition) => condition.result === "unknown")).toBe(true);
  });

  it("구직급여 수급 중이면 현재 미충족", () => {
    expect(assess({ unemploymentBenefit: "active" }).status).toBe("CURRENTLY_INELIGIBLE");
  });

  it("구직급여 종료 후 3개월이면 현재 미충족", () => {
    expect(assess({ unemploymentBenefit: "ended", monthsSinceEnded: 3 }).status).toBe("CURRENTLY_INELIGIBLE");
  });

  it("종료 후 6개월은 이 제한만 풀며, 다른 조건도 모두 확인해야 likely", () => {
    expect(assess({ unemploymentBenefit: "ended", monthsSinceEnded: 6 }).status).toBe("LIKELY_ELIGIBLE");
    expect(assess({ unemploymentBenefit: "ended", monthsSinceEnded: 6, kuksi1Profile: EMPTY_KUKSI1_PROFILE }).status).toBe("NEEDS_MORE_INFO");
  });

  it("가구원 수 미확인은 가구별 소득 기준을 계산하지 않음", () => {
    const result = assess({ kuksi1Profile: { ...completeProfile(), householdSize: null } });
    expect(result.status).toBe("NEEDS_MORE_INFO");
    expect(result.conditions.find((condition) => condition.conditionId === "kuksi1.household-income")?.result).toBe("unknown");
  });

  it("월급·가구소득·소득인정액을 서로 대체하지 않음", () => {
    const profile = { ...completeProfile(), householdMonthlyIncome: null, applicantMonthlyIncome: null };
    const lowDemoAmount = assess({ income: 0, kuksi1Profile: profile });
    const highDemoAmount = assess({ income: 3_000_000, kuksi1Profile: profile });
    expect(lowDemoAmount.status).toBe("NEEDS_MORE_INFO");
    expect(highDemoAmount.status).toBe("NEEDS_MORE_INFO");
    expect(lowDemoAmount.conditions.find((condition) => condition.conditionId === "kuksi1.household-income")?.userValue).toBeNull();
    expect(lowDemoAmount.conditions.find((condition) => condition.conditionId === "kuksi1.applicant-income-cap")?.userValue).toBeNull();
  });

  it("지원 소득의 기준 연도가 2026 이외이면 검증된 기준이 없어 unknown", () => {
    const result = assess({ kuksi1Profile: { ...completeProfile(), householdIncomeReferenceYear: 2025 } });
    expect(result.status).toBe("UNKNOWN");
  });

  it("나이 구간이 확인되지 않은 4억~5억 재산은 미충족으로 단정하지 않음", () => {
    const result = assess({ kuksi1Profile: { ...completeProfile(), ageYears: null, householdAssets: 450_000_000 } });
    expect(result.status).toBe("NEEDS_MORE_INFO");
    expect(result.conditions.find((condition) => condition.conditionId === "kuksi1.household-assets")?.result).toBe("unknown");
  });

  it("청년 가구소득 60% 초과~120% 이하는 선발 확인이 필요", () => {
    const result = assess({ kuksi1Profile: { ...completeProfile(), ageYears: 30, householdMonthlyIncome: 2_000_000 } });
    expect(result.status).toBe("NEEDS_MORE_INFO");
    expect(result.conditions.find((condition) => condition.conditionId === "kuksi1.household-income")?.missingReason).toContain("선발형");
  });

  it("rule-based assessment는 앱의 intake/status를 승인 상태로 바꾸지 않음", () => {
    const input: Input = {
      ...DEFAULT_INPUT,
      unemploymentBenefit: "none",
      kuksi1Profile: completeProfile(),
    };
    const result = [...evaluate(input).route, ...evaluate(input).blocked].find((item) => item.id === "kuksi-1")!;
    expect(result.eligibilityAssessment?.status).toBe("LIKELY_ELIGIBLE");
    expect(result.status).toBe("consult");
    expect(result.intakeStatus).toBe("unknown");
  });
});
