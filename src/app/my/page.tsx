"use client";

import { useEffect, useRef, useState } from "react";
import { IncomeSlider, MonthsStepper, Segmented } from "@/components/form-controls";
import { ArrowRightIcon, InfoIcon, RefreshIcon, SparkleIcon } from "@/components/icons";
import { Disclaimer } from "@/components/route-list";
import { StatusPill } from "@/components/status";
import { BottomBar, Button, Card, LinkButton } from "@/components/ui";
import { DEFAULT_INPUT, EMPTY_KUKSI1_PROFILE, RULES, compareRoutes, evaluate } from "@/lib/engine";
import type { AgeGroup, Housing, Input, Kuksi1Profile, Kuksi1WorkStatus, RouteComparison, TriState, UnemploymentBenefit } from "@/lib/engine";
import { AGE_LABEL, BENEFIT_LABEL, HOUSING_LABEL, sameConditions } from "@/lib/describe";
import { useAppState } from "@/lib/state/app-state";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export default function ConditionsPage() {
  const { input, evaluation: ev, completedIds, progress, hasProgress, hydrated, replaceInput, resetProgress, resetAll } = useAppState();
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState<Input>(input);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<RouteComparison | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const changed = !sameConditions(draft, input);
  const patch = (p: Partial<Input>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setResult(null);
  };
  const patchKuksi1Profile = <K extends keyof Kuksi1Profile>(key: K, value: Kuksi1Profile[K]) =>
    patch({ kuksi1Profile: { ...EMPTY_KUKSI1_PROFILE, ...draft.kuksi1Profile, [key]: value } });
  const hasRecords = hasProgress || completedIds.length > 0 || input.rejectedIds.length > 0 || Object.values(progress).some((s) => s !== "todo");

  useEffect(() => {
    if (hydrated) window.queueMicrotask(() => setDraft(input));
  }, [hydrated, input]);

  const apply = () => {
    const next = { ...draft, rejectedIds: input.rejectedIds };
    const comparison = compareRoutes(ev, evaluate(next));
    setCalculating(true);
    timer.current = window.setTimeout(
      () => {
        replaceInput(next);
        setCalculating(false);
        setResult(comparison);
        requestAnimationFrame(() =>
          resultRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }),
        );
      },
      reducedMotion ? 150 : 600,
    );
  };

  return (
    <main className="px-4 pb-[160px] pt-5">
      <h1 className="text-[23px] font-extrabold text-ink">내 조건</h1>
      <p className="mt-1 text-[14px] text-muted">출발 조건을 바꾸면 경로도 다시 계산돼요.</p>

      <div ref={resultRef} className="scroll-mt-4">
        {result && <ResultCard result={result} />}
      </div>

      <Card className="mt-4 space-y-7 p-4">
        <section>
          <IncomeSlider value={draft.income} onChange={(income) => patch({ income })} withDirectInput />
          <p className="mt-3 flex gap-2 rounded-[14px] bg-sub px-3 py-2.5 text-[13px] leading-relaxed text-muted">
            <InfoIcon size={16} className="mt-0.5 shrink-0" />
            <span>
              월급(개인 소득), 가구 전체 소득, 소득인정액은 서로 다른 값이에요. 소득인정액은 심사 때 월 소득과 재산을 반영해 산정하지만,
              이 시연은 재산을 계산하지 않으므로 입력 금액을 공식 계산값으로 볼 수 없어요.
            </span>
          </p>
        </section>
        <Segmented<UnemploymentBenefit>
          legend="구직급여 상태"
          value={draft.unemploymentBenefit}
          onChange={(unemploymentBenefit) => patch({ unemploymentBenefit })}
          options={options(BENEFIT_LABEL)}
        />
        {draft.unemploymentBenefit === "ended" && (
          <MonthsStepper value={draft.monthsSinceEnded} onChange={(monthsSinceEnded) => patch({ monthsSinceEnded })} />
        )}
        <Segmented<AgeGroup>
          legend="나이"
          value={draft.ageGroup}
          onChange={(ageGroup) => patch({ ageGroup })}
          options={options(AGE_LABEL)}
        />
        <Segmented<Housing>
          legend="거주 형태"
          value={draft.housing}
          onChange={(housing) => patch({ housing })}
          options={options(HOUSING_LABEL)}
        />
        <Kuksi1ReviewFields
          profile={{ ...EMPTY_KUKSI1_PROFILE, ...draft.kuksi1Profile }}
          onChange={patchKuksi1Profile}
        />
      </Card>

      <section aria-labelledby="current-route" className="mt-4 rounded-[18px] bg-sub p-4">
        <div className="flex items-center justify-between">
          <h2 id="current-route" className="text-[16px] font-extrabold text-ink">
            지금 적용된 경로
          </h2>
          <span className="text-[13px] font-semibold text-muted">
            {ev.route.length}개 · 막힌 길 {ev.blocked.length}곳
          </span>
        </div>
        {ev.route.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {ev.route.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-surface px-3 py-2.5">
                <span className="text-[15px] font-bold text-ink">{r.shortTitle}</span>
                <StatusPill result={r} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-ink">현재 조건으로 갈 수 있는 길이 없어요.</p>
        )}
      </section>

      <div className="mt-4 grid gap-2">
        <Button
          variant="secondary"
          className="text-[15px]"
          onClick={() => {
            resetAll();
            setDraft(DEFAULT_INPUT);
            setResult(null);
          }}
        >
          <RefreshIcon size={18} /> 기본 시나리오로 되돌리기
        </Button>
        {hasRecords && (
          <Button variant="secondary" className="text-[15px]" onClick={resetProgress}>
            안내 기록 지우기 (확인한 경로 {completedIds.length}개 · 탈락 입력 {input.rejectedIds.length}개)
          </Button>
        )}
      </div>

      <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted">
        <InfoIcon size={18} className="mt-0.5 shrink-0" />
        조건과 내가 표시한 진행 기록은 이 기기의 브라우저에만 저장돼요. 서버로 전송하지 않으며, 이 화면의 &quot;안내 기록 지우기&quot;나 브라우저 데이터 삭제로 지울 수 있어요.
      </p>

      <details className="mt-4 rounded-[18px] border border-line">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-bold text-ink">
          시연용 기준값 보기
        </summary>
        <ul className="space-y-3 px-4 pb-4 text-[13px] text-muted">
          {Object.values(RULES).map((rule) => (
            <li key={rule.id}>
              <p className="font-bold text-ink">
                {rule.label}: {rule.value.toLocaleString("ko-KR")}
                {rule.unit === "개월" ? "개월" : "원"}
              </p>
              <p>
                {rule.sourceNote} · <span className="font-bold text-wait-text">공식 확인 필요</span>
              </p>
            </li>
          ))}
        </ul>
      </details>

      <Disclaimer className="mt-4" />

      <BottomBar>
        <Button onClick={apply} disabled={!changed || calculating} className="w-full min-h-[52px] text-[17px]" aria-live="polite">
          {calculating ? (
            <>
              <RefreshIcon size={20} className="animate-reroute-spin" /> 경로를 다시 계산하고 있어요
            </>
          ) : (
            <>
              변경된 경로 확인하기 <ArrowRightIcon size={18} />
            </>
          )}
        </Button>
        {!changed && !calculating && (
          <p className="mt-1.5 text-center text-[12px] text-muted">바꾼 조건이 없어요. 지금 조건의 경로가 적용되어 있어요.</p>
        )}
      </BottomBar>
    </main>
  );
}

