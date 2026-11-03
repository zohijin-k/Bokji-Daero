import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-64px)] flex-col justify-center px-4 py-10">
      <h1 className="text-[22px] font-extrabold text-ink">찾는 화면이 없어요</h1>
      <p className="mt-1 text-[15px] text-muted">주소가 바뀌었거나 없는 화면이에요. 홈에서 다시 시작해 주세요.</p>
      <LinkButton href="/" className="mt-6">
        홈으로
      </LinkButton>
    </main>
  );
}
