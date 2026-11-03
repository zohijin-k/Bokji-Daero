"use client";

import type { KeyboardEvent } from "react";
import { statusLabel } from "@/lib/engine";
import type { BenefitResult } from "@/lib/engine";
import { STATUS_META } from "./status";

// 실제 지리 정보가 아니라 사용자 조건에서 출발하는 개념적 경로도입니다.

type Point = { x: number; y: number };

const VIEW_W = 390;
const DEFAULT_VIEW_H = 380;
// 전체 경로, 출발 라벨, 목적지 말풍선까지 포함하는 안전 bounds.
// SVG가 이 bounds를 실제로 쓸 수 있는 영역에 맞춰 움직이므로
// 헤더/바텀시트 높이가 달라져도 지도 전체가 함께 재배치됩니다.
const CONTENT_BOUNDS = { left: 4, right: 386, top: 54, bottom: 376 };

// 출발점(현재 조건) + 최대 4개 복지 선택지
const WAYPOINTS: Point[] = [
  { x: 60, y: 322 },
  { x: 128, y: 250 },
  { x: 232, y: 284 },
  { x: 320, y: 196 },
  { x: 226, y: 122 },
];

type BubbleSide = "above" | "below";
const BUBBLE_SIDE: BubbleSide[] = ["below", "above", "below", "above", "above"];

// 막힌 선택지 표시 위치
const BLOCKED_SLOTS: { from: number; to: Point; labelDx: number; labelDy: number }[] = [
  { from: 0, to: { x: 62, y: 208 }, labelDx: 0, labelDy: -22 },
  { from: 4, to: { x: 112, y: 104 }, labelDx: 0, labelDy: -22 },
  { from: 2, to: { x: 300, y: 344 }, labelDx: -8, labelDy: 24 },
  { from: 3, to: { x: 350, y: 112 }, labelDx: -10, labelDy: -22 },
  { from: 1, to: { x: 176, y: 186 }, labelDx: 0, labelDy: -22 },
  { from: 0, to: { x: 156, y: 350 }, labelDx: 0, labelDy: 20 },
];

function segmentPath(points: Point[], i: number): string {
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
}

function fullPath(points: Point[]): string {
  return points
    .slice(0, -1)
    .map((_, i) => segmentPath(points, i))
    .map((d, i) => (i === 0 ? d : d.replace(/^M [^C]+/, "")))
    .join(" ");
}

/** 대략적인 글자 폭 계산 (한글은 넓게, 숫자·영문은 좁게) */
function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    if (/[가-힣]/.test(ch)) w += size * 1.0;
    else if (ch === " ") w += size * 0.3;
    else w += size * 0.6;
  }
  return w;
}

function onActivate(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}

type Props = {
  stops: BenefitResult[];
  blocked?: BenefitResult[];
  completedIds?: string[];
  mode?: "overview" | "nav";
  /** 진행 위치 마커: 0이면 출발점, n이면 n번째 지점. null이면 마커를 그리지 않습니다. */
  markerIndex?: number | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** 지도 높이(px). 지도 폭은 390 기준입니다. */
  viewHeight?: number;
  /** 지도 위·아래에 HTML 요소가 겹치는 높이(px). 그 사이에 경로가 들어가도록 맞춥니다. */
  topInset?: number;
  bottomInset?: number;
  className?: string;
};

