import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT, RULES, evaluate, compareRoutes, diffEvaluations, REJECTED_REASON } from "./index";
import type { BenefitId, Evaluation, Input } from "./index";

const run = (overrides: Partial<Input> = {}) => evaluate({ ...DEFAULT_INPUT, ...overrides });

const find = (ev: Evaluation, id: BenefitId) =>
  [...ev.route, ...ev.blocked].find((r) => r.id === id);

const routeIds = (ev: Evaluation) => ev.route.map((r) => r.id);
const blockedIds = (ev: Evaluation) => ev.blocked.map((r) => r.id);

describe("기본 시나리오 (월 130만 원, 35세 이상, 임차, 소진 후 3개월)", () => {
  const ev = run();

  it("구직급여 제한 확인 전에는 I유형을 추천 경로에 넣지 않음", () => {
    expect(ev.route.map((r) => [r.id, r.status, r.opensInMonths])).toEqual([
      ["kuksi-2", "available", null],
      ["emergency", "consult", null],
    ]);
    expect(find(ev, "kuksi-1")?.eligibilityAssessment?.status).toBe("CURRENTLY_INELIGIBLE");
  });

  it("막힌 길: 생계급여 479,444원 초과, 주거급여 69,166원 초과", () => {
    expect(blockedIds(ev)).toEqual(["livelihood", "housing", "kuksi-1"]);
    expect(find(ev, "livelihood")?.blockedReason).toContain("479,444원 초과");
    expect(find(ev, "housing")?.blockedReason).toContain("69,166원 초과");
  });

  it("대기 구간과 지도 정보", () => {
    expect(ev.nextOpeningMonths).toBeNull();
    expect(ev.hasTimeGate).toBe(true);
    expect(ev.mapStops).toHaveLength(2);
  });

  it("모든 결과에 필수 필드가 있음", () => {
    for (const r of [...ev.route, ...ev.blocked]) {
      expect(r.id).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.shortTitle).toBeTruthy();
      expect(r.gain).toBeTruthy();
      expect(r.how).toBeTruthy();
      expect(r.why.length).toBeGreaterThan(0);
      expect(r).toHaveProperty("opensInMonths");
      expect(r.intakeStatus).toBe("unknown");
    }
  });

  it("긴급복지 지원 내용과 위기사유 확인 안내", () => {
    const e = find(ev, "emergency")!;
    expect(e.gain).toBe("대상이면 생계지원 월 783,000원 예상");
    expect(e.why.join(" ")).toContain("위기사유");
  });
});

describe("시간 조건", () => {
  it("소진 후 6개월은 제한 하나만 해소하고 나머지 미입력은 추가 확인", () => {
    const ev = run({ monthsSinceEnded: 6 });
    expect(find(ev, "kuksi-1")?.status).toBe("consult");
    expect(find(ev, "kuksi-1")?.eligibilityAssessment?.status).toBe("NEEDS_MORE_INFO");
    expect(ev.hasTimeGate).toBe(false);
    expect(ev.nextOpeningMonths).toBeNull();
  });

  it("소진 후 5개월은 현재 미충족이며 자동으로 대기 개월을 승인처럼 표시하지 않음", () => {
    const k = find(run({ monthsSinceEnded: 5 }), "kuksi-1")!;
    expect(k.status).toBe("blocked");
    expect(k.opensInMonths).toBeNull();
    expect(k.eligibilityAssessment?.status).toBe("CURRENTLY_INELIGIBLE");
  });

  it("구직급여가 없어도 다른 필수 조건이 없으면 추가 확인", () => {
    expect(find(run({ unemploymentBenefit: "none" }), "kuksi-1")?.eligibilityAssessment?.status).toBe("NEEDS_MORE_INFO");
  });
});

describe("80만 원", () => {
  const ev = run({ income: 800_000 });

  it("생계급여 지금 가능, 예상 금액은 기준 - 소득", () => {
    const l = find(ev, "livelihood")!;
    expect(l.status).toBe("available");
    expect(l.gain).toContain("20,556원");
  });

  it("I유형 판단은 시연 금액과 별개이며 구직급여 제한이 우선", () => {
    const k = find(ev, "kuksi-1")!;
    expect(k.status).toBe("blocked");
    expect(k.eligibilityAssessment?.conditions.find((c) => c.conditionId === "kuksi1.household-income")?.userValue).toBeNull();
    expect(k.blockers[0].kind).toBe("benefit_ended_wait");
  });
});

