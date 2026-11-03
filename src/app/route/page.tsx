"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/brand";
import { AiGuidancePanel } from "@/components/ai-guidance";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  FileIcon,
  FlagIcon,
  RefreshIcon,
  SparkleIcon,
  TurnRightIcon,
} from "@/components/icons";
import { ProgressSheet } from "@/components/progress-sheet";
import { BlockedDetail, Disclaimer, EvidenceList, GlossaryTips, JudgmentBasis } from "@/components/route-list";
import { RouteMap } from "@/components/route-map";
import { SituationSheet } from "@/components/situation-sheet";
import { STATUS_META, StatusPill, statusSentence } from "@/components/status";
import { BottomBar, Button, LinkButton } from "@/components/ui";
import { compareRoutes, evaluate } from "@/lib/engine";
import type { BenefitResult, Input } from "@/lib/engine";
import { PROGRESS_LABEL, useAppState } from "@/lib/state/app-state";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type Notice = { title: string; lines: string[]; discovered?: boolean };

export default function RoutePage() {
  const {
    input,
    evaluation,
    steps,
    completedIds,
    currentStep,
    progressOf,
    setProgress,
    advance,
    reject,
    updateInput,
    resetProgress,
  } = useAppState();
  const reducedMotion = useReducedMotion();

  const [sheet, setSheet] = useState<"situation" | "progress" | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const timers = useRef<number[]>([]);
  const actionRef = useRef<HTMLElement | null>(null);
  const prepareRef = useRef<HTMLDetailsElement | null>(null);
  const howRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const toTop = () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });

  const remainingAfter = (next: Input) =>
    evaluate(next).route.filter((r) => !completedIds.includes(r.id)).length;

  const reroute = (apply: () => void, result: Notice) => {
    setSheet(null);
    setNotice(null);
    setRerouting(true);
    toTop();
    later(
      () => {
        apply();
        setRerouting(false);
        setNotice(result);
      },
      reducedMotion ? 500 : 1600,
    );
  };

  const handleReject = (id: string) => {
    const target = steps.find((s) => s.id === id);
    const next = { ...input, rejectedIds: [...input.rejectedIds, id] };
    const remaining = remainingAfter(next);
    reroute(() => reject(id), {
      title: `막힌 길로 옮김: ${target?.shortTitle ?? id}`,
      lines: [
        "탈락 통보 입력, 재검토 경로 확인 필요",
        remaining > 0 ? `확인할 추천 경로 ${remaining}개가 남았어요.` : "확인할 추천 경로가 더 없어요.",
      ],
    });
  };

  const handleConditions = (patch: Pick<Input, "income" | "housing">) => {
    const next = { ...input, ...patch };
    const cmp = compareRoutes(evaluation, evaluate(next));
    const lines = [
      ...cmp.opened.map((c) => `새로 열림: ${c.shortTitle} (${c.after})`),
      ...cmp.closed.map((c) => `해당 안 됨: ${c.shortTitle} (${c.after ?? "표시 안 됨"})`),
      ...cmp.changed.map((c) => `상태 변경: ${c.shortTitle} ${c.before} → ${c.after}`),
    ];
    const remaining = remainingAfter(next);
    reroute(() => updateInput(patch), {
      title: cmp.opened.length > 0 ? "새로운 복지 경로를 발견했어요!" : "바뀐 조건으로 경로를 다시 찾았어요",
      discovered: cmp.opened.length > 0,
      lines: [
        ...(lines.length > 0 ? lines : ["경로에 달라진 점은 없어요."]),
        remaining > 0 ? `확인할 추천 경로 ${remaining}개가 남았어요.` : "확인할 추천 경로가 더 없어요.",
      ],
    });
  };

  const handleAdvance = () => {
    const isLast = steps.filter((s) => !completedIds.includes(s.id)).length === 1;
    setSheet(null);
    setNotice(null);
    advance();
    toTop();
    if (isLast) {
      setArriving(true);
      later(() => setArriving(false), reducedMotion ? 0 : 1100);
    }
  };

  const showHow = () => {
    howRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    howRef.current?.focus({ preventScroll: true });
  };

  const showSection = (target: HTMLElement | null) => {
    const details = target?.closest("details");
    if (details) details.open = true;
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  if (steps.length === 0) {
    return <EmptyRoute notice={notice} onDismiss={() => setNotice(null)} />;
  }

  if (!currentStep && !arriving && !rerouting) {
    return (
      <Finished
        completed={steps}
        notice={notice}
        onDismiss={() => setNotice(null)}
        onRestart={resetProgress}
      />
    );
  }

  const shown = currentStep ?? steps[steps.length - 1];
  const doneCount = steps.filter((s) => completedIds.includes(s.id)).length;
  const progress = progressOf(shown.id);
  const upcoming = steps.filter((s) => !completedIds.includes(s.id) && s.id !== shown.id);
  const guideStops = shown.status === "consult"
    ? ["기관 상담", "확인 자료", "신청 안내"]
    : shown.status === "waiting"
      ? ["재확인 시점", shown.prepare.length ? "준비할 내용" : "기관 문의", "공식 안내"]
      : ["자격 확인", shown.prepare.length ? "준비할 내용" : "기관 문의", "신청 안내"];

  return (
    <main className="pb-[210px]">
      <header className="sticky top-0 z-20 bg-brand px-4 pb-4 pt-4 text-white">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white/15">
            {currentStep ? <TurnRightIcon size={30} strokeWidth={2.6} /> : <FlagIcon size={28} strokeWidth={2.6} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-white">
                {currentStep ? "추천 경로 둘러보기" : "안내를 마쳤어요"}
              </p>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-bold">기관 확인 전 · 시연 안내</span>
            </div>
            <h1 className="mt-0.5 text-[21px] font-extrabold leading-tight" aria-live="polite">
              {currentStep ? shown.title : "모든 추천 경로를 확인했어요"}
            </h1>
            {currentStep && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill result={shown} />
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-bold">
                  내 기록: {PROGRESS_LABEL[progress]}
                </span>
                {shown.selective && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-bold">선발형</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section aria-label="복지 경로 탐색 상태" className="border-b border-line px-4 py-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[14px] font-extrabold text-ink">추천 경로 둘러보기</p>
          <p className="text-[14px] font-bold text-brand-text">
            {doneCount} / {steps.length}개 경로 확인
          </p>
        </div>
        <p className="mt-1 text-[13px] text-muted">각 제도는 서로 독립된 선택지예요. 아래 기록은 내가 직접 표시한 안내 확인 상태예요.</p>
      </section>

      <section aria-label="선택한 복지 경로" className="relative h-[190px] overflow-hidden bg-[#f3f6f4]">
        <RouteMap
          stops={[shown]}
          completedIds={completedIds}
          mode="nav"
          markerIndex={0}
          viewHeight={190}
        />
        {rerouting && <RerouteOverlay />}
      </section>

      <nav aria-label="이 경로의 안내 단계" className="border-b border-line bg-surface px-4 py-3">
        <ol className="grid grid-cols-3 gap-2">
          {guideStops.map((label, index) => (
            <li key={label} className="relative min-w-0">
              {index > 0 && <span aria-hidden="true" className="absolute -left-2 top-[13px] h-px w-2 bg-line" />}
              <button
                type="button"
                aria-current={index === 0 ? "step" : undefined}
                onClick={() => showSection(index === 0 ? actionRef.current : index === 1 ? prepareRef.current : howRef.current)}
                className={`flex min-h-11 w-full items-center gap-1.5 rounded-xl px-1.5 text-left text-[13px] font-bold leading-tight ${index === 0 ? "bg-brand-tint text-brand-text" : "text-muted hover:bg-sub"}`}
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] ${index === 0 ? "bg-brand text-white" : "bg-sub text-muted"}`}>{index + 1}</span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-1 px-1 text-[12px] text-muted">안내 순서예요. 단계 방문만으로 완료 처리되지는 않아요.</p>
      </nav>

      {notice && <NoticeCard notice={notice} onDismiss={() => setNotice(null)} />}

      <section ref={actionRef} aria-labelledby="current-action" className="scroll-mt-4 mx-4 mt-4 rounded-[18px] border border-brand/25 bg-brand-tint/60 p-4">
        <p className="text-[13px] font-bold text-brand-text">지금 할 일 · {PROGRESS_LABEL[progress]}</p>
        <h2 id="current-action" className="mt-1 text-[19px] font-extrabold leading-snug text-ink">
          {firstAction(shown)}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{firstActionDescription(shown)}</p>
        <p className="mt-2 text-[13px] font-semibold text-muted">확인할 곳 · {shown.agency}</p>
        <p className="mt-1 text-[13px] text-muted">접수 일정 · {shown.intakeStatus === "unknown" ? "기관 확인 필요" : "확인 필요"}</p>
      </section>

      <div className="px-4 pt-3">
        <AiGuidancePanel result={shown} input={input} progressStatus={progress} routeReviewed={completedIds.includes(shown.id)} />
      </div>

      <article className="space-y-3 px-4 pt-4">
        <details ref={prepareRef} className="scroll-mt-4 rounded-[16px] border border-line bg-surface p-3">
          <summary className="min-h-11 cursor-pointer text-[16px] font-extrabold text-ink">어떤 도움을 받을 수 있나요?</summary>
          <p className="text-[15px] font-semibold text-ink">{shown.gain}</p>
          <GlossaryTips texts={[shown.gain]} />
        </details>

        <details className="rounded-[16px] border border-line bg-surface p-3">
          <summary className="min-h-11 cursor-pointer text-[16px] font-extrabold text-ink">왜 이 경로가 추천되었나요?</summary>
          <p className="mb-2 text-[15px] font-bold" style={{ color: STATUS_META[shown.status].text }}>
            {statusSentence(shown)}
          </p>
          <EvidenceList evidence={shown.evidence} />
          <GlossaryTips texts={shown.why} />
        </details>

        <details className="rounded-[16px] border border-line bg-surface p-3">
          <summary className="min-h-11 cursor-pointer text-[16px] font-extrabold text-ink">무엇을 준비해야 하나요?</summary>
          {shown.prepare.length > 0 ? (
            <ul className="space-y-1.5">
              {shown.prepare.map((p) => (
                <li key={p} className="flex gap-2 text-[15px] text-ink">
                  <FileIcon size={18} className="mt-0.5 shrink-0 text-muted" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink">
              필요한 서류는 {shown.agency}에서 안내받을 수 있어요. 이 시연에는 서류 목록 정보가 없어요.
            </p>
          )}
        </details>

        <details className="rounded-[16px] border border-line bg-surface p-3" open>
          <summary ref={howRef} tabIndex={-1} className="min-h-11 scroll-mt-36 cursor-pointer text-[16px] font-extrabold text-ink outline-none">신청 방법과 공식 안내처</summary>
          <p className="text-[15px] text-ink">{shown.how}</p>
          <GlossaryTips texts={[shown.how]} />
          <p className="mt-2 rounded-[14px] bg-sub px-3 py-2.5 text-[14px] text-ink">
            <span className="font-bold">공식 안내처</span> {shown.agency}
            <span className="mt-0.5 block text-[13px] text-muted">이 시연에는 외부 신청 링크가 연결되어 있지 않아요.</span>
          </p>
        </details>

        <details className="rounded-[16px] border border-line bg-surface p-4">
          <summary className="min-h-11 cursor-pointer text-[16px] font-extrabold text-ink">판정 근거와 확인하지 않은 조건</summary>
          <JudgmentBasis result={shown} input={input} />
        </details>

        <section aria-labelledby="my-progress" className="rounded-[18px] border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="my-progress" className="text-[15px] font-extrabold text-ink">
              내가 표시한 상태
            </h2>
            <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[13px] font-bold text-brand-text">
              내 기록 · {PROGRESS_LABEL[progress]}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            이 상태는 내가 직접 적은 기록이에요. 공식 접수 여부나 심사 결과는 기관에서 확인해 주세요.
          </p>
          <Button variant="secondary" className="mt-3 w-full text-[15px]" onClick={() => setSheet("progress")} disabled={!currentStep}>
            진행 상황 바꾸기
          </Button>
        </section>

        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming">
              <h2 id="upcoming" className="text-[16px] font-extrabold text-ink">
              다른 추천 경로
            </h2>
            <ul className="mt-2 space-y-2">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-sub px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-ink">
                      {s.shortTitle}
                    </span>
            <span className="text-[13px] text-muted">내 기록: {PROGRESS_LABEL[progressOf(s.id)]}</span>
                  </span>
                  <StatusPill result={s} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <Disclaimer />
      </article>

      <BottomBar className="space-y-2">
        {currentStep && (
          <PrimaryCta
            step={currentStep}
            progress={progress}
            disabled={rerouting}
            onShowHow={showHow}
            onUpdate={() => setSheet("progress")}
            onNext={handleAdvance}
          />
        )}
        <Button variant="secondary" onClick={() => setSheet("situation")} disabled={rerouting || !currentStep} className="w-full text-[15px]">
          <RefreshIcon size={18} /> 조건 변경 및 재판정
        </Button>
      </BottomBar>

      {sheet === "situation" && (
        <SituationSheet
          input={input}
          candidates={steps.filter((s) => !completedIds.includes(s.id))}
          defaultId={currentStep?.id ?? null}
          onClose={() => setSheet(null)}
          onReject={handleReject}
          onChangeConditions={handleConditions}
        />
      )}
      {sheet === "progress" && currentStep && (
        <ProgressSheet
          step={currentStep}
          current={progress}
          onClose={() => setSheet(null)}
          onSave={(status) => {
            setProgress(currentStep.id, status);
            setSheet(null);
          }}
          onSkip={handleAdvance}
          onOpenSituation={() => setSheet("situation")}
        />
      )}
    </main>
  );
}

/** 진행 상태에 따라 하나의 주요 행동만 보여 줍니다. */
function PrimaryCta({
  step,
  progress,
  disabled,
  onShowHow,
  onUpdate,
  onNext,
}: {
  step: BenefitResult;
  progress: string;
  disabled: boolean;
  onShowHow: () => void;
  onUpdate: () => void;
  onNext: () => void;
}) {
  const cls = "w-full min-h-[52px] text-[17px]";
  if (progress === "done") {
    return (
      <Button className={cls} onClick={onNext} disabled={disabled}>
        다른 추천 경로 보기 <ArrowRightIcon size={18} />
      </Button>
    );
  }
  if (progress !== "todo") {
    return (
      <Button className={cls} onClick={onUpdate} disabled={disabled}>
        <CheckIcon size={20} strokeWidth={2.6} /> 진행 상황 업데이트
      </Button>
    );
  }
  return (
    <Button className={cls} onClick={onShowHow} disabled={disabled}>
      {step.status === "consult"
        ? "상담 안내 확인하기"
        : step.status === "waiting"
          ? "다시 확인할 조건 보기"
          : "자격 확인 방법 보기"} <ArrowRightIcon size={18} />
    </Button>
  );
}

function firstAction(step: BenefitResult): string {
  if (step.status === "consult") return "담당 기관에 상담해 대상 여부를 확인하세요.";
  if (step.status === "waiting") return "안내된 대기 기간이 지난 뒤 자격을 다시 확인하세요.";
  if (step.status === "blocked") return "현재 조건에서 맞지 않는 기준을 확인하세요.";
  return "신청 전에 상세 자격과 신청 방법을 확인하세요.";
}

function firstActionDescription(step: BenefitResult): string {
  if (step.status === "consult") return "위기 사유와 지원 대상 여부는 기관이 확인합니다. 전화나 방문 전에 상황을 간단히 정리해 두세요.";
  if (step.status === "waiting") return "표시된 기간은 시연 기준의 예상 안내예요. 신청 가능 여부와 시점은 고용센터에 확인해 주세요.";
  if (step.status === "blocked") return "현재 입력한 조건으로 예상한 결과예요. 조건이 달라지면 내 조건에서 다시 계산할 수 있어요.";
  return "입력한 기본 조건에 따른 예상 결과예요. 재산 등 확인하지 않은 조건이 있어 최종 자격은 기관에서 확인해야 합니다.";
}

function RerouteOverlay() {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="animate-fade-in absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]"
    >
      <span className="relative flex size-16 items-center justify-center">
        <span aria-hidden="true" className="animate-reroute-pulse absolute inset-0 rounded-full bg-brand/25" />
        <span className="relative flex size-14 items-center justify-center rounded-full bg-brand text-white">
          <RefreshIcon size={26} className="animate-reroute-spin" />
        </span>
      </span>
      <p className="mt-3 text-[16px] font-extrabold text-ink">경로 재탐색 중</p>
      <p className="mt-0.5 text-[13px] text-muted">바뀐 상황으로 남은 길을 다시 찾고 있어요</p>
    </div>
  );
}

function NoticeCard({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className={`relative z-10 mx-4 mt-3 flex gap-3 rounded-[16px] p-4 ${
        notice.discovered ? "animate-discover bg-brand text-white" : "animate-fade-in bg-ink text-white"
      }`}
    >
      {notice.discovered ? <SparkleIcon size={20} className="mt-0.5 shrink-0" /> : <RefreshIcon size={20} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1 text-[14px]">
        <p className="font-extrabold">{notice.title}</p>
        {notice.discovered && <p className="mt-0.5 text-white/90">조건이 달라져서 이용할 수 있는 제도가 추가됐어요.</p>}
        <ul className="mt-1 space-y-0.5 text-white/90">
          {notice.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

function Finished({
  completed,
  notice,
  onDismiss,
  onRestart,
}: {
  completed: BenefitResult[];
  notice: Notice | null;
  onDismiss: () => void;
  onRestart: () => void;
}) {
  const { input, evaluation, progressOf } = useAppState();
  const open = evaluation.route.filter((r) => r.status !== "waiting");
  return (
    <main className="px-4 pb-28 pt-8">
      {notice && (
        <div className="mb-6 [&>div]:mx-0 [&>div]:mt-0">
          <NoticeCard notice={notice} onDismiss={onDismiss} />
        </div>
      )}
      <div className="animate-discover flex flex-col items-center text-center">
        <Mascot size={88} />
        <h1 className="mt-3 text-[24px] font-extrabold text-ink">추천 경로를 모두 확인했어요</h1>
        <p className="mt-1 text-[15px] text-muted">
          경로 안내를 확인했어요. 이것은 신청이나 지원 완료를 뜻하지 않아요. 실제 결과는 소관 기관에서 확인해 주세요.
        </p>
      </div>

      <h2 className="mt-8 text-[17px] font-extrabold text-ink">확인한 경로와 내 기록</h2>
      <ul className="mt-2 space-y-2">
        {completed.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-[14px] bg-sub px-4 py-3">
            {progressOf(s.id) === "done" ? (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
                <CheckIcon size={16} strokeWidth={3} />
              </span>
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface" aria-hidden="true" />
            )}
            <span className="flex-1 text-[15px] font-bold text-ink">
              {s.shortTitle}
            </span>
            <span className="text-[13px] font-semibold text-muted">내 기록: {PROGRESS_LABEL[progressOf(s.id)]}</span>
          </li>
        ))}
      </ul>

      {evaluation.blocked.length > 0 && (
        <>
          <h2 className="mt-6 text-[17px] font-extrabold text-ink">아직 열리지 않은 길</h2>
          <p className="mt-0.5 text-[13px] text-muted">조건이 바뀌면 다시 도전할 수 있어요.</p>
          <div className="mt-3 space-y-4">
            {evaluation.blocked.slice(0, 1).map((b) => (
              <div key={b.id} className="rounded-[18px] border border-line p-4">
                <BlockedDetail result={b} input={input} alternatives={open} />
              </div>
            ))}
            {evaluation.blocked.length > 1 && (
              <LinkButton href="/map" variant="secondary" className="w-full text-[15px]">
                막힌 길 {evaluation.blocked.length}곳 모두 복지지도에서 보기
              </LinkButton>
            )}
          </div>
        </>
      )}

      <div className="mt-8 grid gap-2">
        <Button onClick={onRestart} className="min-h-[52px]">
          <RefreshIcon size={20} /> 처음부터 다시 안내
        </Button>
        <LinkButton href="/my" variant="secondary">
          조건 바꿔서 다른 경로 찾기
        </LinkButton>
        <LinkButton href="/" variant="secondary">
          홈으로
        </LinkButton>
      </div>
      <p className="mt-3 text-center text-[13px] text-muted">다시 안내하면 진행 기록과 탈락 입력이 지워집니다.</p>
      <Disclaimer className="mt-5" />
    </main>
  );
}

function EmptyRoute({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  const { input, evaluation } = useAppState();
  return (
    <main className="px-4 pb-28 pt-8">
      {notice && (
        <div className="mb-6 [&>div]:mx-0 [&>div]:mt-0">
          <NoticeCard notice={notice} onDismiss={onDismiss} />
        </div>
      )}
      <h1 className="text-[22px] font-extrabold text-ink">아직은 이 길로 갈 수 없어요</h1>
      <p className="mt-1 text-[15px] text-muted">
        현재 조건으로는 안내할 경로를 찾지 못했어요. 하지만 조건을 확인하면 다시 도전할 수 있어요.
      </p>
      {evaluation.blocked.length > 0 && (
        <div className="mt-5 space-y-3">
          {evaluation.blocked.map((b) => (
            <div key={b.id} className="rounded-[18px] border border-line p-4">
              <BlockedDetail result={b} input={input} />
            </div>
          ))}
        </div>
      )}
      <LinkButton href="/my" className="mt-6 w-full min-h-[52px]">
        출발 조건 바꾸기
      </LinkButton>
      <Disclaimer className="mt-5" />
    </main>
  );
}
