import type { Input } from "@/lib/engine";

export const AGE_LABEL = { young: "34세 이하", adult: "35세 이상" } as const;
export const HOUSING_LABEL = { tenant: "임차", other: "자가·기타" } as const;
export const BENEFIT_LABEL = { none: "받은 적 없음", active: "수급 중", ended: "소진함" } as const;

/** 만 원 단위로 떨어지면 "130만 원", 아니면 "820,556원" */
export function formatIncome(value: number): string {
  return value % 10_000 === 0
    ? `${(value / 10_000).toLocaleString("ko-KR")}만 원`
    : `${value.toLocaleString("ko-KR")}원`;
}

export function describeInput(input: Input, monthsOffset = 0): string[] {
  const benefit =
    input.unemploymentBenefit === "ended"
      ? `구직급여 소진 ${input.monthsSinceEnded + monthsOffset}개월`
      : input.unemploymentBenefit === "active"
        ? "구직급여 수급 중"
        : "구직급여 없음";
  return [`시연용 금액 ${formatIncome(input.income)} (소득인정액 가정)`, AGE_LABEL[input.ageGroup], HOUSING_LABEL[input.housing], benefit];
}

/** 두 입력값에서 경로 계산에 쓰이는 조건이 같은지 */
export function sameConditions(a: Input, b: Input): boolean {
  const sameBase = (
    a.income === b.income &&
    a.ageGroup === b.ageGroup &&
    a.housing === b.housing &&
    a.unemploymentBenefit === b.unemploymentBenefit &&
    (a.unemploymentBenefit !== "ended" || a.monthsSinceEnded === b.monthsSinceEnded)
  );
  if (!sameBase) return false;
  const aProfile = a.kuksi1Profile;
  const bProfile = b.kuksi1Profile;
  if (!aProfile || !bProfile) return aProfile === bProfile;
  return Object.keys(aProfile).every((key) =>
    aProfile[key as keyof typeof aProfile] === bProfile[key as keyof typeof bProfile],
  );
}
