import Link from "next/link";
import { OFFICIAL_BENEFIT_SNAPSHOT, searchOfficialBenefits } from "@/lib/data/official-benefits";

const PAGE_SIZE = 20;

export const instant = false;

export default async function OfficialDataPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim().slice(0, 100);
  const matches = searchOfficialBenefits(query, PAGE_SIZE + 1);
  const hasMore = matches.length > PAGE_SIZE;
  const records = matches.slice(0, PAGE_SIZE);
  const retrievedDate = OFFICIAL_BENEFIT_SNAPSHOT.retrievedAt.slice(0, 10);

  return (
    <main className="min-h-dvh bg-page px-4 pb-10 pt-4 text-ink">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-[14px] font-bold text-brand-text">← 복지대로 홈</Link>
        <span className="rounded-full bg-brand-tint px-3 py-1 text-[12px] font-extrabold text-brand-text">공식 데이터</span>
      </header>

      <section className="mx-auto mt-6 max-w-2xl">
        <h1 className="text-[24px] font-extrabold tracking-tight">중앙부처 복지서비스</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          한국사회보장정보원이 제공한 공식 복지서비스 목록입니다. 이 목록은 제도 정보를 찾기 위한 자료이며,
          개인별 자격 판정이나 접수 가능 여부를 뜻하지 않습니다.
        </p>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-3 text-[13px] text-muted">
          <p><strong className="text-ink">원본 기준일</strong> {OFFICIAL_BENEFIT_SNAPSHOT.sourceDataDate ?? "미기록"}</p>
          <p className="mt-1"><strong className="text-ink">복지대로 수집일</strong> {retrievedDate}</p>
          <p className="mt-1"><strong className="text-ink">수집 레코드</strong> {OFFICIAL_BENEFIT_SNAPSHOT.records.length.toLocaleString("ko-KR")}건 · 제공기관 {OFFICIAL_BENEFIT_SNAPSHOT.dataset.provider}</p>
        </div>

        <form action="/official-data" method="get" className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor="official-benefit-query">제도명·내용·소관 부처 검색</label>
          <input
            id="official-benefit-query"
            name="q"
            defaultValue={query}
            placeholder="제도명, 내용, 소관 부처 검색"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[15px] outline-none focus:border-brand"
          />
          <button className="min-h-12 rounded-xl bg-ink px-4 text-[14px] font-bold text-white">검색</button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
          <p>{query ? `“${query}” 검색 결과` : "전체 제도"}: {query ? `${matches.length > PAGE_SIZE ? `${PAGE_SIZE}+` : matches.length}건` : `${records.length}건 표시`}</p>
          {query && <Link href="/official-data" className="font-bold text-brand-text">검색 초기화</Link>}
        </div>

        {records.length > 0 ? (
          <ul className="mt-2 space-y-3">
            {records.map((record) => (
              <li key={record.benefitId} className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_rgba(24,35,47,0.04)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-extrabold text-brand-text">공식 목록 정보</span>
                  <span className="text-[12px] text-muted">{record.responsibleDepartment ?? "소관부처 미기록"}</span>
                </div>
                <h2 className="mt-2 text-[17px] font-extrabold leading-snug">{record.benefitName}</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{record.summary ?? "공식 요약 미제공"}</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3 text-[12px] text-muted">
                  <span>기준연도 {record.sourceBasisYear ?? "미기록"} · 최종 수정 {record.sourceLastModified ?? "미기록"} · ID {record.benefitId}</span>
                  {record.serviceDetailUrl && (
                    <a href={record.serviceDetailUrl} target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center font-bold text-brand-text underline underline-offset-2">
                      복지로 공식 상세 안내 ↗
                    </a>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-wait-text">개인 자격·선정 기준·접수 상태는 이 목록에서 확인되지 않습니다.</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">검색 결과가 없습니다.</p>
        )}

        {hasMore && <p className="mt-3 text-center text-[13px] text-muted">더 구체적으로 검색해 결과를 좁혀 주세요. 한 번에 최대 {PAGE_SIZE}건을 표시합니다.</p>}

        <footer className="mt-6 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
          출처: <a href={OFFICIAL_BENEFIT_SNAPSHOT.dataset.datasetUrl} target="_blank" rel="noreferrer" className="font-semibold underline">{OFFICIAL_BENEFIT_SNAPSHOT.dataset.name}</a>
          <span> · 원본 파일: {OFFICIAL_BENEFIT_SNAPSHOT.sourceFileName ?? "파일명 미기록"}</span>
          <p className="mt-1">지원 대상과 선정 기준의 자세한 내용은 각 항목의 복지로 공식 안내에서 확인하세요. 이 데이터는 추천 엔진의 개인별 판정 규칙으로 사용되지 않습니다.</p>
        </footer>
      </section>
    </main>
  );
}
