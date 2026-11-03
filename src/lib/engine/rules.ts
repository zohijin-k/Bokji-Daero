// 일반 복지 경로의 값은 시연용이며 공식 확인 전입니다.
// 국민취업지원 I유형의 값과 6개월 제한은 확인된 2026 공식 기준입니다.

export type VerificationStatus = "verified_official" | "needs_official_check";

export type Rule = {
  id: RuleId;
  label: string;
  value: number;
  unit: "원/월" | "개월";
  sourceNote: string;
  verificationStatus: VerificationStatus;
  sourceName?: string;
  sourceUrl?: string;
  verifiedAt?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type RuleId =
  | "livelihoodIncome"
  | "housingIncome"
  | "kuksi1Income"
  | "emergencyIncome"
  | "kuksi2AdultIncome"
  | "kuksi1YouthIncome"
  | "emergencyLivingSupport"
  | "kuksi1WaitMonths";

export const KUKSI1_WAIT_MONTHS = 6;

const MEDIAN_NOTE = "1인 가구 기준 중위소득 2,564,238원(시연용 입력값) 대비";

export const RULES: Record<RuleId, Rule> = {
  livelihoodIncome: {
    id: "livelihoodIncome",
    label: "생계급여 소득 기준",
    value: 820_556,
    unit: "원/월",
    sourceNote: `${MEDIAN_NOTE} 32% 수준으로 기획서에 제공된 값`,
    verificationStatus: "needs_official_check",
  },
  housingIncome: {
    id: "housingIncome",
    label: "주거급여 소득 기준",
    value: 1_230_834,
    unit: "원/월",
    sourceNote: `${MEDIAN_NOTE} 48% 수준으로 기획서에 제공된 값`,
    verificationStatus: "needs_official_check",
  },
  kuksi1Income: {
    id: "kuksi1Income",
    label: "국민취업지원제도 I유형 소득 기준",
    value: 1_538_543,
    unit: "원/월",
    sourceNote: "2026년 1인 가구 기준 60%. 실제 판정은 가구원 수별 2026 기준표를 사용합니다.",
    verificationStatus: "verified_official",
    sourceName: "보건복지부 2026년 기준 중위소득",
    sourceUrl: "https://www.mohw.go.kr/menu.es?mid=a10708010300",
    verifiedAt: "2026-11-03",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  },
  emergencyIncome: {
    id: "emergencyIncome",
    label: "긴급복지 소득 기준",
    value: 1_923_179,
    unit: "원/월",
    sourceNote: `${MEDIAN_NOTE} 75% 수준으로 기획서에 제공된 값`,
    verificationStatus: "needs_official_check",
  },
  kuksi2AdultIncome: {
    id: "kuksi2AdultIncome",
    label: "국민취업지원제도 II유형 소득 기준(35~69세)",
    value: 2_564_238,
    unit: "원/월",
    sourceNote: `${MEDIAN_NOTE} 100% 수준으로 기획서에 제공된 값`,
    verificationStatus: "needs_official_check",
  },
  kuksi1YouthIncome: {
    id: "kuksi1YouthIncome",
    label: "국민취업지원제도 I유형 청년특례 소득 기준",
    value: 3_077_086,
    unit: "원/월",
    sourceNote: "2026년 1인 가구 기준 120%, 15~34세 청년특례 선발형 상한. 실제 판정은 가구원 수별 기준표를 사용합니다.",
    verificationStatus: "verified_official",
    sourceName: "보건복지부 2026년 기준 중위소득",
    sourceUrl: "https://www.mohw.go.kr/menu.es?mid=a10708010300",
    verifiedAt: "2026-11-03",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  },
  emergencyLivingSupport: {
    id: "emergencyLivingSupport",
    label: "긴급복지 생계지원 예상 금액(1인 가구)",
    value: 783_000,
    unit: "원/월",
    sourceNote: "기획서에 제공된 1인 가구 생계지원 예상 금액",
    verificationStatus: "needs_official_check",
  },
  kuksi1WaitMonths: {
    id: "kuksi1WaitMonths",
    label: "구직급여 소진 후 I유형 참여 대기 기간",
    value: KUKSI1_WAIT_MONTHS,
    unit: "개월",
    sourceNote: "고용24 공식 안내: 구직급여 수급 중이거나 수급 종료 후 6개월 미경과 시 참여 제한",
    verificationStatus: "verified_official",
    sourceName: "고용24 국민취업지원제도 취업지원신청 소개",
    sourceUrl: "https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do",
    verifiedAt: "2026-11-03",
    effectiveFrom: null,
    effectiveTo: null,
  },
};

/** 판정 근거의 기준일 표시. 특정 고시일이 아니라 기획서의 연도 기준입니다. */
export const RULE_BASIS = "일반 경로는 2026년 시연 기준 · 국민취업지원 I유형은 2026년 공식 안내 기준";

export const DEMO_DISCLAIMER =
  "일반 복지 경로 일부는 시연용 추정입니다. I유형도 입력값에 따른 사전 검토이며 예외와 최종 자격·접수 여부는 고용센터가 결정합니다.";
