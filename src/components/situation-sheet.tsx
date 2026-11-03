"use client";

import { useEffect, useRef, useState } from "react";
import type { BenefitResult, Housing, Input } from "@/lib/engine";
import { IncomeSlider, Segmented } from "./form-controls";
import { CloseIcon, RefreshIcon } from "./icons";
import { StatusPill } from "./status";

type Mode = "rejected" | "conditions";

type Props = {
  input: Input;
  candidates: BenefitResult[];
  defaultId: string | null;
  onClose: () => void;
  onReject: (id: string) => void;
  onChangeConditions: (patch: Pick<Input, "income" | "housing">) => void;
};

/** 열릴 때마다 새로 마운트해 입력값을 현재 조건으로 초기화합니다. */
export function SituationSheet({ input, candidates, defaultId, onClose, onReject, onChangeConditions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>(candidates.length > 0 ? "rejected" : "conditions");
  const [rejectId, setRejectId] = useState(defaultId ?? candidates[0]?.id ?? "");
  const [income, setIncome] = useState(input.income);
  const [housing, setHousing] = useState<Housing>(input.housing);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="situation-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="animate-sheet-up mx-auto mb-0 mt-auto max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] bg-surface p-0 text-ink backdrop:bg-[rgba(23,33,43,0.45)] md:max-w-[390px]"
    >
      <div className="px-5 pb-6 pt-3">
        <div aria-hidden="true" className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 id="situation-title" className="text-[19px] font-extrabold">
            조건 변경 및 재판정
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="닫기"
            className="flex size-11 items-center justify-center rounded-full hover:bg-page"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="mt-2">
          <Segmented<Mode>
            legend="어떤 변화가 있었나요?"
            value={mode}
            onChange={setMode}
            options={[
              { value: "rejected", label: "탈락 통보" },
              { value: "conditions", label: "소득·거주 변경" },
            ]}
          />
        </div>

        {mode === "rejected" ? (
          candidates.length > 0 ? (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (rejectId) onReject(rejectId);
              }}
            >
              <fieldset>
                <legend className="text-[15px] font-bold">탈락 통보를 받은 제도</legend>
                <ul className="mt-2 space-y-2">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <label
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-consult ${
                          rejectId === c.id ? "border-blocked bg-blocked-tint/60" : "border-line"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejected"
                          value={c.id}
                          checked={rejectId === c.id}
                          onChange={() => setRejectId(c.id)}
                          className="size-5 accent-[var(--blocked-text)]"
                        />
                        <span className="flex-1 text-[15px] font-bold">{c.shortTitle}</span>
                        <StatusPill result={c} />
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <p className="mt-3 text-[13px] text-muted">
                선택한 제도는 막힌 길로 옮기고, 남은 경로로 다시 안내합니다. 이의신청이나 재신청 가능 여부는 소관 기관에 확인해 주세요.
              </p>
              <button
                type="submit"
                className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[16px] font-extrabold text-white"
              >
                <RefreshIcon size={20} /> 이 제도 빼고 재탐색
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-2xl bg-page p-4 text-[14px]">남은 단계가 없어 탈락 처리할 제도가 없어요.</p>
          )
        ) : (
          <form
            className="mt-4 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              onChangeConditions({ income, housing });
            }}
          >
            <IncomeSlider value={income} onChange={setIncome} />
            <Segmented<Housing>
              legend="거주"
              value={housing}
              onChange={setHousing}
              options={[
                { value: "tenant", label: "임차" },
                { value: "other", label: "자가·기타" },
              ]}
            />
            <button
              type="submit"
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[16px] font-extrabold text-white"
            >
              <RefreshIcon size={20} /> 바뀐 조건으로 재탐색
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
