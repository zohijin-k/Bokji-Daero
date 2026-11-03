import { RULES } from "./rules";
import { assessKuksi1 } from "./kuksi1-assessment";
import type { BenefitId, BenefitResult, Blocker, Evaluation, Evidence, Input, Status } from "./types";

export const MAP_STOP_LIMIT = 4;
export const REJECTED_REASON = "탈락 통보 입력, 재검토 경로 확인 필요";

const STATUS_ORDER: Record<Status, number> = {
  available: 0,
  consult: 1,
  waiting: 2,
  blocked: 3,
};

// 같은 상태 안에서의 안내 순서
const PRIORITY: BenefitId[] = [
  "unemployment-benefit",
  "livelihood",
  "housing",
  "kuksi-1",
  "kuksi-1-youth",
  "kuksi-2",
  "emergency",
];

const AGENCY = {
  employment: "고용센터 · 고용24",
  welfareCenter: "주소지 읍·면·동 행정복지센터",
  emergency: "주소지 시·군·구청 또는 읍·면·동 행정복지센터",
} as const;

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** 기준 이하이면 충족. 기준과 같으면 충족, 1원이라도 넘으면 미충족 */
function withinLimit(income: number, limit: number): boolean {
  return income <= limit;
}

const met = (text: string): Evidence => ({ text, kind: "met" });
const unmet = (text: string): Evidence => ({ text, kind: "unmet" });
const check = (text: string): Evidence => ({ text, kind: "check" });
const info = (text: string): Evidence => ({ text, kind: "info" });

function incomeLine(income: number): Evidence {
  return info(`월 소득인정액 추정 ${formatWon(income)}`);
}

function limitLine(label: string, limit: number, income: number): Evidence {
  return withinLimit(income, limit)
    ? met(`${label} ${formatWon(limit)} 이하: 충족`)
    : unmet(`${label} ${formatWon(limit)} 이하 필요: ${formatWon(income - limit)} 초과`);
}

function overReason(income: number, limit: number): string {
  return `소득 기준 초과 (${formatWon(income - limit)} 초과)`;
}

function incomeBlocker(label: string, limit: number): Blocker {
  return {
    kind: "income",
    requirement: `월 소득인정액 ${formatWon(limit)} 이하 (${label})`,
    recheck: "소득인정액이 바뀌면 다시 확인할 수 있어요.",
  };
}

const BENEFIT_ACTIVE_BLOCKER: Blocker = {
  kind: "benefit_active",
  requirement: "구직급여 수급 종료",
  recheck: "구직급여 수급이 끝나면 다시 확인할 수 있어요.",
};

type Draft = Omit<
  BenefitResult,
  "why" | "opensInMonths" | "blockedReason" | "blockers" | "selective" | "ruleIds" | "prepare" | "intakeStatus"
> &
  Partial<Pick<BenefitResult, "opensInMonths" | "blockedReason" | "blockers" | "selective" | "ruleIds" | "prepare">>;

function make(draft: Draft): BenefitResult {
  return {
    intakeStatus: "unknown",
    opensInMonths: null,
    blockedReason: null,
    blockers: [],
    selective: false,
    ruleIds: [],
    prepare: [],
    ...draft,
    why: draft.evidence.map((e) => e.text),
  };
}

function unemploymentBenefit(input: Input): BenefitResult | null {
  if (input.unemploymentBenefit !== "active") return null;
  return make({
    id: "unemployment-benefit",
    title: "구직급여 수급 유지",
    shortTitle: "구직급여",
    status: "available",
    gain: "남은 수급 기간 동안 구직급여 수급 유지",
    how: "정해진 실업인정일에 재취업활동 내역을 내고 실업인정을 신청합니다. 고용센터나 고용24에서 진행합니다.",
    evidence: [
      met("구직급여 수급 중으로 입력함"),
      check("수급 유지 요건은 고용센터 실업인정 절차에서 확인"),
    ],
    agency: AGENCY.employment,
    unchecked: ["구직급여 세부 요건 (수급 자격, 남은 수급 기간 등)"],
    prepare: ["실업인정일에 낼 재취업활동 내역"],
  });
}