function Kuksi1ReviewFields({
  profile,
  onChange,
}: {
  profile: Kuksi1Profile;
  onChange: <K extends keyof Kuksi1Profile>(key: K, value: Kuksi1Profile[K]) => void;
}) {
  return (
    <details className="rounded-[16px] border border-line bg-surface p-3">
      <summary className="min-h-11 cursor-pointer text-[15px] font-extrabold text-ink">
        국민취업지원 I유형 상세 확인 정보
      </summary>
      <p className="mb-3 text-[13px] leading-relaxed text-muted">
        모르는 값은 비워 두세요. 월급·가구 소득·소득인정액은 서로 다르며, 비워 둔 필수 조건은 추가 확인으로 표시합니다.
      </p>
      <div className="grid gap-3">
        <NumberField label="만 나이" value={profile.ageYears} unit="세" onChange={(v) => onChange("ageYears", v)} />
        <NumberField label="가구원 수" value={profile.householdSize} unit="명" onChange={(v) => onChange("householdSize", v)} />
        <SelectField<number | null>
          label="가구 소득 기준 연도"
          value={profile.householdIncomeReferenceYear}
          onChange={(v) => onChange("householdIncomeReferenceYear", v)}
          options={[[null, "모름"], [2026, "2026년"]]}
        />
        <NumberField label="가구 단위 월 소득 · 신청 산정 기준" value={profile.householdMonthlyIncome} unit="원" onChange={(v) => onChange("householdMonthlyIncome", v)} />
        <NumberField label="가구원 합산 재산" value={profile.householdAssets} unit="원" onChange={(v) => onChange("householdAssets", v)} />
        <NumberField label="신청인 본인 월평균 소득" value={profile.applicantMonthlyIncome} unit="원" onChange={(v) => onChange("applicantMonthlyIncome", v)} />
        <NumberField label="최근 2년 취업 일수" value={profile.employmentDaysLast2Years} unit="일" onChange={(v) => onChange("employmentDaysLast2Years", v)} />
        <NumberField label="최근 2년 취업 시간" value={profile.employmentHoursLast2Years} unit="시간" onChange={(v) => onChange("employmentHoursLast2Years", v)} />
        <SelectField<Kuksi1WorkStatus>
          label="현재 취업 상태"
          value={profile.workStatus}
          onChange={(v) => onChange("workStatus", v)}
          options={[
            ["unknown", "모름"],
            ["not-employed", "미취업"],
            ["employee-under-30-hours", "근로자 · 주 30시간 미만"],
            ["self-employed-under-2.5m", "사업자 · 월 소득 250만 원 미만"],
            ["other-employed", "그 외 취업 중"],
          ]}
        />
        <TriStateField label="근로 능력과 취업·구직 의사 모두 있음" value={profile.ableAndWillingToWork} onChange={(v) => onChange("ableAndWillingToWork", v)} />
        <TriStateField label="진학·전문자격 취득 목적의 재학·수강 중" value={profile.studyingForAdmission} onChange={(v) => onChange("studyingForAdmission", v)} />
        <TriStateField label="구직지원금 또는 재정지원 일자리 제한 해당" value={profile.otherRecentPublicSupport} onChange={(v) => onChange("otherRecentPublicSupport", v)} />
        <TriStateField label="기타 참여 제한에 해당함 (고용24 기준 확인)" value={profile.otherParticipationRestrictions} onChange={(v) => onChange("otherParticipationRestrictions", v)} />
      </div>
    </details>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number | null;
  unit: string;
  onChange: (value: number | null) => void;
}) {
  const id = `kuksi-${label.replace(/[^a-zA-Z0-9가-힣]/g, "-")}`;
  return (
    <label htmlFor={id} className="block text-[14px] font-semibold text-ink">
      {label}
      <span className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-line bg-page px-3">
        <input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={value ?? ""}
          placeholder="미입력"
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ink outline-none"
        />
        <span className="text-[13px] text-muted">{unit}</span>
      </span>
    </label>
  );
}

