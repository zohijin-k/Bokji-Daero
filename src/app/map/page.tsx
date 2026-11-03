"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, RouteIcon } from "@/components/icons";
import { BlockedDetail, JudgmentBasis, RouteCard } from "@/components/route-list";
import { RouteMap } from "@/components/route-map";
import { STATUS_META, StatusIcon, StatusPill, statusSentence } from "@/components/status";
import { Button } from "@/components/ui";
import type { Status } from "@/lib/engine";
import { useAppState } from "@/lib/state/app-state";
import { useElementSize } from "@/lib/use-element-size";

const LEGEND: { status: Status; label: string }[] = [
  { status: "available", label: "지금 가능" },
  { status: "consult", label: "상담 필요" },
  { status: "waiting", label: "N개월 후" },
  { status: "blocked", label: "현재 막힘" },
];

export default function MapPage() {
  const router = useRouter();
  const { input, evaluation: ev, completedIds, selectedId, select, startAt } =
    useAppState();
  const [expanded, setExpanded] = useState(false);
  const [mapRef, mapSize] = useElementSize<HTMLDivElement>();
  const [topRef, topSize] = useElementSize<HTMLDivElement>();
  const [sheetRef, sheetSize] = useElementSize<HTMLDivElement>();

  const selected = [...ev.route, ...ev.blocked].find((r) => r.id === selectedId) ?? null;
  const openAlternatives = ev.route.filter((r) => r.status === "available" || r.status === "consult");

  // 화면 픽셀을 지도 좌표(폭 390)로 바꿔 지도와 시트가 겹치지 않게 합니다.
  const unit = mapSize.width > 0 ? 390 / mapSize.width : 1;
  const viewHeight = Math.max(300, Math.round(mapSize.height * unit)) || 600;

  const choose = (id: string) => {
    select(id === selectedId ? null : id);
    setExpanded(true);
  };

  return (
    <main className="relative h-[calc(100dvh-64px-env(safe-area-inset-bottom))] overflow-hidden bg-[#f3f6f4]">
      <div ref={mapRef} className="absolute inset-0">
        <RouteMap
          stops={ev.mapStops}
          blocked={ev.blocked}
          completedIds={completedIds}
          selectedId={selectedId}
          onSelect={choose}
          viewHeight={viewHeight}
          topInset={topSize.height * unit}
          bottomInset={sheetSize.height * unit}
        />
      </div>

      <div ref={topRef} className="absolute inset-x-0 top-0 z-10 border-b border-line bg-surface px-4 pb-3 pt-3">
        <h1 className="text-[22px] font-extrabold text-ink">복지지도</h1>
        <p className="text-[14px] leading-snug text-muted">각 표시는 따로 선택할 수 있어요. 한 경로의 진행이 다른 제도 이용 조건은 아니에요.</p>
        <ul
          aria-label="범례"
          className="mt-2 flex flex-wrap gap-x-3 gap-y-1"
        >
          {LEGEND.map(({ status, label }) => {
            const meta = STATUS_META[status];
              return (
              <li key={status} className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                <svg width="22" height="8" aria-hidden="true">
                  <line
                    x1="3"
                    y1="4"
                    x2="19"
                    y2="4"
                    stroke={meta.stroke}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={meta.dash ? meta.dash.split(" ").map((n) => Number(n) * 0.5).join(" ") : undefined}
                  />
                </svg>
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      <section
        ref={sheetRef}
        aria-label="경로 목록"
        className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[50%] flex-col rounded-t-[24px] bg-surface shadow-[0_-6px_20px_rgba(24,35,47,0.1)] transition-[height] duration-300 ease-out motion-reduce:transition-none ${expanded ? "h-1/2" : "h-14"}`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-14 w-full shrink-0 flex-col items-center px-4 pb-2 pt-2"
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <span className="mt-2 flex w-full items-center justify-between">
            <span className="text-[16px] font-extrabold text-ink">
              갈 수 있는 길 {ev.route.length}개
              <span className="ml-2 text-[14px] font-bold text-muted">막힌 길 {ev.blocked.length}개</span>
            </span>
            <span className="flex items-center gap-0.5 text-[13px] font-bold text-muted">
              {expanded ? "접기" : "펼치기"}
              {expanded ? <ChevronDownIcon size={18} /> : <ChevronUpIcon size={18} />}
            </span>
          </span>
        </button>

        {expanded && (
          <div className="min-h-0 overflow-y-auto px-4 pb-4">
            {selected ? (
              <div key={selected.id} className="animate-fade-in">
                <Button variant="ghost" onClick={() => select(null)} className="-ml-2 min-h-11 px-2 text-[14px]">
                  <ArrowLeftIcon size={18} /> 전체 목록
                </Button>
                {selected.status === "blocked" ? (
                  <BlockedDetail result={selected} input={input} alternatives={openAlternatives} showAiGuidance />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <StatusIcon status={selected.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-muted">선택한 복지 경로</span>
                          <StatusPill result={selected} />
                        </div>
                        <p className="mt-1 text-[18px] font-extrabold leading-snug text-ink">{selected.title}</p>
                        <p className="mt-0.5 text-[14px] font-semibold" style={{ color: STATUS_META[selected.status].text }}>
                          {statusSentence(selected)}
                        </p>
                      </div>
                    </div>
                    <p className="rounded-[14px] bg-sub px-3 py-2.5 text-[14px] text-ink">{selected.gain}</p>
                    <JudgmentBasis result={selected} input={input} />
                    <Button
                      className="w-full"
                      onClick={() => {
                        startAt(selected.id);
                        router.push("/route");
                      }}
                    >
                      <RouteIcon size={20} /> 이 경로로 안내 시작
                    </Button>
                    <p className="text-center text-[12px] text-muted">안내 화면에서 판정 근거를 바탕으로 AI 맞춤 설명을 선택할 수 있어요.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {ev.route.length === 0 && (
                  <p className="rounded-[14px] bg-sub p-3 text-[14px] text-ink">
                    현재 조건으로 갈 수 있는 길이 없어요. 막힌 길을 눌러 필요한 조건을 확인해 보세요.
                  </p>
                )}
                <ul className="space-y-2">
                  {ev.route.map((r) => (
                    <li key={r.id}>
                      <RouteCard result={r} onClick={() => choose(r.id)} />
                    </li>
                  ))}
                </ul>
                {ev.blocked.length > 0 && (
                  <>
                    <h2 className="pt-2 text-[14px] font-extrabold text-ink">아직 열리지 않은 길</h2>
                    <ul className="space-y-2">
                      {ev.blocked.map((b) => (
                        <li key={b.id}>
                          <RouteCard result={b} onClick={() => choose(b.id)} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="pt-1 text-[12px] text-muted">일부 조건만 반영한 시연용 결과예요. 최종 결정은 소관 기관이 해요.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
