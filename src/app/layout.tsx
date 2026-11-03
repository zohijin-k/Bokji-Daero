import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/tab-bar";
import { AppStateProvider } from "@/lib/state/app-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "복지대로 · 시연용 프로토타입",
  description: "실직한 1인 가구를 위한 복지 경로 안내 시연용 프로토타입. 판정 결과는 예상 정보입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b7a4b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <AppStateProvider>
          <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-surface shadow-[0_0_40px_rgba(23,33,43,0.08)] md:max-w-[390px]">
            {children}
          </div>
          <TabBar />
        </AppStateProvider>
      </body>
    </html>
  );
}