export function RouteMap({
  stops,
  blocked = [],
  completedIds = [],
  mode = "overview",
  markerIndex = null,
  selectedId = null,
  onSelect,
  viewHeight: VIEW_H = DEFAULT_VIEW_H,
  topInset = 0,
  bottomInset = 0,
  className = "",
}: Props) {
  const points = WAYPOINTS.slice(0, stops.length + 1);
  const markerAt = markerIndex === null ? null : Math.min(markerIndex, points.length - 1);
  const marker = points[markerAt ?? 0];
  const heading = points[Math.min((markerAt ?? 0) + 1, points.length - 1)];
  const angle =
    heading === marker ? 0 : (Math.atan2(heading.y - marker.y, heading.x - marker.x) * 180) / Math.PI + 90;

  const shownBlocked = blocked.slice(0, BLOCKED_SLOTS.length);
  const selectedStop = stops.findIndex((s) => s.id === selectedId);
  // 그래픽 전체 bounds를 실제로 사용 가능한 영역에 맞춥니다.
  // 선택 강조는 색과 노드로 표시하고, 선택 시에도 라벨은 화면 밖으로 밀지 않습니다.
  let scale: number, tx: number, ty: number;
  const avail = Math.max(1, VIEW_H - topInset - bottomInset);
  const contentW = CONTENT_BOUNDS.right - CONTENT_BOUNDS.left;
  const contentH = CONTENT_BOUNDS.bottom - CONTENT_BOUNDS.top;
  if (mode === "nav") {
    const endpointSide = BUBBLE_SIDE[Math.min(1, BUBBLE_SIDE.length - 1)];
    const routeTop = Math.min(marker.y - 24, heading.y - (endpointSide === "above" ? 62 : 0));
    const routeBottom = Math.max(marker.y + 42, heading.y + (endpointSide === "below" ? 62 : 0));
    const routeLeft = Math.min(marker.x - 40, heading.x - 86);
    const routeRight = Math.max(marker.x + 40, heading.x + 86);
    const routeW = routeRight - routeLeft;
    const routeH = routeBottom - routeTop;
    scale = Math.min(1.1, (VIEW_W - 28) / routeW, (avail - 24) / routeH);
    tx = (VIEW_W - routeW * scale) / 2 - routeLeft * scale;
    ty = topInset + (avail - routeH * scale) / 2 - routeTop * scale;
  } else {
    scale = Math.min(1.08, (VIEW_W - 24) / contentW, (avail - 24) / contentH);
    tx = (VIEW_W - contentW * scale) / 2 - CONTENT_BOUNDS.left * scale;
    ty = topInset + (avail - contentH * scale) / 2 - CONTENT_BOUNDS.top * scale;
  }

  const interactive = Boolean(onSelect);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full touch-manipulation ${className}`}
      role="group"
      aria-label={
        stops.length === 0
          ? "현재 조건으로 표시할 경로가 없습니다."
          : `현재 조건에서 출발하는 독립된 복지 경로 ${stops.length}개${blocked.length ? `, 현재 조건에 맞지 않는 경로 ${blocked.length}개` : ""}`
      }
    >
      <defs>
        <filter id="bubble-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#18232f" floodOpacity="0.14" />
        </filter>
        <pattern id="barrier" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#ffffff" />
          <rect width="4" height="8" fill="var(--blocked)" />
        </pattern>
      </defs>

      <g
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: "transform 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <MapBackground />

        {/* 탐색 지도에서는 각 선택지를 출발 조건에서 독립적으로 갈라 표시합니다. */}
        {mode === "nav" ? (
          <>
            <path d={fullPath(points)} fill="none" stroke="#e3e8e4" strokeWidth={18} strokeLinecap="round" />
            <path d={fullPath(points)} fill="none" stroke="#ffffff" strokeWidth={14} strokeLinecap="round" />
          </>
        ) : stops.map((stop, i) => (
          <path
            key={`branch-${stop.id}`}
            d={`M ${WAYPOINTS[0].x} ${WAYPOINTS[0].y} Q ${(WAYPOINTS[0].x + points[i + 1].x) / 2} ${points[i + 1].y + (i % 2 ? 26 : -26)}, ${points[i + 1].x} ${points[i + 1].y}`}
            fill="none"
            stroke="#dfe8e1"
            strokeWidth={12}
            strokeLinecap="round"
          />
        ))}

        {/* 막힌 길 */}
        {shownBlocked.map((b, i) => {
          const slot = BLOCKED_SLOTS[i];
          const from = mode === "overview" ? WAYPOINTS[0] : WAYPOINTS[slot.from];
          const label = `${b.shortTitle} 막힘`;
          const w = textWidth(label, 11) + 18;
          const selected = b.id === selectedId;
          const select = () => onSelect?.(b.id);
          return (
            <g key={b.id}>
              <line x1={from.x} y1={from.y} x2={slot.to.x} y2={slot.to.y} stroke="#ffffff" strokeWidth={9} strokeLinecap="round" />
              <line
                x1={from.x}
                y1={from.y}
                x2={slot.to.x}
                y2={slot.to.y}
                stroke="var(--blocked)"
                strokeWidth={4}
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity={0.85}
              />
              <g
                transform={`translate(${slot.to.x} ${slot.to.y})`}
                {...(interactive && {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": `${b.shortTitle}, 현재 막힘. ${b.blockedReason ?? ""}`,
                  "aria-pressed": selected,
                  onClick: select,
                  onKeyDown: onActivate(select),
                  className: "cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100",
                })}
              >
                <rect x={-w / 2 - 4} y={Math.min(-14, slot.labelDy - 14)} width={w + 8} height={Math.abs(slot.labelDy) + 28} fill="transparent" />
                <rect x={-13} y={-5} width={26} height={10} rx={2} fill="url(#barrier)" stroke="var(--blocked)" strokeWidth={1.5} />
                <g transform={`translate(${slot.labelDx} ${slot.labelDy})`}>
                  <rect
                    className="focus-ring opacity-0"
                    x={-w / 2 - 3}
                    y={-13}
                    width={w + 6}
                    height={26}
                    rx={13}
                    fill="none"
                    stroke="var(--consult)"
                    strokeWidth={3}
                  />
                  <rect
                    x={-w / 2}
                    y={-10}
                    width={w}
                    height={20}
                    rx={10}
                    fill={selected ? "var(--blocked-text)" : "#ffffff"}
                    stroke="var(--blocked)"
                    strokeWidth={1}
                  />
                  <text textAnchor="middle" y={4} fontSize={11} fontWeight={700} fill={selected ? "#ffffff" : "var(--blocked-text)"}>
                    {label}
                  </text>
                </g>
              </g>
            </g>
          );
        })}

        {/* 복지 경로의 상태. 탐색 지도에서는 서로 연결하지 않습니다. */}
        {stops.map((stop, i) => {
          const meta = STATUS_META[stop.status];
          const done = completedIds.includes(stop.id);
          const dim = selectedStop >= 0 && i !== selectedStop;
          return (
            <path
              key={`seg-${stop.id}`}
              d={mode === "nav"
                ? segmentPath(points, i)
                : `M ${WAYPOINTS[0].x} ${WAYPOINTS[0].y} Q ${(WAYPOINTS[0].x + points[i + 1].x) / 2} ${points[i + 1].y + (i % 2 ? 26 : -26)}, ${points[i + 1].x} ${points[i + 1].y}`}
              fill="none"
              stroke={done ? "#9aa5af" : meta.stroke}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={meta.dash}
              opacity={dim ? 0.45 : 1}
              style={{ transition: "opacity 300ms" }}
            />
          );
        })}

        {/* 출발점: 현재 조건 */}
        <g transform={`translate(${WAYPOINTS[0].x} ${WAYPOINTS[0].y})`} aria-hidden="true">
          <rect x={-13} y={-13} width={26} height={26} rx={8} fill="#18232f" />
          <circle cx={0} cy={-3} r={3.6} fill="none" stroke="#ffffff" strokeWidth={2} />
          <path d="M -6.5 7 a 6.5 5.5 0 0 1 13 0" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
          {mode === "overview" && (
            <g transform="translate(0 32)">
              <rect x={-31} y={-10} width={62} height={20} rx={10} fill="#ffffff" stroke="#18232f" strokeWidth={1.2} />
              <text textAnchor="middle" y={4} fontSize={11} fontWeight={800} fill="#18232f">
                현재 조건
              </text>
            </g>
          )}
        </g>

        {/* 지점 핀과 말풍선 */}
        {stops.map((stop, i) => {
          const p = points[i + 1];
          const meta = STATUS_META[stop.status];
          const done = completedIds.includes(stop.id);
          const selected = stop.id === selectedId;
          const isLast = mode === "nav" && i === stops.length - 1;
          const side = BUBBLE_SIDE[i + 1];
          const title = stop.shortTitle;
          const sub = done ? "안내 지남" : statusLabel(stop);
          const w = Math.max(textWidth(title, 12), textWidth(sub, 11) + 14) + 20;
          const h = 38;
          const bx = Math.min(Math.max(p.x - w / 2, 6), VIEW_W - 6 - w);
          const by = side === "above" ? p.y - 24 - h : p.y + 24;
          const tailY = side === "above" ? by + h : by;
          const tailDir = side === "above" ? 1 : -1;
          const select = () => onSelect?.(stop.id);
          return (
            <g
              key={`pin-${stop.id}`}
              {...(interactive && {
                role: "button",
                tabIndex: 0,
                "aria-label": `${stop.title}, ${statusLabel(stop)}`,
                "aria-pressed": selected,
                onClick: select,
                onKeyDown: onActivate(select),
                className: "cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100",
              })}
            >
              {isLast && (
                <g transform={`translate(${p.x + 16} ${p.y + 4})`} aria-hidden="true">
                  <line x1={0} y1={0} x2={0} y2={-28} stroke="#18232f" strokeWidth={2.5} strokeLinecap="round" />
                  <path d="M 0 -28 L 18 -23 L 0 -16 Z" fill="var(--brand)" />
                </g>
              )}
              <g filter="url(#bubble-shadow)">
                <rect
                  x={bx}
                  y={by}
                  width={w}
                  height={h}
                  rx={10}
                  fill="#ffffff"
                  stroke={selected ? meta.stroke : "none"}
                  strokeWidth={selected ? 2 : 0}
                />
                <path d={`M ${p.x - 6} ${tailY} L ${p.x} ${tailY + tailDir * 7} L ${p.x + 6} ${tailY} Z`} fill="#ffffff" />
              </g>
              <text x={bx + 10} y={by + 16} fontSize={12} fontWeight={800} fill="var(--ink)">
                {title}
              </text>
              <circle cx={bx + 14} cy={by + 28} r={4} fill={done ? "#9aa5af" : meta.stroke} />
              <text x={bx + 22} y={by + 32} fontSize={11} fontWeight={700} fill={done ? "var(--muted)" : meta.text}>
                {sub}
              </text>

              {/* 44px 이상 터치 영역 */}
              <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
              <circle className="focus-ring opacity-0" cx={p.x} cy={p.y} r={23} fill="none" stroke="var(--consult)" strokeWidth={3} />
              {selected && <circle cx={p.x} cy={p.y} r={22} fill={meta.stroke} opacity={0.22} />}
              <circle
                cx={p.x}
                cy={p.y}
                r={selected ? 16 : 15}
                fill={done ? "#6b7783" : "#ffffff"}
                stroke={done ? "#6b7783" : meta.stroke}
                strokeWidth={selected ? 5 : 4}
              />
              {done ? (
                <path d={`M ${p.x - 6} ${p.y} l 4 4 l 8 -9`} fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={meta.text}>
                  {stop.status === "available" ? "✓" : stop.status === "consult" ? "?" : "◷"}
                </text>
              )}
            </g>
          );
        })}

        {/* 진행 위치 마커 */}
        {markerAt !== null && (
          <g
            aria-hidden="true"
            style={{
              transform: `translate(${marker.x}px, ${marker.y}px)`,
              transition: "transform 900ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <circle r={22} fill="var(--brand)" opacity={0.16} />
            <circle r={13} fill="var(--brand)" stroke="#ffffff" strokeWidth={3} />
            <g style={{ transform: `rotate(${angle}deg)`, transition: "transform 900ms ease" }}>
              <path d="M 0 -7 L 5.5 5 L 0 2.2 L -5.5 5 Z" fill="#ffffff" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}

/** 지리 정보가 없는 개념도라 도로처럼 보이는 장식은 쓰지 않습니다. */
function MapBackground() {
  return (
    <g aria-hidden="true">
      <rect x={-400} y={-400} width={VIEW_W + 800} height={DEFAULT_VIEW_H + 800} fill="#f3f6f4" />
      <ellipse cx={88} cy={150} rx={58} ry={40} fill="#e3f1e6" />
      <ellipse cx={346} cy={318} rx={56} ry={44} fill="#e3f1e6" />
    </g>
  );
}
