"use client";

import { useId, useState } from "react";
import { DEMO_DISCLAIMER, RULE_BASIS, RULES } from "@/lib/engine";
import type { BenefitResult, Blocker, Evidence, Input } from "@/lib/engine";
import { describeInput } from "@/lib/describe";
import { termsIn } from "@/lib/glossary";
import { AlertIcon, BlockIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, InfoIcon } from "./icons";
import { StatusPill } from "./status";
import { AiGuidancePanel } from "./ai-guidance";
import { useAppState } from "@/lib/state/app-state";

const EVIDENCE_ICON: Record<Evidence["kind"], { Icon: typeof InfoIcon; color: string; label: string }> = {
  met: { Icon: CheckCircleIcon, color: "var(--ok-text)", label: "충족" },
  unmet: { Icon: BlockIcon, color: "var(--blocked-text)", label: "미충족" },
  check: { Icon: AlertIcon, color: "var(--wait-text)", label: "확인 필요" },
  info: { Icon: InfoIcon, color: "var(--muted)", label: "입력값" },
};

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="space-y-2 text-[15px] text-ink">
      {evidence.map((e) => {
        const { Icon, color, label } = EVIDENCE_ICON[e.kind];
        return (
          <li key={e.text} className="flex gap-2">
            <Icon size={18} className="mt-0.5 shrink-0" style={{ color }} />
            <span>
              <span className="sr-only">{label}: </span>
              {e.text}
              {e.conditionId && <span className="sr-only"> (조건 ID: {e.conditionId})</span>}
              {e.userValue !== undefined && e.userValue !== null && (
                <span className="mt-0.5 block text-[13px] text-muted">입력값 {String(e.userValue)} · 적용 기준 {e.appliedRule}</span>
              )}
              {e.sourceUrl && (
                <span className="mt-0.5 block text-[13px] text-muted">
                  출처 <a className="font-semibold text-brand-text underline" href={e.sourceUrl} target="_blank" rel="noreferrer">{e.sourceName}</a>
                  {e.effectiveFrom && ` · 적용 ${e.effectiveFrom}`}
                  {e.verifiedAt && ` · 확인 ${e.verifiedAt}`}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** 본문 문장에 나온 전문 용어의 짧은 풀이 */
export function GlossaryTips({ texts }: { texts: string[] }) {
  const terms = termsIn(...texts);
  if (terms.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1 rounded-xl bg-sub px-3 py-2 text-[13px] leading-relaxed text-muted">
      {terms.map((t) => (
        <div key={t.term}>
          <dt className="inline font-bold text-ink">{t.term}</dt>
          <dd className="inline"> · {t.plain}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "왜 이 결과가 나왔나요?" 펼침 영역: 기준, 사용한 조건, 출처, 기준일, 미확인 조건, 판정 기관 */
export function JudgmentBasis({
  result,
  input,
  defaultOpen = false,
  title = "왜 이 결과가 나왔나요?",
}: {
  result: BenefitResult;
  input: Input;
  defaultOpen?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="rounded-[16px] border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-[15px] font-bold text-ink"
      >
        {title}
        <ChevronDownIcon size={20} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="animate-fade-in space-y-4 border-t border-line px-4 pb-4 pt-3 text-[14px] leading-relaxed">
          <BasisBlock label="판정 근거">
            {result.eligibilityAssessment && (
              <p className="mb-2 rounded-xl bg-sub p-3 font-semibold text-ink" role="status">
                {result.eligibilityAssessment.summary}
              </p>
            )}
            <EvidenceList evidence={result.evidence} />
          </BasisBlock>
          {result.ruleIds.length > 0 && (
            <BasisBlock label="적용된 기준과 데이터 출처">
              <ul className="space-y-1.5">
                {result.ruleIds.map((id) => (
                  <li key={id}>
                    <span className="font-semibold text-ink">
                      {RULES[id].label}: {RULES[id].value.toLocaleString("ko-KR")}
                      {RULES[id].unit === "개월" ? "개월" : "원"}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {RULES[id].sourceName && RULES[id].sourceUrl ? (
                        <><a className="font-semibold text-brand-text underline" href={RULES[id].sourceUrl} target="_blank" rel="noreferrer">{RULES[id].sourceName}</a> · 확인 {RULES[id].verifiedAt ?? "확인일 미기록"}</>
                      ) : (
                        <>{RULES[id].sourceNote} · <span className="font-bold text-wait-text">공식 확인 필요</span></>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </BasisBlock>
          )}
          <BasisBlock label="사용한 내 조건">
            <p className="text-ink">{describeInput(input).join(" · ")}</p>
          </BasisBlock>
          <BasisBlock label="기준일">
            <p className="text-ink">{RULE_BASIS}</p>
          </BasisBlock>
          <BasisBlock label="확인하지 못한 조건">
            <p className="text-ink">{result.unchecked.join(", ")}</p>
          </BasisBlock>
          <BasisBlock label="최종 판정 기관">
            <p className="text-ink">{result.agency}에서 최종 결정해요. 이 결과는 예상 정보예요.</p>
          </BasisBlock>
        </div>
      )}
    </div>
  );
}

function BasisBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-[13px] font-bold text-muted">{label}</h4>
      {children}
    </section>
  );
}

const BLOCKER_WHY: Record<Blocker["kind"], (r: BenefitResult) => string> = {
  income: () => "현재 입력된 조건에서 소득인정액 기준을 충족하지 못한 것으로 예상돼요.",
  housing: () => "임차 가구가 대상인 제도인데, 거주 형태가 자가·기타로 입력되어 있어요.",
  livelihood_excluded: () => "생계급여 대상으로 예상되면 참여할 수 없는 제도예요.",
  benefit_active: () => "구직급여를 받는 동안에는 참여할 수 없는 제도예요.",
  benefit_ended_wait: () => "구직급여 종료 후 6개월이 지나지 않아 현재 참여 제한에 해당해요.",
  kuksi_requirement: () => "공식 안내에서 확인한 참여 조건을 현재 충족하지 못한 것으로 입력했어요.",
  rejected: () => "탈락 통보를 받았다고 입력해서 경로에서 뺐어요.",
};

const CHANGEABLE: Record<Blocker["kind"], string> = {
  income: "바꿀 수 있는 조건이에요. 내 조건에서 소득을 고치면 다시 계산해요.",
  housing: "바꿀 수 있는 조건이에요. 내 조건에서 거주 형태를 고치면 다시 계산해요.",
  livelihood_excluded: "소득인정액에 따라 달라지는 조건이에요.",
  benefit_active: "구직급여 수급이 끝나면 달라지는 조건이에요.",
  benefit_ended_wait: "6개월이 지난 뒤 다른 조건까지 다시 확인해 주세요. 기간 경과만으로 신청 자격이 생기지 않아요.",
  kuksi_requirement: "고용24나 고용센터에 조건과 예외 여부를 확인해 주세요.",
  rejected: "이 시연에서는 판단할 수 없어요. 소관 기관에 확인이 필요해요.",
};

/** 막힌 경로 상세: 왜 막혔는지, 필요한 조건, 바꿀 수 있는지, 다시 확인할 때, 안내처, 대체 경로 */
export function BlockedDetail({
  result,
  input,
  alternatives = [],
  showAiGuidance = false,
}: {
  result: BenefitResult;
  input: Input;
  alternatives?: BenefitResult[];
  showAiGuidance?: boolean;
}) {
  const { progressOf, completedIds } = useAppState();
  const blockers = result.blockers;
  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-[17px] font-extrabold text-ink">
          <BlockIcon size={20} className="shrink-0 text-blocked-text" />
          {result.shortTitle} 경로가 아직 열리지 않았어요
        </p>
        <p className="mt-1 text-[15px] text-ink">
          {blockers.length > 0 ? BLOCKER_WHY[blockers[0].kind](result) : "추가 확인이 필요해요."}
        </p>
        {blockers.length > 1 && (
          <p className="mt-1 text-[15px] text-ink">{BLOCKER_WHY[blockers[1].kind](result)}</p>
        )}
      </div>

      <dl className="space-y-3 rounded-[16px] bg-sub p-4 text-[14px]">
        <div>
          <dt className="font-bold text-muted">필요한 조건</dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {blockers.length > 0 ? blockers.map((b) => b.requirement).join(", ") : "추가 확인이 필요해요"}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted">현재 상태</dt>
          <dd className="mt-0.5 font-semibold text-blocked-text">{result.blockedReason}</dd>
        </div>
        {blockers.length > 0 && (
          <>
            <div>
              <dt className="font-bold text-muted">바꿀 수 있는 조건인가요?</dt>
              <dd className="mt-0.5 text-ink">{CHANGEABLE[blockers[0].kind]}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted">다시 확인할 때</dt>
              <dd className="mt-0.5 text-ink">{blockers.map((b) => b.recheck).join(" ")}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="font-bold text-muted">공식 안내처</dt>
          <dd className="mt-0.5 text-ink">{result.agency}</dd>
        </div>
      </dl>

      {alternatives.length > 0 && (
        <div className="rounded-[16px] border border-brand/25 bg-brand-tint/60 p-4">
          <p className="text-[15px] font-bold text-ink">하지만 지금 갈 수 있는 다른 길도 있어요</p>
          <ul className="mt-2 space-y-1.5">
            {alternatives.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-[14px] font-semibold text-ink">
                {a.shortTitle}
                <StatusPill result={a} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <JudgmentBasis result={result} input={input} title="판정 기준 확인하기" />
      {showAiGuidance && (
        <AiGuidancePanel
          result={result}
          input={input}
          progressStatus={progressOf(result.id)}
          routeReviewed={completedIds.includes(result.id)}
        />
      )}
    </div>
  );
}

/** 목록용 경로 카드. 전체가 하나의 버튼입니다. */
export function RouteCard({
  result,
  index,
  selected = false,
  onClick,
}: {
  result: BenefitResult;
  index?: number;
  selected?: boolean;
  onClick: () => void;
}) {
  const blocked = result.status === "blocked";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-14 w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-colors ${
        selected ? "border-brand bg-brand-tint/50" : blocked ? "border-blocked/25 bg-blocked-tint/40" : "border-line bg-surface"
      }`}
    >
      {index !== undefined && (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold text-white"
        >
          {index + 1}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <StatusPill result={result} className="mb-1" />
        <span className="block text-[15px] font-bold text-ink">{result.title}</span>
        <span className={`mt-0.5 block text-[13px] ${blocked ? "font-semibold text-blocked-text" : "text-muted"}`}>
          {blocked ? result.blockedReason : result.gain}
        </span>
      </span>
      <ChevronRightIcon size={18} className="shrink-0 text-muted" />
    </button>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`flex gap-2 rounded-[16px] bg-sub p-3 text-[13px] leading-relaxed text-muted ${className}`}>
      <InfoIcon size={18} className="mt-0.5 shrink-0" />
      <span>{DEMO_DISCLAIMER}</span>
    </p>
  );
}
