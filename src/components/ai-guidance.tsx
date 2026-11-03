"use client";

import { useState } from "react";
import { SparkleIcon } from "@/components/icons";
import type { BenefitResult, Input } from "@/lib/engine";
import { projectMinimalAiInput, type AiGuidance } from "@/lib/ai/contracts";
import type { ProgressStatus } from "@/lib/state/app-state";

type Props = {
  result: BenefitResult;
  input: Input;
  progressStatus: ProgressStatus;
  routeReviewed: boolean;
};

const ERROR_COPY: Record<string, string> = {
  AI_NOT_CONFIGURED: "AI 서버 설정이 아직 없습니다. OPENAI_API_KEY를 서버 환경에 설정하면 사용할 수 있어요.",
  RATE_LIMITED: "AI 설명 요청이 잠시 제한됐어요. 잠시 뒤 다시 시도해 주세요.",
  AI_TIMEOUT: "AI 응답 시간이 길어 요청을 마치지 못했어요. 기존 판정 근거를 확인하거나 다시 시도해 주세요.",
  AI_UNAVAILABLE: "AI 설명을 불러오지 못했어요. 기존 판정 근거와 공식 안내는 그대로 확인할 수 있어요.",
  ROUTE_NOT_AVAILABLE: "조건이 바뀌어 이 경로를 다시 찾을 수 없어요. 경로를 새로 계산한 뒤 다시 시도해 주세요.",
};

