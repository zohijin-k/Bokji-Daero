import Link from "next/link";
import type { Input } from "@/lib/engine";
import { describeInput } from "@/lib/describe";
import { ChevronRightIcon } from "./icons";

/** 출발 조건 요약 카드. 조건이 많으면 줄을 바꿔 모두 보여 줍니다. */
export function ConditionCard({
  input,
  monthsOffset = 0,
  className = "",
}: {
  input: Input;
  monthsOffset?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-[16px] bg-surface/95 p-3 shadow-[0_2px_10px_rgba(24,35,47,0.08)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-extrabold text-ink">나의 출발 조건</p>
        <Link
          href="/my"
          className="-my-2 -mr-1 inline-flex min-h-11 items-center gap-0.5 px-1 text-[13px] font-bold text-brand-text"
        >
          출발 조건 수정
          <ChevronRightIcon size={16} />
        </Link>
      </div>
      <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="출발 조건">
        {describeInput(input, monthsOffset).map((label) => (
          <li key={label} className="rounded-full bg-sub px-2.5 py-1 text-[13px] font-semibold text-ink">
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
