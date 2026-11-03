"use client";

import { useEffect, useRef, useState } from "react";
import type { BenefitResult } from "@/lib/engine";
import { PROGRESS_LABEL } from "@/lib/state/app-state";
import type { ProgressStatus } from "@/lib/state/app-state";
import { ArrowRightIcon, CloseIcon } from "./icons";
import { Button } from "./ui";

const OPTIONS: { value: ProgressStatus; hint: string }[] = [
  { value: "todo", hint: "아직 안내를 살펴보지 않았어요" },
  { value: "reviewing", hint: "신청 방법이나 조건을 직접 확인하고 있어요" },
  { value: "consulting", hint: "기관에 상담을 요청했거나 일정을 정했어요" },
  { value: "applying", hint: "신청서를 제출했다고 표시했어요. 공식 접수는 기관에 확인해 주세요" },
  { value: "done", hint: "내가 할 일을 마쳤어요. 지원 결정이나 승인을 뜻하지 않아요" },
];

type Props = {
  step: BenefitResult;
  current: ProgressStatus;
  onClose: () => void;
  onSave: (status: ProgressStatus) => void;
  onSkip: () => void;
  onOpenSituation: () => void;
};

/** 사용자가 직접 진행 상황을 고르는 시트. 열릴 때마다 새로 마운트합니다. */
export function ProgressSheet({ step, current, onClose, onSave, onSkip, onOpenSituation }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState<ProgressStatus>(current);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="progress-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="animate-sheet-up mx-auto mb-0 mt-auto max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[24px] bg-surface p-0 text-ink backdrop:bg-[rgba(24,35,47,0.45)] md:max-w-[390px]"
    >
      <form
        className="px-5 pb-6 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(value);
        }}
      >
        <div aria-hidden="true" className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 id="progress-title" className="text-[19px] font-extrabold">
            진행 상황 업데이트
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="닫기"
            className="flex size-11 items-center justify-center rounded-full hover:bg-sub"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <p className="text-[14px] text-muted">{step.title}</p>

        <fieldset className="mt-4">
          <legend className="sr-only">지금 어디까지 했나요?</legend>
          <ul className="space-y-2">
            {OPTIONS.map((o) => (
              <li key={o.value}>
                <label
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-consult ${
                    value === o.value ? "border-brand bg-brand-tint/60" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="progress"
                    value={o.value}
                    checked={value === o.value}
                    onChange={() => setValue(o.value)}
                    className="size-5 accent-[var(--brand)]"
                  />
                  <span>
                    <span className="block text-[15px] font-bold">{PROGRESS_LABEL[o.value]}</span>
                    <span className="block text-[13px] text-muted">{o.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <p className="mt-3 text-[13px] text-muted">
          이 기록은 이 기기에만 저장돼요. 공식 접수 여부와 심사 결과는 기관에서 따로 확인해 주세요.
        </p>

        <Button type="submit" className="mt-4 w-full">
          저장하기
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="text-[14px]" onClick={onSkip}>
          이 경로 안내 건너뛰기 <ArrowRightIcon size={16} />
          </Button>
          <Button variant="secondary" className="text-[14px]" onClick={onOpenSituation}>
            탈락 통보 입력
          </Button>
        </div>
      </form>
    </dialog>
  );
}