describe("34세 이하, 200만 원, 구직급여 없음", () => {
  const ev = run({ ageGroup: "young", income: 2_000_000, unemploymentBenefit: "none" });

  it("청년특례도 미입력 조건이 있으면 추가 확인", () => {
    const youth = find(ev, "kuksi-1-youth")!;
    expect(youth.status).toBe("consult");
    expect(youth.eligibilityAssessment?.status).toBe("NEEDS_MORE_INFO");
    expect(youth.selective).toBe(true);
    expect(find(ev, "kuksi-2")?.status).toBe("available");
    expect(routeIds(ev)).toEqual(expect.arrayContaining(["kuksi-1-youth", "kuksi-2"]));
  });

  it("일반 I유형은 따로 표시하지 않음", () => {
    expect(find(ev, "kuksi-1")).toBeUndefined();
  });

  it("긴급복지 막힘", () => {
    expect(find(ev, "emergency")?.status).toBe("blocked");
    expect(blockedIds(ev)).toContain("emergency");
  });
});

describe("구직급여 수급 중", () => {
  const ev = run({ unemploymentBenefit: "active" });

  it("구직급여 유지가 지금 가능", () => {
    expect(find(ev, "unemployment-benefit")?.status).toBe("available");
    expect(routeIds(ev)[0]).toBe("unemployment-benefit");
  });

  it("국취 I·II유형 막힘", () => {
    expect(find(ev, "kuksi-1")?.status).toBe("blocked");
    expect(find(ev, "kuksi-2")?.status).toBe("blocked");
    expect(find(ev, "kuksi-2")?.blockedReason).toBe("구직급여 수급 종료 후 참여 가능");
  });

  it("긴급복지는 경로와 막힌 길 어디에도 없음", () => {
    expect(find(ev, "emergency")).toBeUndefined();
  });

  it("수급 중이 아니면 구직급여 유지는 표시하지 않음", () => {
    expect(find(run(), "unemployment-benefit")).toBeUndefined();
  });
});

describe("경계값: 기준과 같으면 충족, 1원 초과면 미충족", () => {
  it("생계급여", () => {
    const limit = RULES.livelihoodIncome.value;
    expect(find(run({ income: limit }), "livelihood")?.status).toBe("available");
    expect(find(run({ income: limit + 1 }), "livelihood")?.status).toBe("blocked");
    expect(find(run({ income: limit + 1 }), "livelihood")?.blockedReason).toContain("1원 초과");
  });

  it("주거급여", () => {
    const limit = RULES.housingIncome.value;
    expect(find(run({ income: limit }), "housing")?.status).toBe("available");
    expect(find(run({ income: limit + 1 }), "housing")?.status).toBe("blocked");
  });

  it("국취 I유형은 다른 제도 비교용 금액만으로 판정하지 않음", () => {
    const base = find(run({ income: 0, unemploymentBenefit: "none" }), "kuksi-1")!;
    const higher = find(run({ income: 3_000_000, unemploymentBenefit: "none" }), "kuksi-1")!;
    expect(base.eligibilityAssessment?.status).toBe("NEEDS_MORE_INFO");
    expect(higher.eligibilityAssessment?.status).toBe("NEEDS_MORE_INFO");
  });

  it("긴급복지", () => {
    const limit = RULES.emergencyIncome.value;
    expect(find(run({ income: limit }), "emergency")?.status).toBe("consult");
    expect(find(run({ income: limit + 1 }), "emergency")?.status).toBe("blocked");
  });

  it("35세 이상 국취 II유형", () => {
    const limit = RULES.kuksi2AdultIncome.value;
    expect(find(run({ income: limit }), "kuksi-2")?.status).toBe("available");
    expect(find(run({ income: limit + 1 }), "kuksi-2")?.status).toBe("blocked");
  });

  it("청년특례", () => {
    const limit = RULES.kuksi1YouthIncome.value;
    const base = { ageGroup: "young" as const, unemploymentBenefit: "none" as const };
    expect(find(run({ ...base, income: limit }), "kuksi-1-youth")?.status).toBe("consult");
    expect(find(run({ ...base, income: limit + 1 }), "kuksi-1-youth")?.status).toBe("consult");
  });
});

describe("주거 형태", () => {
  it("자가·기타면 임차 가구 대상으로 막힘", () => {
    const h = find(run({ income: 1_000_000, housing: "other" }), "housing")!;
    expect(h.status).toBe("blocked");
    expect(h.blockedReason).toBe("임차 가구 대상");
  });
});

