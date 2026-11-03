// 화면에 나오는 전문 용어의 짧은 풀이. 제도 설명 문장에 용어가 있으면 함께 보여 줍니다.

export const GLOSSARY: { term: string; plain: string }[] = [
  { term: "소득인정액", plain: "월 소득에 재산을 소득으로 환산한 금액을 더한 값이에요." },
  { term: "구직촉진수당", plain: "취업을 준비하는 동안 구직활동을 하면 받는 수당이에요." },
  { term: "취업지원서비스", plain: "상담, 직업훈련, 일자리 소개처럼 취업을 돕는 서비스예요." },
  { term: "기준임대료", plain: "지역별로 정해진 임차료 지원의 기준 금액이에요." },
  { term: "실업인정", plain: "구직급여를 계속 받으려고 정해진 날 구직활동을 확인받는 절차예요." },
  { term: "선발형", plain: "신청한 사람 가운데 예산 범위에서 참여자를 뽑는 방식이에요." },
  { term: "위기사유", plain: "실직처럼 갑자기 생계가 어려워진 사정이에요." },
];

export function termsIn(...texts: string[]) {
  const joined = texts.join(" ");
  return GLOSSARY.filter((g) => joined.includes(g.term));
}
