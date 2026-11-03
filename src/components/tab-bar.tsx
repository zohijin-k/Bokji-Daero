"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MapIcon, RouteIcon, UserIcon } from "./icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/map", label: "복지지도", Icon: MapIcon },
  { href: "/route", label: "내 경로", Icon: RouteIcon },
  { href: "/my", label: "내 조건", Icon: UserIcon },
] as const;

export const TAB_BAR_HEIGHT = 64;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:max-w-[390px]"
    >
      <ul className="grid h-16 grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