describe("탈락 입력", () => {
  it("해당 제도가 경로에서 사라지고 막힌 길에 표시", () => {
    const ev = run({ rejectedIds: ["kuksi-2"] });
    expect(routeIds(ev)).not.toContain("kuksi-2");
    const r = ev.blocked.find((b) => b.id === "kuksi-2")!;
    expect(r.status).toBe("blocked");
    expect(r.blockedReason).toBe(REJECTED_REASON);
    expect(routeIds(ev)).toEqual(["emergency"]);
  });

  it("막힌 제도도 탈락 입력 시 사용자 표시 기록으로 보존됨", () => {
    const ev = run({ rejectedIds: ["kuksi-1"] });
    expect(ev.nextOpeningMonths).toBeNull();
    expect(find(ev, "kuksi-1")?.opensInMonths).toBeNull();
  });
});

describe("경로 정렬과 지도 제한", () => {
  it("지금 가능 → 상담 필요 → N개월 후, 지도는 최대 4개", () => {
    const ev = run({ income: 1_000_000, ageGroup: "young", unemploymentBenefit: "ended", monthsSinceEnded: 1 });
    const order = { available: 0, consult: 1, waiting: 2, blocked: 3 };
    const ranks = ev.route.map((r) => order[r.status]);
    expect([...ranks].sort()).toEqual(ranks);
    expect(ev.mapStops.length).toBeLessThanOrEqual(4);
  });
});

describe("1개월 뒤 비교", () => {
  it("소진 후 3개월 → 4개월은 같은 공식 제한 상태", () => {
    const changes = diffEvaluations(run(), run({ monthsSinceEnded: 4 }));
    expect(changes).toEqual([]);
  });
});

describe("구조화된 근거와 막힌 이유", () => {
  it("why는 evidence 문장과 같음", () => {
    for (const r of [...run().route, ...run().blocked]) {
      expect(r.why).toEqual(r.evidence.map((e) => e.text));
      expect(r.agency).toBeTruthy();
      expect(r.unchecked.length).toBeGreaterThan(0);
    }
  });

  it("기본 시나리오 막힌 길은 소득 기준으로 막힘", () => {
    const ev = run();
    expect(find(ev, "livelihood")?.blockers.map((b) => b.kind)).toEqual(["income"]);
    expect(find(ev, "housing")?.blockers[0].requirement).toContain("1,230,834원 이하");
  });

  it("자가·기타이면서 소득 초과면 막힌 이유 두 개", () => {
    const h = find(run({ housing: "other" }), "housing")!;
    expect(h.blockers.map((b) => b.kind)).toEqual(["housing", "income"]);
    expect(h.blockedReason).toBe("임차 가구 대상 · 소득 기준 초과 (69,166원 초과)");
  });

  it("I유형 제한 근거에는 공식 출처와 조건 ID가 있음", () => {
    const item = find(run(), "kuksi-1")!;
    expect(item.blockers[0].kind).toBe("benefit_ended_wait");
    expect(item.evidence.every((e) => e.conditionId && e.sourceUrl && e.appliedRule)).toBe(true);
  });

  it("수급 중이면 II유형 막힌 이유는 benefit_active", () => {
    expect(find(run({ unemploymentBenefit: "active" }), "kuksi-2")?.blockers[0].kind).toBe("benefit_active");
  });

  it("탈락 입력이면 막힌 이유는 rejected", () => {
    const r = find(run({ rejectedIds: ["emergency"] }), "emergency")!;
    expect(r.blockers.map((b) => b.kind)).toEqual(["rejected"]);
    expect(r.why[0]).toBe("탈락 통보를 받았다고 입력함");
  });

  it("열린 경로에는 막힌 이유가 없음", () => {
    for (const r of run().route) expect(r.blockers).toEqual([]);
  });
});

describe("조건 변경 비교", () => {
  it("130만 원 → 80만 원: 생계급여·주거급여가 열리고 국취 I유형이 빠짐", () => {
    const cmp = compareRoutes(run(), run({ income: 800_000 }));
    expect(cmp.beforeCount).toBe(2);
    expect(cmp.afterCount).toBe(4);
    expect(cmp.opened.map((c) => c.id)).toEqual(["livelihood", "housing"]);
    expect(cmp.closed).toEqual([]);
    expect(cmp.changed).toEqual([]);
  });

  it("소진 후 3개월 → 6개월: 국취 I유형 상태만 바뀜", () => {
    const cmp = compareRoutes(run(), run({ monthsSinceEnded: 6 }));
    expect(cmp.opened.map((c) => [c.id, c.before, c.after])).toEqual([["kuksi-1", "현재 막힘", "상담 필요"]]);
    expect(cmp.closed).toEqual([]);
    expect(cmp.changed).toEqual([]);
  });

  it("같은 조건이면 변화 없음", () => {
    const cmp = compareRoutes(run(), run());
    expect([...cmp.opened, ...cmp.closed, ...cmp.changed]).toEqual([]);
  });
});
