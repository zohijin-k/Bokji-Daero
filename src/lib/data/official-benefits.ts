import snapshotJson from "../../../data/normalized/central-welfare-latest.json";
import type { NormalizedSnapshot } from "./benefit-catalog";

export const OFFICIAL_BENEFIT_SNAPSHOT = snapshotJson as NormalizedSnapshot;

export function searchOfficialBenefits(query: string, limit = 20) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const matches = normalizedQuery
    ? OFFICIAL_BENEFIT_SNAPSHOT.records.filter((record) =>
        [record.benefitName, record.summary, record.responsibleDepartment, record.responsibleOrganization]
          .some((value) => value?.toLocaleLowerCase("ko-KR").includes(normalizedQuery)),
      )
    : OFFICIAL_BENEFIT_SNAPSHOT.records;
  return matches.slice(0, Math.max(0, limit));
}