export function AiGuidancePanel({ result, input, progressStatus, routeReviewed }: Props) {
  const [showConsent, setShowConsent] = useState(false);
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<AiGuidance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isVerifiedAssessment = result.eligibilityAssessment !== undefined;
  const personalDataSummary = isVerifiedAssessment
    ? "이 판정에 사용된 만 나이, 가구 소득·재산, 취업경험, 구직급여 상태 및 확인 항목"
    : "이 경로 판정에 사용된 시연용 입력값과 조건별 근거";

  const requestGuidance = async () => {
    if (!consented || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-guidance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          benefitId: result.id,
          input: projectMinimalAiInput(result.id, input),
          progressStatus,
          routeReviewed,
        }),
      });
      const body = await response.json() as AiGuidance | { error?: string };
      if (!response.ok) {
        const code = "error" in body && body.error ? body.error : "AI_UNAVAILABLE";
        throw new Error(ERROR_COPY[code] ?? ERROR_COPY.AI_UNAVAILABLE);
      }
      setGuidance(body as AiGuidance);
    } catch (caught) {
      setGuidance(null);
      setError(caught instanceof Error ? caught.message : ERROR_COPY.AI_UNAVAILABLE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="ai-guidance-heading" className="rounded-[18px] border border-brand/20 bg-brand-tint/30 p-4">
      <div className="flex items-start gap-2">
        <SparkleIcon size={20} className="mt-0.5 shrink-0 text-brand-text" />
        <div className="min-w-0 flex-1">
          <h2 id="ai-guidance-heading" className="text-[16px] font-extrabold text-ink">AI가 내 상황에 맞게 설명해 드려요</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">이 경로가 왜 나왔는지, 먼저 확인할 행동과 질문을 판정 근거에 맞춰 정리합니다.</p>
        </div>
      </div>

      {!showConsent && !guidance && (
        <button type="button" onClick={() => setShowConsent(true)} className="mt-3 min-h-11 w-full rounded-xl bg-brand px-4 text-[14px] font-extrabold text-white">
          내 상황에 맞게 설명받기
        </button>
      )}

      {showConsent && !guidance && (
        <div className="mt-3 rounded-[14px] border border-line bg-surface p-3">
          <p className="text-[13px] font-bold text-ink">외부 AI 처리 안내</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            동의하면 {personalDataSummary}가 복지대로 서버를 거쳐 OpenAI API로 전송되어 설명을 생성합니다. 이름·전화번호·주소와 localStorage 전체는 보내지 않으며, 복지대로는 요청 내용을 저장하지 않습니다. OpenAI 제공자의 데이터 처리 조건은 해당 제공자 정책을 따릅니다. AI 설명은 공식 판정이 아닙니다.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>선택한 경로에 필요한 최소 조건을 OpenAI API로 보내는 데 동의합니다.</span>
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={!consented || loading} onClick={requestGuidance} className="min-h-11 flex-1 rounded-xl bg-brand px-3 text-[14px] font-extrabold text-white disabled:opacity-50">
              {loading ? "설명 만드는 중…" : "동의하고 AI 설명 요청"}
            </button>
            <button type="button" onClick={() => { setShowConsent(false); setConsented(false); }} className="min-h-11 rounded-xl border border-line px-3 text-[14px] font-bold text-ink">
              취소
            </button>
          </div>
        </div>
      )}

      {loading && <p role="status" className="mt-3 text-[13px] font-semibold text-brand-text">판정 근거를 바탕으로 설명을 만들고 있어요.</p>}

      {error && (
        <div role="alert" className="mt-3 rounded-[14px] border border-line bg-surface p-3">
          <p className="text-[13px] leading-relaxed text-ink">{error}</p>
          <p className="mt-1 text-[12px] text-muted">기존 규칙 판정과 신청 안내는 계속 사용할 수 있어요.</p>
          <button type="button" disabled={!consented || loading} onClick={requestGuidance} className="mt-2 min-h-11 rounded-xl border border-line px-3 text-[13px] font-bold text-brand-text disabled:opacity-50">다시 시도</button>
        </div>
      )}

      {guidance && (
        <div className="mt-3 space-y-3 rounded-[14px] border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-extrabold text-brand-text">AI 맞춤 설명 · 생성형 안내</p>
            <span className="text-[11px] text-muted">{new Date(guidance.generatedAt).toLocaleString("ko-KR")}</span>
          </div>
          <p className="text-[15px] font-extrabold leading-relaxed text-ink">{guidance.summary}</p>
          <p className="text-[14px] leading-relaxed text-ink">{guidance.reasonExplanation}</p>

          {guidance.confirmedFacts.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-ink">판정에서 확인된 항목</h3>
              <ul className="mt-1 space-y-1 text-[13px] text-muted">
                {guidance.confirmedFacts.map((fact) => <li key={fact.conditionId}>• {fact.conditionName}: {fact.result === "met" ? "충족" : "미충족"}</li>)}
              </ul>
            </div>
          )}

          {guidance.missingInformation.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-ink">추가 확인이 필요한 정보</h3>
              <ul className="mt-1 space-y-1 text-[13px] text-muted">
                {guidance.missingInformation.map((item) => <li key={item.conditionId}>• {item.conditionName}: {item.reason}</li>)}
              </ul>
            </div>
          )}

          {guidance.nextActions.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-ink">먼저 할 일</h3>
              <ol className="mt-1 space-y-2">
                {guidance.nextActions.map((action, index) => (
                  <li key={action.actionId} className="flex gap-2 text-[13px] text-ink">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-extrabold text-brand-text">{index + 1}</span>
                    <span><strong>{action.title}</strong><span className="block text-muted">{action.description}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {guidance.clarificationQuestions.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-ink">추가로 확인할 질문</h3>
              <ul className="mt-1 space-y-1 text-[13px] text-muted">
                {guidance.clarificationQuestions.map((item) => <li key={item.conditionId}>• {item.question}</li>)}
              </ul>
            </div>
          )}

          {guidance.sourceReferences.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-ink">사용 가능한 공식 출처</h3>
              <ul className="mt-1 space-y-1 text-[13px]">
                {guidance.sourceReferences.map((source) => (
                  <li key={source.sourceId}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-text underline">{source.name}</a>
                    <span className="block text-[11px] text-muted">
                      {source.role === "overview_only" ? "제도 개요 · 자격 규칙 아님" : `자격 규칙 · 확인 ${source.verifiedAt ?? "확인일 미기록"}`}
                      {source.effectiveFrom ? ` · 기준 ${source.effectiveFrom}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="border-t border-line pt-2 text-[12px] leading-relaxed text-muted">
            {guidance.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}
          </ul>
          <button type="button" onClick={() => { setGuidance(null); setShowConsent(false); setConsented(false); }} className="min-h-11 text-[13px] font-bold text-brand-text underline">AI 안내 닫기</button>
        </div>
      )}
    </section>
  );
}
