"use client";

import { useId, useState } from "react";
import { formatIncome } from "@/lib/describe";
import { MinusIcon, PlusIcon } from "./icons";

export const INCOME_MAX = 3_000_000;
export const INCOME_STEP = 50_000;

export function IncomeSlider({
  value,
  onChange,
  withDirectInput = false,
}: {
  value: number;
  onChange: (v: number) => void;
  withDirectInput?: boolean;
}) {
  const id = useId();
  const inputId = useId();
  const errorId = useId();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pct = (Math.min(value, INCOME_MAX) / INCOME_MAX) * 100;

  const handleText = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setText(digits === "" ? "" : Number(digits).toLocaleString("ko-KR"));
    if (digits === "") {
      setError("금액을 입력해 주세요.");
      return;
    }
    const next = Number(digits);
    if (next > INCOME_MAX) {
      setError(`최대 ${INCOME_MAX.toLocaleString("ko-KR")}원까지 입력할 수 있어요.`);
      return;
    }
    setError(null);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[15px] font-bold text-ink">
          다른 제도 비교용 시연 금액 <span className="font-medium text-muted">(소득인정액 가정)</span>
        </label>
        <output htmlFor={id} className="text-[24px] font-extrabold text-brand-text">
          {formatIncome(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={INCOME_MAX}
        step={INCOME_STEP}
        value={value}
        onChange={(e) => {
          setError(null);
          onChange(Number(e.target.value));
        }}
        aria-valuetext={`월 ${formatIncome(value)}`}
        className="mt-2 h-11 w-full cursor-pointer accent-[var(--brand)]"
        style={{
          background: `linear-gradient(to right, var(--brand) ${pct}%, var(--line) ${pct}%) center / 100% 6px no-repeat`,
        }}
      />
      <div className="flex justify-between text-[13px] text-muted" aria-hidden="true">
        <span>최소 0원</span>
        <span>최대 300만 원</span>
      </div>

      {withDirectInput && (
        <div className="mt-3">
          <label htmlFor={inputId} className="text-[13px] font-bold text-muted">
            금액 직접 입력
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-[14px] border border-line bg-surface px-3 focus-within:border-consult focus-within:ring-2 focus-within:ring-consult">
            <input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              value={text ?? value.toLocaleString("ko-KR")}
              onFocus={() => setText(value.toLocaleString("ko-KR"))}
              onBlur={() => {
                setText(null);
                setError(null);
              }}
              onChange={(e) => handleText(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-h-12 w-full bg-transparent text-right text-[17px] font-bold text-ink outline-none focus-visible:outline-none"
            />
            <span className="text-[15px] font-bold text-muted">원</span>
          </div>
          {error && (
            <p id={errorId} role="alert" className="mt-1 text-[13px] font-semibold text-blocked-text">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-[15px] font-bold text-ink">{legend}</legend>
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex min-h-12 cursor-pointer items-center justify-center rounded-[14px] border px-2 text-center text-[15px] font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-consult ${
                checked ? "border-brand bg-brand-tint text-brand-text" : "border-line bg-surface text-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function MonthsStepper({
  value,
  onChange,
  min = 0,
  max = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div>
      <p id={id} className="text-[15px] font-bold text-ink">
        구직급여 소진 후 경과 개월 수
      </p>
      <div role="group" aria-labelledby={id} className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="1개월 줄이기"
          className="flex size-12 items-center justify-center rounded-[14px] border border-line bg-surface text-ink disabled:opacity-40"
        >
          <MinusIcon size={20} />
        </button>
        <output aria-live="polite" className="min-w-20 text-center text-[20px] font-extrabold text-ink">
          {value}개월
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="1개월 늘리기"
          className="flex size-12 items-center justify-center rounded-[14px] border border-line bg-surface text-ink disabled:opacity-40"
        >
          <PlusIcon size={20} />
        </button>
      </div>
    </div>
  );
}
