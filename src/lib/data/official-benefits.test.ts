import { describe, expect, it } from "vitest";
import { OFFICIAL_BENEFIT_SNAPSHOT, searchOfficialBenefits } from "./official-benefits";

describe("공식 중앙부처 복지서비스 스냅샷", () => {
  it("수집된 실제 공식 레코드와 출처 시점을 보존", () => {
    expect(OFFICIAL_BENEFIT_SNAPSHOT.dataset.name).toBe("한국사회보장정보원_복지서비스정보");
    expect(OFFICIAL_BENEFIT_SNAPSHOT.sourceDataDate).toBe("2026-08-19");
    expect(OFFICIAL_BENEFIT_SNAPSHOT.sourceFileName).toBe("한국사회보장정보원_복지서비스정보_20260819.csv");
    expect(OFFICIAL_BENEFIT_SNAPSHOT.sourceRecordCount).toBe(461);
    expect(OFFICIAL_BENEFIT_SNAPSHOT.records).toHaveLength(461);
    expect(OFFICIAL_BENEFIT_SNAPSHOT.records[0].benefitId).toBe("WLF00000022");
    expect(OFFICIAL_BENEFIT_SNAPSHOT.records[0].verifiedAt).toBeNull();
    expect(OFFICIAL_BENEFIT_SNAPSHOT.validation).toEqual({
      rejectedMissingIdentity: 0,
      duplicateIdCount: 0,
      invalidServiceUrlCount: 0,
      missingSummaryCount: 0,
      missingServiceUrlCount: 0,
    });
  });

  it("공식 카탈로그 검색 결과를 개인 자격판정 데이터와 분리해 제공", () => {
    const results = searchOfficialBenefits("아이돌봄서비스", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].benefitName).toContain("아이돌봄서비스");
    expect(results[0].eligibilityRules).toBeNull();
    expect(results[0].verificationStatus).toBe("unverified");
  });
});
