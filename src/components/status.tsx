import { statusLabel } from "@/lib/engine";
import type { BenefitResult, Status } from "@/lib/engine";
import { BlockIcon, ChatIcon, CheckCircleIcon, ClockIcon } from "./icons";

type StatusMeta = {
  /** 선, 채움용 지정 색 */
  stroke: string;
  /** 글자용 진한 색 */
  text: string;
  tint: string;
  /** 경로 선 패턴: 색 외에도 모양으로 구분 */
  dash: string | undefined;
  pillClass: string;
  Icon: typeof CheckCircleIcon;
};

export const STATUS_META: Record<Status, StatusMeta> = {
  available: {
    stroke: "var(--ok)",
    text: "var(--ok-text)",
    tint: "var(--ok-tint)",
    dash: undefined,
    pillClass: "bg-ok-tint text-ok-text",
    Icon: CheckCircleIcon,
  },
  consult: {
    stroke: "var(--consult)",
    text: "var(--consult-text)",
    tint: "var(--consult-tint)",
    dash: "14 7",
    pillClass: "bg-consult-tint text-consult-text",
    Icon: ChatIcon,
  },
  waiting: {
    stroke: "var(--wait)",
    text: "var(--wait-text)",
    tint: "var(--wait-tint)",
    dash: "2 9",
    pillClass: "bg-wait-tint text-wait-text",
    Icon: ClockIcon,
  },
  blocked: {
    stroke: "var(--blocked)",
    text: "var(--blocked-text)",
    tint: "var(--blocked-tint)",
    dash: "6 6",
    pillClass: "bg-blocked-tint text-blocked-text",
    Icon: BlockIcon,
  },
};

/** 상태를 일상 언어로 풀어 쓴 한 줄. 확정적인 수급 표현은 쓰지 않습니다. */
export function statusSentence(result: Pick<BenefitResult, "status" | "opensInMonths">): string {
  switch (result.status) {
    case "available":
      return "지금 신청해 볼 수 있는 경로예요.";
    case "consult":
      return "이 부분만 확인하면 돼요. 상담으로 대상 여부를 확인해요.";
    case "waiting":
      return `조금만 기다리면 갈 수 있어요. ${result.opensInMonths}개월 후 다시 확인해요.`;
    case "blocked":
      return "아직 이 조건이 필요해요.";
  }
}

export function StatusPill({
  result,
  className = "",
}: {
  result: Pick<BenefitResult, "status" | "opensInMonths">;
  className?: string;
}) {
  const meta = STATUS_META[result.status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold ${meta.pillClass} ${className}`}
    >
      <meta.Icon size={14} strokeWidth={2.4} />
      {statusLabel(result)}
    </span>
  );
}

export function StatusIcon({ status, size = 20 }: { status: Status; size?: number }) {
  const meta = STATUS_META[status];
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size + 12, height: size + 12, background: meta.tint, color: meta.text }}
    >
      <meta.Icon size={size} strokeWidth={2.2} />
    </span>
  );
}

/** 상태별 경로 개수 요약 (예: 지금 가능 1개, 3개월 후 1개) */
export function statusCounts(results: Pick<BenefitResult, "status" | "opensInMonths">[]) {
  const groups = new Map<string, { label: string; status: Status; count: number }>();
  for (const r of results) {
    const label = statusLabel(r);
    const g = groups.get(label) ?? { label, status: r.status, count: 0 };
    g.count += 1;
    groups.set(label, g);
  }
  return [...groups.values()];
}
