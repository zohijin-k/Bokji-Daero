import type {
  AssessmentCondition,
  EligibilityAssessment,
  Input,
  Kuksi1Profile,
} from "./types";
import { KUKSI1_WAIT_MONTHS } from "./rules";

export const WORK24_SOURCE = {
  name: "고용24 국민취업지원제도 취업지원신청 소개",
  url: "https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do",
  verifiedAt: "2026-11-03",
} as const;

export const MOHW_MEDIAN_SOURCE = {
  name: "보건복지부 2026년 기준 중위소득",
  url: "https://www.mohw.go.kr/menu.es?mid=a10708010300",
  effectiveFrom: "2026-01-01",
  verifiedAt: "2026-11-03",
} as const;

export const MEDIAN_INCOME_2026: readonly number[] = [
  0,
  2_564_238,
  4_199_292,
  5_359_036,
  6_494_738,
  7_556_719,
  8_555_952,
  9_515_150,
];

export const EMPTY_KUKSI1_PROFILE: Kuksi1Profile = {
  ageYears: null,
  householdSize: null,
  householdIncomeReferenceYear: null,
  householdMonthlyIncome: null,
  householdAssets: null,
  applicantMonthlyIncome: null,
  employmentDaysLast2Years: null,
  employmentHoursLast2Years: null,
  workStatus: "unknown",
  ableAndWillingToWork: "unknown",
  studyingForAdmission: "unknown",
  otherRecentPublicSupport: "unknown",
  otherParticipationRestrictions: "unknown",
};

type Check = Omit<AssessmentCondition, "sourceName" | "sourceUrl" | "effectiveFrom" | "verifiedAt"> & {
  source?: "work24" | "mohw";
};

function medianIncome(size: number): number | null {
  if (!Number.isInteger(size) || size < 1) return null;
  if (size <= 7) return MEDIAN_INCOME_2026[size];
  const increment = MEDIAN_INCOME_2026[7] - MEDIAN_INCOME_2026[6];
  return MEDIAN_INCOME_2026[7] + (size - 7) * increment;
}

function check(
  condition: Omit<Check, "userValue"> & { userValue: Check["userValue"] },
): AssessmentCondition {
  const source = condition.source === "mohw" ? MOHW_MEDIAN_SOURCE : WORK24_SOURCE;
  return {
    ...condition,
    sourceName: source.name,
    sourceUrl: source.url,
    effectiveFrom: source === MOHW_MEDIAN_SOURCE ? source.effectiveFrom : null,
    verifiedAt: source.verifiedAt,
  };
}