function livelihood(input: Input): BenefitResult {
  const limit = RULES.livelihoodIncome.value;
  const base = {
    id: "livelihood" as const,
    title: "기초생활보장 생계급여",
    shortTitle: "생계급여",
    how: "주소지 읍·면·동 행정복지센터에 신청합니다. 재산과 부양 관련 조사를 거쳐 소관 기관이 결정합니다.",
    evidence: [incomeLine(input.income), limitLine("생계급여 기준", limit, input.income)],
    ruleIds: ["livelihoodIncome" as const],
    agency: AGENCY.welfareCenter,
    unchecked: ["재산", "부양 관련 조사"],
  };
  if (withinLimit(input.income, limit)) {
    return make({
      ...base,
      status: "available",
      gain: `월 최대 ${formatWon(limit - input.income)} 예상 (기준 ${formatWon(limit)} − 소득인정액)`,
    });
  }
  return make({
    ...base,
    status: "blocked",
    gain: "기준 충족 시 기준액과 소득인정액의 차액 지원",
    blockedReason: overReason(input.income, limit),
    blockers: [incomeBlocker("생계급여 기준", limit)],
  });
}

function housing(input: Input): BenefitResult {
  const limit = RULES.housingIncome.value;
  const incomeOk = withinLimit(input.income, limit);
  const tenant = input.housing === "tenant";
  const reasons: string[] = [];
  const blockers: Blocker[] = [];
  if (!tenant) {
    reasons.push("임차 가구 대상");
    blockers.push({
      kind: "housing",
      requirement: "임차 가구",
      recheck: "거주 형태가 임차로 바뀌면 다시 확인할 수 있어요.",
    });
  }
  if (!incomeOk) {
    reasons.push(overReason(input.income, limit));
    blockers.push(incomeBlocker("주거급여 기준", limit));
  }

  return make({
    id: "housing",
    title: "기초생활보장 주거급여",
    shortTitle: "주거급여",
    status: reasons.length === 0 ? "available" : "blocked",
    gain: "실제 임차료를 지역별 기준임대료 범위 안에서 지원 (금액은 소관 기관 산정)",
    how: "주소지 읍·면·동 행정복지센터에 신청합니다. 임대차계약서 등 임차 사실 확인 서류가 필요할 수 있습니다.",
    evidence: [
      incomeLine(input.income),
      limitLine("주거급여 기준", limit, input.income),
      tenant ? met("거주 형태 임차: 충족") : unmet("거주 형태 자가·기타: 임차 가구 대상이라 미충족"),
    ],
    blockedReason: reasons.length > 0 ? reasons.join(" · ") : null,
    blockers,
    ruleIds: ["housingIncome"],
    agency: AGENCY.welfareCenter,
    unchecked: ["재산", "실제 임차료와 지역별 기준임대료"],
    prepare: ["임대차계약서 등 임차 사실 확인 서류 (필요할 수 있어요)"],
  });
}

function emergency(input: Input): BenefitResult | null {
  // 구직급여 수급 중이면 경로와 막힌 길 모두에 표시하지 않음
  if (input.unemploymentBenefit === "active") return null;
  const limit = RULES.emergencyIncome.value;
  const support = RULES.emergencyLivingSupport.value;
  const ok = withinLimit(input.income, limit);
  return make({
    id: "emergency",
    title: "긴급복지 생계지원 상담",
    shortTitle: "긴급복지",
    status: ok ? "consult" : "blocked",
    gain: `대상이면 생계지원 월 ${support.toLocaleString("ko-KR")}원 예상`,
    how: "주소지 시·군·구청이나 행정복지센터에 위기 상황을 상담합니다. 실직 등 위기사유는 담당자 확인이 필요합니다.",
    evidence: [
      met("구직급여를 받고 있지 않음"),
      incomeLine(input.income),
      limitLine("긴급복지 기준", limit, input.income),
      check("위기사유 인정 여부는 담당자 확인 필요"),
    ],
    blockedReason: ok ? null : overReason(input.income, limit),
    blockers: ok ? [] : [incomeBlocker("긴급복지 기준", limit)],
    ruleIds: ["emergencyIncome", "emergencyLivingSupport"],
    agency: AGENCY.emergency,
    unchecked: ["위기사유 인정 여부", "재산"],
  });
}

