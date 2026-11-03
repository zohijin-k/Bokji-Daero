"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_INPUT, evaluate } from "@/lib/engine";
import type { BenefitResult, Evaluation, Input } from "@/lib/engine";

// 조건, 선택 경로, 사용자 표시 진행 상태는 기기의 localStorage에 저장합니다.
// 서버로 전송하지 않으며, 사용자가 내 조건 화면에서 기록을 지울 수 있습니다.

/** 사용자가 직접 표시하는 제도별 안내 상태. 자격 판정 및 기관 처리 상태와는 별개입니다. */
export type ProgressStatus = "todo" | "reviewing" | "consulting" | "applying" | "done";

const STORAGE_KEY = "bokji-daero-progress-v1";
const VALID_PROGRESS = new Set<ProgressStatus>(["todo", "reviewing", "consulting", "applying", "done"]);

export const PROGRESS_LABEL: Record<ProgressStatus, string> = {
  todo: "확인 전",
  reviewing: "확인 중",
  consulting: "상담 예정",
  applying: "신청 진행 중",
  done: "내 할 일 마침",
};

type AppState = {
  input: Input;
  evaluation: Evaluation;
  /** 상태에 따라 정렬된 독립 복지 경로 선택지 */
  steps: BenefitResult[];
  /** 사용자가 둘러본 복지 경로 */
  completedIds: string[];
  /** 지금 안내 중인 복지 경로, 모두 둘러봤으면 null */
  currentStep: BenefitResult | null;
  /** 홈·복지지도에서 고른 경로 */
  selectedId: string | null;
  progress: Record<string, ProgressStatus>;
  /** 안내를 시작했거나 진행 기록이 있는지 */
  hasProgress: boolean;
  hydrated: boolean;
  progressOf: (id: string) => ProgressStatus;
  updateInput: (patch: Partial<Input>) => void;
  replaceInput: (next: Input) => void;
  select: (id: string | null) => void;
  /** 고른 경로부터 안내를 시작합니다 */
  startAt: (id: string) => void;
  setProgress: (id: string, status: ProgressStatus) => void;
  /** 현재 경로 안내를 마치고 다음 추천 경로로 이동합니다 */
  advance: () => void;
  reject: (id: string) => void;
  resetProgress: () => void;
  resetAll: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState<Input>(DEFAULT_INPUT);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgressMap] = useState<Record<string, ProgressStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  // Reopen the last journey on this device. Nothing is sent to a server.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          version?: number;
          input?: Partial<Input>;
          completedIds?: unknown;
          activeId?: unknown;
          selectedId?: unknown;
          progress?: unknown;
        };
        if (saved.version === 1) {
          const restoredInput = saved.input && typeof saved.input.income === "number"
            ? {
                ...DEFAULT_INPUT,
                ...saved.input,
                rejectedIds: Array.isArray(saved.input.rejectedIds) ? saved.input.rejectedIds : [],
                kuksi1Profile: { ...DEFAULT_INPUT.kuksi1Profile!, ...saved.input.kuksi1Profile },
              }
            : null;
          const restoredCompleted = Array.isArray(saved.completedIds)
            ? saved.completedIds.filter((id): id is string => typeof id === "string")
            : null;
          const restoredProgress = saved.progress && typeof saved.progress === "object"
            ? Object.fromEntries(
                Object.entries(saved.progress).filter((entry): entry is [string, ProgressStatus] => VALID_PROGRESS.has(entry[1] as ProgressStatus)),
              )
            : null;
          window.queueMicrotask(() => {
            if (restoredInput) setInput(restoredInput);
            if (restoredCompleted) setCompletedIds(restoredCompleted);
            if (typeof saved.activeId === "string") setActiveId(saved.activeId);
            if (typeof saved.selectedId === "string") setSelectedId(saved.selectedId);
            if (restoredProgress) setProgressMap(restoredProgress);
            setHydrated(true);
          });
          return;
        }
      }
    } catch {
      // Storage can be unavailable or contain malformed data; start with the demo defaults.
    }
    window.queueMicrotask(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        input,
        completedIds,
        activeId,
        selectedId,
        progress,
      }));
    } catch {
      // Private browsing or device policy may block local storage.
    }
  }, [hydrated, input, completedIds, activeId, selectedId, progress]);

  const evaluation = useMemo(() => evaluate(input), [input]);
  const steps = evaluation.route;

  const currentStep = useMemo(() => {
    const open = steps.filter((s) => !completedIds.includes(s.id));
    return open.find((s) => s.id === activeId) ?? open[0] ?? null;
  }, [steps, completedIds, activeId]);

  const hasProgress =
    completedIds.length > 0 ||
    activeId !== null ||
    Object.values(progress).some((p) => p !== "todo");

  const progressOf = useCallback((id: string) => progress[id] ?? "todo", [progress]);

  const updateInput = useCallback((patch: Partial<Input>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  }, []);

  const replaceInput = useCallback((next: Input) => setInput(next), []);

  const startAt = useCallback((id: string) => {
    setActiveId(id);
    setCompletedIds((prev) => prev.filter((c) => c !== id));
  }, []);

  const setProgress = useCallback((id: string, status: ProgressStatus) => {
    setProgressMap((prev) => ({ ...prev, [id]: status }));
    setActiveId((prev) => prev ?? id);
  }, []);

  const advance = useCallback(() => {
    if (!currentStep) return;
    const passed = [...completedIds, currentStep.id];
    const index = steps.indexOf(currentStep);
    const open = steps.filter((s) => !passed.includes(s.id));
    const next = open.find((s) => steps.indexOf(s) > index) ?? open[0] ?? null;
    setCompletedIds(passed);
    setActiveId(next?.id ?? currentStep.id);
  }, [currentStep, completedIds, steps]);

  const reject = useCallback((id: string) => {
    setInput((prev) =>
      prev.rejectedIds.includes(id) ? prev : { ...prev, rejectedIds: [...prev.rejectedIds, id] },
    );
    setCompletedIds((prev) => prev.filter((c) => c !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const resetProgress = useCallback(() => {
    setCompletedIds([]);
    setActiveId(null);
    setProgressMap({});
    setInput((prev) => ({ ...prev, rejectedIds: [] }));
  }, []);

  const resetAll = useCallback(() => {
    setCompletedIds([]);
    setActiveId(null);
    setSelectedId(null);
    setProgressMap({});
    setInput(DEFAULT_INPUT);
  }, []);

  const value: AppState = {
    input,
    evaluation,
    steps,
    completedIds,
    currentStep,
    selectedId,
    progress,
    hasProgress,
    hydrated,
    progressOf,
    updateInput,
    replaceInput,
    select: setSelectedId,
    startAt,
    setProgress,
    advance,
    reject,
    resetProgress,
    resetAll,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
