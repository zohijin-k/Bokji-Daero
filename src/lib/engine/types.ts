import type { RuleId } from "./rules";

export type AgeGroup = "young" | "adult"; // young: 34세 이하, adult: 35세 이상
export type Housing = "tenant" | "other";
export type UnemploymentBenefit = "none" | "active" | "ended";

export type TriState = "yes" | "no" | "unknown";
export type Kuksi1WorkStatus =
  | "not-employed"
  | "employee-under-30-hours"
  | "self-employed-under-2.5m"
  | "other-employed"
  | "unknown";

/** 국민취업지원제도 I유형 세부 검토 입력. 모르는 항목은 추정하지 않습니다. */
export type Kuksi1Profile = {
  ageYears: number | null;
  householdSize: number | null;
  householdIncomeReferenceYear: number | null;
  householdMonthlyIncome: number | null;
  householdAssets: number | null;
  applicantMonthlyIncome: number | null;
  employmentDaysLast2Years: number | null;
  employmentHoursLast2Years: number | null;
  workStatus: Kuksi1WorkStatus;
  ableAndWillingToWork: TriState;
  studyingForAdmission: TriState;
  otherRecentPublicSupport: TriState;
  otherParticipationRestrictions: TriState;
};

export type Input = {
  income: number;
  ageGroup: AgeGroup;
  housing: Housing;
  unemploymentBenefit: UnemploymentBenefit;
  monthsSinceEnded: number;
  rejectedIds: string[];
  /** 이전 localStorage 기록과 호환되도록 optional. 누락 시 빈 프로필로 처리합니다. */
  kuksi1Profile?: Kuksi1Profile;
};

export type BenefitId =
  | "unemployment-benefit"
  | "livelihood"
  | "housing"
  | "emergency"
  | "kuksi-1"
  | "kuksi-1-youth"
  | "kuksi-2";

/** available: 지금 가능, consult: 상담 필요, waiting: N개월 후, blocked: 막힘 */
export type Status = "available" | "consult" | "waiting" | "blocked";
/** 접수 일정 데이터는 외부 연동이 없어 모든 제도에서 확인되지 않은 상태입니다. */
export type IntakeStatus = "unknown";

export type EligibilityVerdict = "LIKELY_ELIGIBLE" | "NEEDS_MORE_INFO" | "CURRENTLY_INELIGIBLE" | "UNKNOWN";

export type AssessmentCondition = {
  conditionId: string;
  conditionName: string;
  userValue: string | number | boolean | null;
  appliedRule: string;
  result: "met" | "unmet" | "unknown";
  missingReason: string | null;
  sourceName: string;
  sourceUrl: string;
  effectiveFrom: string | null;
  verifiedAt: string | null;
};

export type EligibilityAssessment = {
  status: EligibilityVerdict;
  summary: string;
  conditions: AssessmentCondition[];
  sourceName: string;
  sourceUrl: string;
  effectiveFrom: string | null;
  verifiedAt: string | null;
  dataConfidence: "official_rule_partial_profile" | "official_rule_complete_profile" | "unverified";
};

/** 판정 근거 한 줄. met: 충족, unmet: 미충족, check: 담당자 확인 필요, info: 입력값 등 참고 */
export type Evidence = {
  text: string;
  kind: "met" | "unmet" | "check" | "info";
  conditionId?: string;
  conditionName?: string;
  userValue?: string | number | boolean | null;
  appliedRule?: string;
  missingReason?: string | null;
  sourceName?: string;
  sourceUrl?: string;
  effectiveFrom?: string | null;
  verifiedAt?: string | null;
};

export type BlockerKind = "income" | "housing" | "livelihood_excluded" | "benefit_active" | "benefit_ended_wait" | "kuksi_requirement" | "rejected";

/** 막힌 이유 하나와 그 조건이 무엇인지, 언제 다시 확인할 수 있는지 */
export type Blocker = {
  kind: BlockerKind;
  /** 필요한 조건 */
  requirement: string;
  /** 다시 확인할 수 있는 때 (판정 데이터로 알 수 있는 범위만) */
  recheck: string;
};

export type BenefitResult = {
  id: BenefitId;
  title: string;
  shortTitle: string;
  status: Status;
  /** 신청 접수 중인지에 대한 기관 데이터 상태. 자격 판정과 별도로 관리합니다. */
  intakeStatus: IntakeStatus;
  /** 지원 내용 */
  gain: string;
  /** 진행 방법 */
  how: string;
  /** 판정 근거 (evidence의 문장만 모은 것) */
  why: string[];
  /** 판정 근거와 각 항목의 충족 여부 */
  evidence: Evidence[];
  /** 구조화된 자격 검토. 접수 상태와 공식 심사 결과와는 별개입니다. */
  eligibilityAssessment?: EligibilityAssessment;
  /** waiting일 때만 숫자, 나머지는 null */
  opensInMonths: number | null;
  /** blocked일 때 한 줄 사유 */
  blockedReason: string | null;
  /** blocked일 때 막힌 이유 목록 */
  blockers: Blocker[];
  /** 선발형 제도 여부 */
  selective: boolean;
  /** 판정에 쓰인 규칙 (출처 표시용) */
  ruleIds: RuleId[];
  /** 최종 판정과 신청을 맡는 곳 */
  agency: string;
  /** 시연 엔진이 확인하지 않은 조건 */
  unchecked: string[];
  /** 준비할 것 (근거가 있는 항목만, 없으면 빈 배열) */
  prepare: string[];
};

export type Evaluation = {
  /** 지금 가능 → 상담 필요 → N개월 후 순서의 경로 */
  route: BenefitResult[];
  /** 막힌 길 */
  blocked: BenefitResult[];
  /** 지도에 표시할 경로 (최대 4개) */
  mapStops: BenefitResult[];
  /** 대기 구간 중 가장 먼저 열리는 개월 수, 없으면 null */
  nextOpeningMonths: number | null;
  /** 구직급여 소진 후 6개월 미만이라 대기 구간이 남아 있는지 */
  hasTimeGate: boolean;
};
