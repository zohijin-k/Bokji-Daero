import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// 공통 버튼, 카드, 하단 고정 바. 모든 화면이 같은 규격을 씁니다.

type Variant = "primary" | "secondary" | "dark" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-[#066f43]",
  secondary: "border border-line bg-surface text-ink hover:bg-sub",
  dark: "bg-ink text-white",
  ghost: "text-brand-text hover:bg-brand-tint",
};

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[14px] px-4 text-[16px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[18px] border border-line bg-surface ${className}`}>{children}</div>;
}

/** 하단 탭 바 바로 위에 고정되는 행동 버튼 영역 */
export function BottomBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:max-w-[390px] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[17px] font-extrabold text-ink">
      {children}
    </h2>
  );
}