function SelectField<T extends string | number | null>({
  label,
  value,
  onChange,
  options: items,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  return (
    <label className="block text-[14px] font-semibold text-ink">
      {label}
      <select value={value == null ? "" : String(value)} onChange={(e) => {
        const selected = items.find(([option]) => (option == null ? "" : String(option)) === e.target.value);
        onChange(selected ? selected[0] : e.target.value as T);
      }} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-page px-3 text-[14px] text-ink">
        {items.map(([option, text]) => <option key={String(option)} value={option == null ? "" : String(option)}>{text}</option>)}
      </select>
    </label>
  );
}

function TriStateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
}) {
  return (
    <SelectField<TriState>
      label={label}
      value={value}
      onChange={onChange}
      options={[["unknown", "모름"], ["no", "아니요"], ["yes", "예"]]}
    />
  );
}

function ResultCard({ result }: { result: RouteComparison }) {
  const discovered = result.opened.length > 0;
  const nothing = result.opened.length + result.closed.length + result.changed.length === 0;
  return (
    <section
      role="status"
      aria-labelledby="result-title"
      className={`animate-discover mt-4 rounded-[18px] border p-4 ${discovered ? "border-brand/30 bg-brand-tint/50" : "border-line bg-surface"}`}
    >
      <h2 id="result-title" className="flex items-center gap-2 text-[17px] font-extrabold text-ink">
        {discovered && <SparkleIcon size={20} className="text-brand-text" />}
        {discovered ? "새로운 복지 경로를 발견했어요!" : nothing ? "경로에 달라진 점은 없어요" : "조건이 바뀌었어요!"}
      </h2>
      {discovered && (
        <p className="mt-0.5 text-[14px] text-ink">조건이 달라져서 이용할 수 있는 제도가 추가됐어요.</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-[14px] bg-surface p-3">
          <dt className="text-[13px] text-muted">변경 전 추천 경로</dt>
          <dd className="text-[22px] font-extrabold text-ink">{result.beforeCount}개</dd>
        </div>
        <div className="rounded-[14px] bg-surface p-3">
          <dt className="text-[13px] text-muted">변경 후 추천 경로</dt>
          <dd className="text-[22px] font-extrabold text-brand-text">{result.afterCount}개</dd>
        </div>
      </dl>

      <ChangeList title="새롭게 열린 경로" items={result.opened.map((c) => `${c.shortTitle} · ${c.after}`)} />
      <ChangeList
        title="더 이상 해당하지 않는 경로"
        items={result.closed.map((c) => `${c.shortTitle} · ${c.after ?? "표시 안 됨"}`)}
      />
      <ChangeList title="상태가 바뀐 경로" items={result.changed.map((c) => `${c.shortTitle} · ${c.before} → ${c.after}`)} />

      <p className="mt-3 text-[12px] text-muted">변경된 조건에 따라 예상 판정 결과가 달라졌어요.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <LinkButton href="/" variant={discovered ? "secondary" : "primary"} className="text-[15px]">
          홈에서 보기
        </LinkButton>
        <LinkButton href="/map" variant={discovered ? "primary" : "secondary"} className="text-[15px]">
          복지지도에서 보기
        </LinkButton>
      </div>
    </section>
  );
}

function ChangeList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="text-[13px] font-bold text-muted">{title}</h3>
      <ul className="mt-1 space-y-0.5 text-[14px] font-semibold text-ink">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