/** 국취 I유형은 공공 규칙과 필수 입력을 모두 확인하는 별도 보수 판정을 사용합니다. */
function kuksi1(input: Input): BenefitResult {
  const assessment = assessKuksi1(input);
  const profile = input.kuksi1Profile;
  const youth = profile?.ageYears !== null && profile?.ageYears !== undefined
    ? profile.ageYears >= 15 && profile.ageYears <= 34
    : input.ageGroup === "young";
  const id: BenefitId = youth ? "kuksi-1-youth" : "kuksi-1";
  const title = youth ? "국민취업지원제도 I유형 청년특례" : "국민취업지원제도 I유형";
  const shortTitle = youth ? "국취 I 청년특례" : "국취 I유형";
  const evidence: Evidence[] = assessment.conditions.map((condition) => ({
    text: `${condition.conditionName}: ${condition.result === "met" ? "충족" : condition.result === "unmet" ? "미충족" : `추가 확인 필요${condition.missingReason ? ` · ${condition.missingReason}` : ""}`}`,
    kind: condition.result === "met" ? "met" : condition.result === "unmet" ? "unmet" : "check",
    conditionId: condition.conditionId,
    conditionName: condition.conditionName,
    userValue: condition.userValue,
    appliedRule: condition.appliedRule,
    missingReason: condition.missingReason,
    sourceName: condition.sourceName,
    sourceUrl: condition.sourceUrl,
    effectiveFrom: condition.effectiveFrom,
    verifiedAt: condition.verifiedAt,
  }));
  const unmatched = assessment.conditions.filter((condition) => condition.result === "unmet");
  const unchecked = assessment.conditions
    .filter((condition) => condition.result === "unknown")
    .map((condition) => condition.conditionName);
  const blocked = assessment.status === "CURRENTLY_INELIGIBLE";
  const timeBlocked = unmatched.some((condition) => condition.conditionId === "kuksi1.unemployment-benefit-wait");
  const blockers = blocked
    ? unmatched.map((condition) => ({
        kind: timeBlocked && condition.conditionId === "kuksi1.unemployment-benefit-wait"
          ? "benefit_ended_wait" as const
          : "kuksi_requirement" as const,
        requirement: `${condition.conditionName}: ${condition.appliedRule}`,
        recheck: condition.conditionId === "kuksi1.unemployment-benefit-wait"
          ? "6개월이 지난 뒤 다른 조건까지 다시 확인해 주세요. 경과만으로 자격이 생기지는 않아요."
          : "조건이 달라졌거나 예외에 해당할 수 있으면 고용센터에서 확인해 주세요.",
      }))
    : [];

  return make({
    id,
    title,
    shortTitle,
    status: blocked ? "blocked" : "consult",
    gain: "취업지원서비스와 구직촉진수당 대상 여부를 고용센터가 심사합니다.",
    how: "고용24에서 구직 등록 후 취업지원 신청을 제출하거나 고용센터에 문의하세요. 구직급여 종료 6개월 경과만으로 신청 자격이 자동 승인되지 않아요.",
    evidence,
    eligibilityAssessment: assessment,
    blockedReason: blocked ? unmatched.map((condition) => condition.conditionName).join(" · ") : null,
    blockers,
    selective: youth || (
      profile?.employmentDaysLast2Years != null &&
      profile.employmentDaysLast2Years < 100 &&
      profile.employmentHoursLast2Years != null &&
      profile.employmentHoursLast2Years < 800
    ),
    ruleIds: [],
    agency: AGENCY.employment,
    unchecked,
    prepare: ["구직 등록", "취업지원 신청서", "가구원 정보 제공 동의 및 자격 확인 자료"],
  });
}

function kuksi2(input: Input): BenefitResult {
  const limit = RULES.kuksi2AdultIncome.value;
  const young = input.ageGroup === "young";
  const base = {
    id: "kuksi-2" as const,
    title: "국민취업지원제도 II유형",
    shortTitle: "국취 II유형",
    gain: "취업지원서비스와 단계별 참여 지원 (세부 지원은 고용센터 안내 확인)",
    how: "고용24나 고용센터에 참여를 신청합니다. 상담을 거쳐 취업활동계획을 세웁니다.",
    ruleIds: ["kuksi2AdultIncome" as const],
    agency: AGENCY.employment,
    unchecked: ["세부 참여 요건 (고용센터 확인)"],
  };

  if (input.unemploymentBenefit === "active") {
    return make({
      ...base,
      status: "blocked",
      evidence: [info("구직급여 수급 중으로 입력함"), unmet("구직급여 수급 종료 후 참여 가능")],
      blockedReason: "구직급여 수급 종료 후 참여 가능",
      blockers: [BENEFIT_ACTIVE_BLOCKER],
    });
  }

  const evidence = [met("구직급여를 받고 있지 않음")];
  if (young) {
    evidence.push(met("34세 이하: 시연 규칙상 소득 기준을 적용하지 않음"));
    return make({ ...base, status: "available", evidence });
  }

  evidence.push(incomeLine(input.income), limitLine("35세 이상 II유형 기준", limit, input.income));
  if (withinLimit(input.income, limit)) {
    return make({ ...base, status: "available", evidence });
  }
  return make({
    ...base,
    status: "blocked",
    evidence,
    blockedReason: overReason(input.income, limit),
    blockers: [incomeBlocker("35세 이상 II유형 기준", limit)],
  });
}

