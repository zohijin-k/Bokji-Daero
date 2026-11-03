export const CENTRAL_WELFARE_DATASET = {
  name: "한국사회보장정보원_복지서비스정보",
  provider: "한국사회보장정보원",
  datasetUrl: "https://www.data.go.kr/data/15083323/fileData.do",
  encoding: "CSV",
} as const;

/** 공공데이터포털 CSV에서 확인된 헤더만 매핑합니다. */
export type CentralWelfareCsvRow = Record<string, string>;

export type NormalizedBenefit = {
  benefitId: string;
  benefitName: string;
  provider: string | null;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  verifiedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  eligibilityRules: string[] | null;
  exclusionRules: string[] | null;
  requiredInformation: string[] | null;
  applicationMethod: string | null;
  applicationUrl: string | null;
  intakeStatus: "unknown";
  dataConfidence: "source_metadata_only";
  verificationStatus: "unverified";
  summary: string | null;
  serviceDetailUrl: string | null;
  relatedSite: string | null;
  contact: string | null;
  responsibleDepartment: string | null;
  responsibleOrganization: string | null;
  sourceBasisYear: number | null;
  sourceLastModified: string | null;
};

export type NormalizedSnapshot = {
  dataset: typeof CENTRAL_WELFARE_DATASET;
  retrievedAt: string;
  sourceFileName: string | null;
  sourceDataDate: string | null;
  sourceRecordCount: number;
  records: NormalizedBenefit[];
  validation: {
    rejectedMissingIdentity: number;
    duplicateIdCount: number;
    invalidServiceUrlCount: number;
    missingSummaryCount: number;
    missingServiceUrlCount: number;
  };
};

export type SnapshotDiff = { added: string[]; removed: string[]; modified: string[] };

export type DataSourceFailureStatus = {
  status: "api_error" | "import_failed";
  observedAt: string;
  message: string;
  lastGoodSnapshotAt: string | null;
  staleSnapshotAvailable: boolean;
};

export function diffNormalizedSnapshots(
  previous: NormalizedSnapshot | null,
  current: NormalizedSnapshot,
): SnapshotDiff {
  const oldById = new Map((previous?.records ?? []).map((record) => [record.benefitId, record]));
  const newById = new Map(current.records.map((record) => [record.benefitId, record]));
  const stable = (record: NormalizedBenefit) => JSON.stringify({ ...record, retrievedAt: null });
  return {
    added: current.records.filter((record) => !oldById.has(record.benefitId)).map((record) => record.benefitId),
    removed: (previous?.records ?? []).filter((record) => !newById.has(record.benefitId)).map((record) => record.benefitId),
    modified: current.records.filter((record) => {
      const old = oldById.get(record.benefitId);
      return old !== undefined && stable(old) !== stable(record);
    }).map((record) => record.benefitId),
  };
}

export function createDataSourceFailureStatus(
  status: DataSourceFailureStatus["status"],
  observedAt: string,
  message: string,
  lastGoodSnapshotAt: string | null,
): DataSourceFailureStatus {
  return { status, observedAt, message, lastGoodSnapshotAt, staleSnapshotAvailable: lastGoodSnapshotAt !== null };
}

function value(row: CentralWelfareCsvRow, key: string): string | null {
  const found = row[key]?.trim();
  return found ? found : null;
}

function parsedYear(input: string | null): number | null {
  if (!input) return null;
  const match = input.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

/**
 * Maps only fields documented by the official CSV catalog. This source contains
 * summary metadata, not eligibility rules or application intake state.
 */
export function normalizeCentralWelfareRow(
  row: CentralWelfareCsvRow,
  retrievedAt: string,
): NormalizedBenefit | null {
  const benefitId = value(row, "서비스아이디");
  const benefitName = value(row, "서비스명");
  if (!benefitId || !benefitName) return null;
  const basis = value(row, "기준연도");

  return {
    benefitId,
    benefitName,
    provider: CENTRAL_WELFARE_DATASET.provider,
    sourceName: CENTRAL_WELFARE_DATASET.name,
    sourceUrl: CENTRAL_WELFARE_DATASET.datasetUrl,
    retrievedAt,
    verifiedAt: null,
    effectiveFrom: null,
    effectiveTo: null,
    eligibilityRules: null,
    exclusionRules: null,
    requiredInformation: null,
    applicationMethod: null,
    applicationUrl: null,
    intakeStatus: "unknown",
    dataConfidence: "source_metadata_only",
    verificationStatus: "unverified",
    summary: value(row, "서비스요약"),
    serviceDetailUrl: value(row, "서비스URL"),
    relatedSite: value(row, "사이트"),
    contact: value(row, "대표문의"),
    responsibleDepartment: value(row, "소관부처명"),
    responsibleOrganization: value(row, "소관조직명"),
    sourceBasisYear: parsedYear(basis),
    sourceLastModified: value(row, "최종수정일"),
  };
}

export function normalizeCentralWelfareRows(
  rows: CentralWelfareCsvRow[],
  retrievedAt: string,
  sourceFileName: string | null = null,
): NormalizedSnapshot {
  const byId = new Map<string, NormalizedBenefit>();
  let rejectedMissingIdentity = 0;
  let duplicateIdCount = 0;
  for (const row of rows) {
    const record = normalizeCentralWelfareRow(row, retrievedAt);
    if (!record) {
      rejectedMissingIdentity += 1;
      continue;
    }
    if (byId.has(record.benefitId)) duplicateIdCount += 1;
    byId.set(record.benefitId, record);
  }
  const records = [...byId.values()];
  const validServiceUrl = (url: string | null) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };
  const dateMatch = sourceFileName?.match(/(20\d{2})(\d{2})(\d{2})/);
  return {
    dataset: CENTRAL_WELFARE_DATASET,
    retrievedAt,
    sourceFileName,
    sourceDataDate: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null,
    sourceRecordCount: rows.length,
    records,
    validation: {
      rejectedMissingIdentity,
      duplicateIdCount,
      invalidServiceUrlCount: records.filter((record) => record.serviceDetailUrl && !validServiceUrl(record.serviceDetailUrl)).length,
      missingSummaryCount: records.filter((record) => record.summary === null).length,
      missingServiceUrlCount: records.filter((record) => record.serviceDetailUrl === null).length,
    },
  };
}
