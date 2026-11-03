"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";
import { Button, LinkButton } from "@/components/ui";
import { useAppState } from "@/lib/state/app-state";

export default function Error({ error, reset }: { error: unknown; reset: () => void }) {
  const { resetAll } = useAppState();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100dvh-64px)] flex-col justify-center px-4 py-10">
      <AlertIcon size={40} className="text-wait-text" />
      <h1 className="mt-3 text-[22px] font-extrabold text-ink">경로를 계산하지 못했어요</h1>
      <p className="mt-1 text-[15px] text-muted">
        화면을 그리는 중에 문제가 생겼어요. 입력한 조건은 서버로 보내지 않았어요.
      </p>
      <div className="mt-6 grid gap-2">
        <Button onClick={() => reset()}>다시 시도</Button>
        <Button
          variant="secondary"
          onClick={() => {
            resetAll();
            reset();
          }}
        >
          기본 조건으로 다시 시작
        </Button>
        <LinkButton href="/" variant="ghost">
          홈으로
        </LinkButton>
      </div>
    </main>
  );
}
