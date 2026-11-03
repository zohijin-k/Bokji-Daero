import { describe, expect, it } from "vitest";
import {
  createDataSourceFailureStatus,
  diffNormalizedSnapshots,
  normalizeCentralWelfareRows,
} from "./benefit-catalog";

const row = (overrides: Record<string, string> = {}) => ({
  "서비스아이디": "CSV-001",
  "서비스명": "공식 카탈로그 서비스",
  "서비스URL": "https://www.bokjiro.go.kr/",
  "서비스요약": "공식 CSV 요약",
  "사이트": "복지로",
  "대표문의": "0000",
  "소관부처명": "정부 부처",
  "소관조직명": "담당 조직",
  "기준연도": "2026",
  "최종수정일": "2026-09-01",
  ...overrides,
});

describe("한국사회보장정보원 카탈로그 정규화", () => {
  it("확인한 CSV 헤더만 옮기고 원천에 없는 자격·접수 필드는 null로 둠", () => {
    const snapshot = normalizeCentralWelfareRows([row()], "2026-11-03T00:00:00.000Z");
    const record = snapshot.records[0];
    expect(record.benefitId).toBe("CSV-001");
    expect(record.sourceBasisYear).toBe(2026);
    expect(record.retrievedAt).toBe("2026-11-03T00:00:00.000Z");
    expect(record.verifiedAt).toBeNull();
    expect(record.effectiveFrom).toBeNull();
    expect(record.eligibilityRules).toBeNull();
    expect(record.applicationUrl).toBeNull();
    expect(record.intakeStatus).toBe("unknown");
    expect(record.dataConfidence).toBe("source_metadata_only");
  });

  it("ID와 제도명이 없는 행을 버리고 원본을 추정해 채우지 않음", () => {
    expect(normalizeCentralWelfareRows([{ "서비스명": "이름만" }], "2026-11-03T00:00:00.000Z").records).toEqual([]);
  });

  it("중복 ID는 한 건으로 처리하고 검증 지표에 남김", () => {
    const snapshot = normalizeCentralWelfareRows([row(), row({ "서비스요약": "두 번째 원본 행" })], "2026-11-03T00:00:00.000Z");
    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.records[0].summary).toBe("두 번째 원본 행");
    expect(snapshot.validation.duplicateIdCount).toBe(1);
  });

  it("갱신 비교는 retrievedAt 차이는 무시하고 내용 변경만 추적", () => {
    const before = normalizeCentralWelfareRows([row()], "2026-11-02T00:00:00.000Z");
    const same = normalizeCentralWelfareRows([row()], "2026-11-03T00:00:00.000Z");
    const changed = normalizeCentralWelfareRows([row({ "서비스요약": "수정된 요약" })], "2026-11-03T00:00:00.000Z");
    expect(diffNormalizedSnapshots(before, same)).toEqual({ added: [], removed: [], modified: [] });
    expect(diffNormalizedSnapshots(before, changed)).toEqual({ added: [], removed: [], modified: ["CSV-001"] });
  });

  it("API 수집 실패를 오류로 표시하면서 마지막 정상 스냅샷 정보를 보존", () => {
    expect(createDataSourceFailureStatus("api_error", "2026-11-03T00:00:00.000Z", "timeout", "2026-11-02T00:00:00.000Z")).toEqual({
      status: "api_error",
      observedAt: "2026-11-03T00:00:00.000Z",
      message: "timeout",
      lastGoodSnapshotAt: "2026-11-02T00:00:00.000Z",
      staleSnapshotAvailable: true,
    });
  });
});