function byRouteOrder(a: BenefitResult, b: BenefitResult): number {
  const status = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (status !== 0) return status;
  const wait = (a.opensInMonths ?? 0) - (b.opensInMonths ?? 0);
  if (wait !== 0) return wait;
  return PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id);
}

function asRejected(result: BenefitResult): BenefitResult {
  const evidence = [unmet("탈락 통보를 받았다고 입력함"), ...result.evidence];
  return {
    ...result,
    status: "blocked",
    opensInMonths: null,
    blockedReason: REJECTED_REASON,
    blockers: [
      {
        kind: "rejected",
        requirement: "소관 기관의 재검토",
        recheck: "이의신청이나 재신청 가능 여부는 소관 기관에 확인해 주세요.",
      },
    ],
    evidence,
    why: evidence.map((e) => e.text),
  };
}

export function evaluate(input: Input): Evaluation {
  const livelihoodResult = livelihood(input);
  const all = [
    unemploymentBenefit(input),
    livelihoodResult,
    housing(input),
    kuksi1(input),
    kuksi2(input),
    emergency(input),
  ]
    .filter((r): r is BenefitResult => r !== null)
    .map((r) => (input.rejectedIds.includes(r.id) ? asRejected(r) : r));

  const route = all.filter((r) => r.status !== "blocked").sort(byRouteOrder);
  const blocked = all
    .filter((r) => r.status === "blocked")
    .sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id));

  const waits = route.flatMap((r) => (r.opensInMonths === null ? [] : [r.opensInMonths]));

  return {
    route,
    blocked,
    mapStops: route.slice(0, MAP_STOP_LIMIT),
    nextOpeningMonths: waits.length > 0 ? Math.min(...waits) : null,
    hasTimeGate:
      input.unemploymentBenefit === "ended" &&
      input.monthsSinceEnded < RULES.kuksi1WaitMonths.value,
  };
}

export type RouteChange = {
  id: BenefitId;
  shortTitle: string;
  before: string | null;
  after: string | null;
};

/** 두 판정 결과를 비교해 상태가 달라진 제도를 돌려줍니다. */
export function diffEvaluations(before: Evaluation, after: Evaluation): RouteChange[] {
  const label = (ev: Evaluation, id: BenefitId) => {
    const found = [...ev.route, ...ev.blocked].find((r) => r.id === id);
    return found ? statusLabel(found) : null;
  };
  const ids = new Set<BenefitId>(
    [...before.route, ...before.blocked, ...after.route, ...after.blocked].map((r) => r.id),
  );
  const changes: RouteChange[] = [];
  for (const id of PRIORITY.filter((p) => ids.has(p))) {
    const b = label(before, id);
    const a = label(after, id);
    if (a === b) continue;
    const ref = [...after.route, ...after.blocked, ...before.route, ...before.blocked].find(
      (r) => r.id === id,
    )!;
    changes.push({ id, shortTitle: ref.shortTitle, before: b, after: a });
  }
  return changes;
}

export type RouteComparison = {
  beforeCount: number;
  afterCount: number;
  /** 새로 경로에 들어온 제도 */
  opened: RouteChange[];
  /** 경로에서 빠진 제도 */
  closed: RouteChange[];
  /** 경로에 계속 있지만 상태가 바뀐 제도 */
  changed: RouteChange[];
};

/** 조건 변경 전후의 경로를 열림, 빠짐, 상태 변경으로 나눕니다. */
export function compareRoutes(before: Evaluation, after: Evaluation): RouteComparison {
  const inRoute = (ev: Evaluation, id: BenefitId) => ev.route.some((r) => r.id === id);
  const result: RouteComparison = {
    beforeCount: before.route.length,
    afterCount: after.route.length,
    opened: [],
    closed: [],
    changed: [],
  };
  for (const change of diffEvaluations(before, after)) {
    const wasIn = inRoute(before, change.id);
    const isIn = inRoute(after, change.id);
    if (!wasIn && isIn) result.opened.push(change);
    else if (wasIn && !isIn) result.closed.push(change);
    else if (wasIn && isIn) result.changed.push(change);
  }
  return result;
}

export function statusLabel(result: Pick<BenefitResult, "status" | "opensInMonths">): string {
  switch (result.status) {
    case "available":
      return "지금 가능";
    case "consult":
      return "상담 필요";
    case "waiting":
      return `${result.opensInMonths}개월 후`;
    case "blocked":
      return "현재 막힘";
  }
}