function isAmount(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Conservative, explainable I-type screen based on the checked 2026 Work24 and MOHW sources.
 * A six-month wait only removes that one restriction; it never produces an eligible result alone.
 */
export function assessKuksi1(input: Input): EligibilityAssessment {
  const profile = { ...EMPTY_KUKSI1_PROFILE, ...input.kuksi1Profile };
  const conditions: AssessmentCondition[] = [];

  const add = (c: Omit<Check, "userValue"> & { userValue: Check["userValue"] }) =>
    conditions.push(check(c));

  const ageKnown = Number.isInteger(profile.ageYears) && profile.ageYears !== null && profile.ageYears >= 0;
  const ageEligible = ageKnown && profile.ageYears! >= 15 && profile.ageYears! <= 69;
  add({
    conditionId: "kuksi1.age",
    conditionName: "신청 연령",
    userValue: profile.ageYears,
    appliedRule: "15~69세",
    result: !ageKnown ? "unknown" : ageEligible ? "met" : "unmet",
    missingReason: ageKnown ? null : "정확한 만 나이를 입력하지 않았어요.",
  });

  const size = profile.householdSize;
  const median = Number.isInteger(size) && size !== null ? medianIncome(size) : null;
  const incomeReferenceYear = profile.householdIncomeReferenceYear;
  const yearKnown = Number.isInteger(incomeReferenceYear) && incomeReferenceYear !== null;
  const yearSupported = incomeReferenceYear === 2026;
  const householdIncomeValid = isAmount(profile.householdMonthlyIncome);
  const householdIncome60Limit = median === null || !yearSupported ? null : Math.round(median * 0.6);
  const householdIncome120Limit = median === null || !yearSupported ? null : Math.round(median * 1.2);
  const youthAge = ageKnown && profile.ageYears! >= 15 && profile.ageYears! <= 34;
  const householdIncomeLimit = youthAge ? householdIncome120Limit : householdIncome60Limit;
  const betweenGeneralAndYouth =
    householdIncomeValid && !ageKnown && householdIncome60Limit !== null && householdIncome120Limit !== null &&
    profile.householdMonthlyIncome! > householdIncome60Limit && profile.householdMonthlyIncome! <= householdIncome120Limit;
  const youthSelectionRange =
    youthAge && householdIncomeValid && householdIncome60Limit !== null && householdIncome120Limit !== null &&
    profile.householdMonthlyIncome! > householdIncome60Limit && profile.householdMonthlyIncome! <= householdIncome120Limit;
  const householdIncomeMet = householdIncomeValid && householdIncomeLimit !== null && profile.householdMonthlyIncome! <= householdIncomeLimit;
  const householdIncomeUnmet = householdIncomeValid && householdIncomeLimit !== null && profile.householdMonthlyIncome! > householdIncomeLimit;
  add({
    conditionId: "kuksi1.household-income",
    conditionName: "가구 단위 소득",
    userValue: profile.householdMonthlyIncome,
    appliedRule: householdIncomeLimit === null
      ? "2026년 가구원 수별 기준 중위소득 60% 이하 (15~34세 청년특례는 120% 이하 선발형)"
      : `${size}인 가구 기준 중위소득 ${youthAge ? "120%" : "60%"} 이하 (${householdIncomeLimit.toLocaleString("ko-KR")}원)`,
    result: youthSelectionRange || betweenGeneralAndYouth ? "unknown" : householdIncomeMet ? "met" : householdIncomeUnmet ? "unmet" : "unknown",
    missingReason: youthSelectionRange
      ? "청년특례 소득 구간은 선발형이므로 선정 여부를 추가 확인해야 해요."
      : betweenGeneralAndYouth
        ? "정확한 나이가 확인되지 않아 청년특례 소득 구간 적용 여부를 알 수 없어요."
        : householdIncomeMet || householdIncomeUnmet
      ? null
      : median === null
        ? "가구원 수가 없거나 2026년 기준표 범위 밖이에요."
        : "가구 단위 소득이 없어요. 월급이나 소득인정액으로 대신 계산하지 않아요.",
    source: "mohw",
  });
  add({
    conditionId: "kuksi1.income-reference-year",
    conditionName: "가구 소득 기준 연도",
    userValue: incomeReferenceYear,
    appliedRule: "현재 확인된 가구원 수별 기준표는 2026년 기준",
    result: yearSupported ? "met" : "unknown",
    missingReason: yearKnown ? "입력 연도의 공식 기준표가 이 판정 규칙에 없어요." : "가구 소득의 기준 연도를 확인하지 않았어요.",
    source: "mohw",
  });

  const assetLimit = youthAge ? 500_000_000 : 400_000_000;
  const assetsKnown = isAmount(profile.householdAssets);
  const assetAgeAmbiguous = !ageKnown && assetsKnown && profile.householdAssets! > 400_000_000 && profile.householdAssets! <= 500_000_000;
  const assetsMet = assetsKnown && profile.householdAssets! <= 400_000_000 || (youthAge && assetsKnown && profile.householdAssets! <= 500_000_000);
  const assetsUnmet = assetsKnown && (ageKnown ? profile.householdAssets! > assetLimit : profile.householdAssets! > 500_000_000);
  add({
    conditionId: "kuksi1.household-assets",
    conditionName: "가구원 합산 재산",
    userValue: profile.householdAssets,
    appliedRule: `${youthAge ? "15~34세" : "일반"} 기준 ${assetLimit.toLocaleString("ko-KR")}원 이하`,
    result: assetAgeAmbiguous ? "unknown" : assetsMet ? "met" : assetsUnmet ? "unmet" : "unknown",
    missingReason: assetsKnown ? null : "가구원 합산 재산이 확인되지 않았어요.",
  });

  const days = profile.employmentDaysLast2Years;
  const hours = profile.employmentHoursLast2Years;
  const daysKnown = isAmount(days);
  const hoursKnown = isAmount(hours);
  const experienceMet = (daysKnown && days! >= 100) || (hoursKnown && hours! >= 800);
  const experienceBelowSelection = daysKnown && hoursKnown && days! < 100 && hours! < 800;
  add({
    conditionId: "kuksi1.work-experience",
    conditionName: "최근 2년 취업 경험",
    userValue: `${daysKnown ? `${days}일` : "일수 미입력"} / ${hoursKnown ? `${hours}시간` : "시간 미입력"}`,
    appliedRule: "100일 이상 또는 800시간 이상 여부를 확인 (미달 시 비경제활동 선발형 검토)",
    result: experienceMet ? "met" : "unknown",
    missingReason: experienceMet
      ? null
      : experienceBelowSelection
        ? "비경제활동 선발형 후보 조건에 해당할 수 있으므로 선발 여부를 확인해야 해요."
        : "최근 2년의 일수와 시간이 모두 확인되지 않았어요.",
  });

  const personalIncomeKnown = isAmount(profile.applicantMonthlyIncome);
  const personalIncomeLimit = Math.round(MEDIAN_INCOME_2026[1] * 0.6);
  const personalIncomeUnmet = personalIncomeKnown && profile.applicantMonthlyIncome! > personalIncomeLimit;
  add({
    conditionId: "kuksi1.applicant-income-cap",
    conditionName: "신청인 본인 월평균 소득 제한",
    userValue: profile.applicantMonthlyIncome,
    appliedRule: `1인 가구 기준 중위소득 60% (${personalIncomeLimit.toLocaleString("ko-KR")}원) 초과 여부`,
    result: personalIncomeUnmet ? "unmet" : personalIncomeKnown ? "met" : "unknown",
    missingReason: personalIncomeKnown ? null : "신청인 본인의 월평균 소득이 확인되지 않았어요.",
  });

  const workStatusAllowed = ["not-employed", "employee-under-30-hours", "self-employed-under-2.5m"].includes(profile.workStatus);
  const workStatusBlocked = profile.workStatus === "other-employed";
  add({
    conditionId: "kuksi1.current-employment",
    conditionName: "현재 취업 상태",
    userValue: profile.workStatus,
    appliedRule: "미취업 또는 고용24 안내상 불완전 취업 예외에 해당",
    result: workStatusAllowed ? "met" : workStatusBlocked ? "unmet" : "unknown",
    missingReason: profile.workStatus === "unknown" ? "현재 근로시간과 사업소득에 따른 취업 상태가 확인되지 않았어요." : null,
  });

  const booleanCondition = (
    id: string,
    name: string,
    value: "yes" | "no" | "unknown",
    rule: string,
    isRestriction: boolean,
  ) => {
    const result = value === "unknown" ? "unknown" : (value === "yes") === isRestriction ? "unmet" : "met";
    add({
      conditionId: id,
      conditionName: name,
      userValue: value,
      appliedRule: rule,
      result,
      missingReason: value === "unknown" ? `${name} 여부가 확인되지 않았어요.` : null,
    });
  };

  booleanCondition("kuksi1.work-capacity", "근로 능력과 취업 의사", profile.ableAndWillingToWork, "근로 능력과 취업·구직 의사 필요", false);
  booleanCondition("kuksi1.study-restriction", "진학 목적 교육기관 재학·수강", profile.studyingForAdmission, "해당 목적으로 재학·수강 중이면 참여 제한", true);
  booleanCondition("kuksi1.other-public-support", "다른 구직지원금·재정지원 일자리 제한", profile.otherRecentPublicSupport, "중복 제한 및 종료 후 유예 여부를 기관 기준으로 확인", true);
  booleanCondition("kuksi1.other-restrictions", "기타 참여 제한 및 예외 확인", profile.otherParticipationRestrictions, "고용24 상세 기준의 나머지 제한·예외를 확인", true);

  const benefitEndMonths = input.unemploymentBenefit === "active"
    ? null
    : input.unemploymentBenefit === "ended"
      ? input.monthsSinceEnded
      : Number.POSITIVE_INFINITY;
  const benefitRestriction = input.unemploymentBenefit === "active" ||
    (benefitEndMonths !== null && benefitEndMonths < KUKSI1_WAIT_MONTHS);
  const benefitKnown = input.unemploymentBenefit !== "ended" || (Number.isInteger(input.monthsSinceEnded) && input.monthsSinceEnded >= 0);
  conditions.push({
    conditionId: "kuksi1.unemployment-benefit-wait",
    conditionName: "구직급여 제한 기간",
    userValue: input.unemploymentBenefit === "active" ? "수급 중" : input.unemploymentBenefit === "ended" ? `${input.monthsSinceEnded}개월 경과` : "수급 없음",
    appliedRule: `수급 중 또는 종료 후 ${KUKSI1_WAIT_MONTHS}개월 미경과 시 참여 제한`,
    result: !benefitKnown ? "unknown" : benefitRestriction ? "unmet" : "met",
    missingReason: benefitKnown ? null : "구직급여 종료 후 경과 기간이 올바르게 입력되지 않았어요.",
    sourceName: WORK24_SOURCE.name,
    sourceUrl: WORK24_SOURCE.url,
    effectiveFrom: null,
    verifiedAt: WORK24_SOURCE.verifiedAt,
  });

  const unmetConditions = conditions.filter((c) => c.result === "unmet");
  const unknownConditions = conditions.filter((c) => c.result === "unknown");
  const hasUnsupportedYear = yearKnown && !yearSupported;
  const status = unmetConditions.length > 0
    ? "CURRENTLY_INELIGIBLE"
    : hasUnsupportedYear
      ? "UNKNOWN"
    : unknownConditions.length > 0
      ? "NEEDS_MORE_INFO"
      : "LIKELY_ELIGIBLE";

  const summary = status === "CURRENTLY_INELIGIBLE"
    ? `확인된 미충족 조건: ${unmetConditions.map((c) => c.conditionName).join(", ")}. 다른 충족 조건으로 상쇄되지 않아요.`
    : status === "UNKNOWN"
      ? "이 입력의 기준 연도를 적용할 검증된 제도 기준이 없어요. 현재 판정은 알 수 없음으로 남깁니다."
    : status === "NEEDS_MORE_INFO"
      ? `확인이 필요한 조건 ${unknownConditions.length}개가 있어요. 지금 입력만으로 자격을 긍정 판정하지 않아요.`
      : "확인한 주요 기준에 부합해 보여요. 최종 자격과 접수 여부는 고용센터 심사가 필요해요.";

  return {
    status,
    summary,
    conditions,
    sourceName: WORK24_SOURCE.name,
    sourceUrl: WORK24_SOURCE.url,
    effectiveFrom: null,
    verifiedAt: WORK24_SOURCE.verifiedAt,
    dataConfidence: unknownConditions.length === 0 ? "official_rule_complete_profile" : "official_rule_partial_profile",
  };
}
