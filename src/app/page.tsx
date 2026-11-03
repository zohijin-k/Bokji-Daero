"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Logo, Mascot } from "@/components/brand";
import { ConditionCard } from "@/components/condition-chips";
import { ArrowRightIcon, BlockIcon, CalendarIcon, RouteIcon, SettingsIcon } from "@/components/icons";
import { Disclaimer } from "@/components/route-list";
import { RouteMap } from "@/components/route-map";
import { STATUS_META, StatusIcon, StatusPill, statusCounts, statusSentence } from "@/components/status";
import { BottomBar, Button, LinkButton } from "@/components/ui";
import { diffEvaluations, evaluate } from "@/lib/engine";
import { useAppState } from "@/lib/state/app-state";

export default function HomePage() {
  const router = useRouter();
  const { input, evaluation: now, completedIds, selectedId, select, startAt, hasProgress } =
    useAppState();
  const [preview, setPreview] = useState(false);

  const previewEnabled = preview && now.hasTimeGate;
  const later = useMemo(
    () => evaluate({ ...input, monthsSinceEnded: input.monthsSinceEnded + 1 }),
    [input],
  );
  const ev = previewEnabled ? later : now;
  const changes = previewEnabled ? diffEvaluations(now, later) : [];

  // 지도에서 고른 경로가 있으면 그 경로를, 없으면 가장 앞선 경로를 보여 줍니다.
  const selectedRoute = ev.route.find((r) => r.id === selectedId) ?? null;
  const featured = selectedRoute ?? ev.route[0] ?? null;
  const counts = statusCounts(ev.route);

  const openOnMap = (id: string) => {
    select(id);
    router.push("/map");
  };

  return (
    <main className="pb-[150px]">
      <header className="flex items-center justify-between px-4 pt-3">
        <Logo />
        <LinkButton href="/my" variant="ghost" aria-label="내 조건 설정" className="size-11 px-0 text-ink">
          <SettingsIcon size={22} />
        </LinkButton>
      </header>

      <section className="flex items-end justify-between gap-2 px-4 pt-3">
        <div>
          <h1 className="text-[23px] font-extrabold leading-[1.3] tracking-tight text-ink">
            내 조건에 맞는 복지,
            <br />
            어디까지 갈 수 있을까요?
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug text-muted">
            지금 갈 수 있는 길과 막힌 길, 열리는 시점을 함께 보여드려요.
          </p>
        </div>
        <Mascot size={52} />
      </section>

      <section aria-label="복지 경로 지도" className="relative mt-3 h-[372px] overflow-hidden bg-[#f3f6f4]">
        <RouteMap
          stops={ev.mapStops}
          completedIds={previewEnabled ? [] : completedIds}
          selectedId={featured && selectedRoute ? featured.id : null}
          onSelect={(id) => select(id === selectedId ? null : id)}
          viewHeight={372}
          topInset={112}
          bottomInset={6}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 [&>*]:pointer-events-auto">
          <ConditionCard input={input} monthsOffset={previewEnabled ? 1 : 0} />
        </div>
      </section>

      <div aria-label="경로 상태 요약" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <span className="text-[14px] font-extrabold text-ink">
          {ev.route.length > 0 ? `${ev.route.length}개 경로 발견` : "갈 수 있는 경로 없음"}
        </span>
        {counts.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: STATUS_META[c.status].text }}>
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: STATUS_META[c.status].stroke }} />
            {c.label} {c.count}개
          </span>
        ))}
        {previewEnabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-wait-tint px-2 py-0.5 text-[13px] font-bold text-wait-text">
            <CalendarIcon size={14} /> 1개월 뒤 기준
          </span>
        )}
      </div>

      <div className="space-y-3 px-4 pt-4">
        {featured ? (
          <button
            type="button"
            onClick={() => openOnMap(featured.id)}
            className="animate-fade-in block w-full rounded-[18px] border border-line bg-surface p-4 text-left shadow-[0_2px_10px_rgba(24,35,47,0.05)]"
            key={featured.id}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-muted">
                {selectedRoute ? "선택한 복지 경로" : "우선 확인할 경로"}
              </span>
              <StatusPill result={featured} />
            </span>
            <span className="mt-2 flex items-start gap-3">
              <StatusIcon status={featured.status} />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-extrabold leading-snug text-ink">{featured.title}</span>
                <span className="mt-0.5 block text-[14px] font-semibold" style={{ color: STATUS_META[featured.status].text }}>
                  {statusSentence(featured)}
                </span>
                <span className="mt-1 block text-[14px] text-muted">{featured.gain}</span>
              </span>
            </span>
            <span className="mt-3 flex items-center justify-end gap-1 text-[14px] font-bold text-brand-text">
              경로 자세히 보기 <ArrowRightIcon size={16} />
            </span>
          </button>
        ) : (
          <div className="rounded-[18px] bg-sub p-4 text-[15px] text-ink">
            <p className="font-bold">현재 조건으로 갈 수 있는 경로가 없어요.</p>
            <p className="mt-1 text-[14px] text-muted">막힌 이유를 확인하고 내 조건에서 출발 조건을 바꿔 보세요.</p>
          </div>
        )}

        {now.hasTimeGate && (
          <div>
            <Button
              variant="secondary"
              aria-pressed={previewEnabled}
              onClick={() => setPreview((v) => !v)}
              className={`w-full text-[15px] ${previewEnabled ? "border-ink bg-ink text-white hover:bg-ink" : ""}`}
            >
              <CalendarIcon size={18} />
              {previewEnabled ? "현재 기준으로 돌아가기" : "종료 후 1개월 기준 미리 보기"}
            </Button>
            {previewEnabled && (
              <div role="status" className="animate-fade-in mt-2 rounded-[16px] bg-wait-tint/60 p-3 text-[14px] text-ink">
                <p className="font-bold">구직급여 종료 후 {input.monthsSinceEnded + 1}개월을 가정해 다시 계산했어요.</p>
                <p className="mt-0.5 text-[13px]">미리 보기 기준이며, 그때 자격을 충족하거나 자동 신청되는 뜻은 아니에요.</p>
                <ul className="mt-1 space-y-0.5">
                  {changes.length === 0 && <li>이 기준에서는 경로 상태가 달라지지 않았어요.</li>}
                  {changes.map((c) => (
                    <li key={c.id}>
                      {c.shortTitle}: {c.before ?? "표시 안 됨"} → <strong>{c.after ?? "표시 안 됨"}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {ev.blocked.length > 0 && (
          <section aria-labelledby="home-blocked" className="rounded-[18px] border border-line p-4">
            <h2 id="home-blocked" className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink">
              <BlockIcon size={18} className="text-blocked-text" />
              아직 열리지 않은 길 {ev.blocked.length}곳
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">눌러서 막힌 이유와 필요한 조건을 확인해 보세요.</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {ev.blocked.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => openOnMap(b.id)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-blocked/30 bg-blocked-tint/50 px-3 text-[14px] font-bold text-blocked-text"
                  >
                    {b.shortTitle}
                    <ArrowRightIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Disclaimer />

        <Link href="/official-data" className="mt-3 flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left">
          <span>
            <span className="block text-[14px] font-extrabold text-ink">공식 중앙부처 복지서비스 목록</span>
            <span className="mt-0.5 block text-[12px] text-muted">실제 공공데이터 · 제도별 공식 안내 확인</span>
          </span>
          <ArrowRightIcon size={18} />
        </Link>
      </div>

      <BottomBar>
        <HomeCta
          hasRoute={now.route.length > 0}
          hasProgress={hasProgress}
          selectedOpenId={selectedRoute && !previewEnabled ? selectedRoute.id : null}
          onStart={(id) => {
            startAt(id);
            router.push("/route");
          }}
        />
      </BottomBar>
    </main>
  );
}

/** 현재 상태에 맞는 주요 행동 하나만 보여 줍니다. */
function HomeCta({
  hasRoute,
  hasProgress,
  selectedOpenId,
  onStart,
}: {
  hasRoute: boolean;
  hasProgress: boolean;
  selectedOpenId: string | null;
  onStart: (id: string) => void;
}) {
  const cls = "w-full min-h-[52px] text-[17px]";
  if (!hasRoute) {
    return (
      <LinkButton href="/my" variant="dark" className={cls}>
        출발 조건 바꾸기
      </LinkButton>
    );
  }
  if (hasProgress) {
    return (
      <LinkButton href="/route" className={cls}>
        <RouteIcon size={20} /> 이어서 진행하기
      </LinkButton>
    );
  }
  if (selectedOpenId) {
    return (
      <Button onClick={() => onStart(selectedOpenId)} className={cls}>
        <RouteIcon size={20} /> 안내 시작하기
      </Button>
    );
  }
  return (
    <LinkButton href="/map" className={cls}>
      내 복지 경로 확인하기 <ArrowRightIcon size={18} />
    </LinkButton>
  );
}
