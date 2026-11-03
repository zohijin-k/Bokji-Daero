# Official data sources and current ingestion evidence

## Actual official CSV collected

| Item | Verified value |
|---|---|
| Data name | 한국사회보장정보원_복지서비스정보 |
| Provider | 한국사회보장정보원 (공공데이터포털 dataset 15083323) |
| Official source | [Dataset page and download](https://www.data.go.kr/data/15083323/fileData.do) · [catalog metadata](https://www.data.go.kr/catalog/15083323/fileData.json) |
| Source file | `한국사회보장정보원_복지서비스정보_20260819.csv` |
| Source data date | 2026-08-19 |
| Retrieved by this project | 2026-11-03T02:57:06.309Z (UTC) |
| Source and normalized record count | 461 rows / 461 unique normalized services |
| Raw copy | `data/raw/central-welfare-2026-11-03-218902df5786.csv` |
| SHA-256 | `218902df578697931ef53bc359ef057a3f1fec4caa521690b7a4e89c40bf8442` |
| Encoding | UTF-8; decoded with fatal error handling |
| Actual API request | No. A public CSV download succeeded; OpenAPI credentials were not used. |

The official page says the file can be downloaded without login. The file downloaded in this sprint has the verified headers `서비스아이디`, `서비스명`, `서비스URL`, `서비스요약`, `사이트`, `대표문의`, `소관부처명`, `소관조직명`, `기준연도`, `최종수정일`. The catalog notes that its point-in-time snapshot can differ from current Bokjiro information.

### Fields used in the app

`서비스아이디` → `benefitId`; `서비스명` → `benefitName`; `서비스요약` → `summary`; `서비스URL` → `serviceDetailUrl`; `사이트` → `relatedSite`; `대표문의` → `contact`; `소관부처명` → `responsibleDepartment`; `소관조직명` → `responsibleOrganization`; `기준연도` → `sourceBasisYear`; `최종수정일` → `sourceLastModified`.

The CSV provides a brief service summary and an official Bokjiro detail URL. It does not provide separate verified fields for a person's eligibility, selection rules, exclusions, required documents, application method, application intake, or effective dates. Those fields stay `null` or `unknown`. Summary text is shown as service information only and is never converted into a rule. `verifiedAt` also remains `null`; retrieving a source file does not verify each policy's current eligibility criteria.

### Validation results for this snapshot

- Source rows: 461; normalized unique services: 461.
- Rows rejected for a missing service ID or name: 0.
- Duplicate IDs: 0.
- Missing summaries: 0; missing service detail URLs: 0.
- Invalid HTTP/HTTPS URL formats: 0.
- Character encoding: the whole CSV decoded as strict UTF-8 without replacement characters.
- A GET request to the 국민취업지원제도 detail URL for `WLF00003245` returned HTTP 200 on 2026-11-03. All links were syntax-checked; the other 460 links were not individually requested.
- The importer records per-source `최종수정일`; it does not assume that this is the same as a rule's effective date.

## How official data appears in the service

The homepage links to `/official-data`, a searchable directory backed by the checked-in normalized official snapshot. It displays the service name, summary, responsible ministry, source basis year, service ID, collection/source dates, provider, and the original Bokjiro detail link. Each item is labelled official catalog information and states that the catalog does not establish personal eligibility or intake status.

This directory is separate from the recommendation result. The general benefit routes still use the existing demonstration rules. The 국민취업지원제도 I-type assessment continues to use its separately verified, conservative Work24/MOHW rules. No catalog summary is used as an eligibility rule, and the CSV does not automatically make a person-specific recommendation.

## Reproduce the import

1. Run `npm run data:download`. It reads the current version and download metadata from the official dataset page and stores the actual CSV under `data/inbox/`. If the portal changes its page structure or applies a download limit, download manually from the linked source page.
2. Run `npm run data:import -- data/inbox/한국사회보장정보원_복지서비스정보_YYYYMMDD.csv`.
3. The importer keeps the original bytes in `data/raw/`, calculates SHA-256, strictly decodes UTF-8, normalizes only documented headers, deduplicates by service ID, writes `data/normalized/central-welfare-latest.json` and a dated snapshot, and writes a change/validation report under `data/changes/`.
4. `retrievedAt` is the actual import time. The source filename date is stored separately as `sourceDataDate`. Dates not present as an effective date stay `null`.
5. The app uses the checked-in `central-welfare-latest.json`; a future refresh must review the generated diff and rerun the snapshot integration tests before deployment.

The refresh process is manual in this sprint. The CSV is listed as annual and the portal currently lists the next registration date as 2027-08-27. Refreshing is not a background/live API operation.

## OpenAPI connection status

The [중앙부처 복지서비스 OpenAPI](https://www.data.go.kr/data/15090532/openapi.do) catalog describes a REST/XML list and detail service from 한국사회보장정보원 / 복지로. Its schema and operation path are not used by this release: no API key was configured, no API request was made, and no response fields were inferred. The existing `scripts/fetch-central-welfare-api.mjs` remains a server-side raw XML fetcher requiring `WELFARE_API_KEY` and an operation copied from the official Swagger/guide; it does not claim a live integration.

The candidate local-government welfare API was not connected. It needs a separate verified schema and dataset review before use.

## Other policy sources and implementation state

| Source / feature | Status | Use |
|---|---|---|
| Central ministry welfare CSV | Actual collected and normalized | 461 official service metadata records are browsable in `/official-data`. |
| Central ministry welfare OpenAPI | Not connected | Existing server-only raw collector is prepared; key and operation are not configured. |
| Work24 I-type guidance | Reviewed for the I-type rules | Used by the separate conservative eligibility assessment; final decision stays with the employment center. |
| 2026 MOHW median income | Reviewed for 2026 household comparison | Used only by I-type assessment. |
| Other benefit thresholds | Demo rules | Not populated from the official CSV and remain marked for official verification. |
| Optional AI explanation | Server-side Responses API implementation present; live call not verified because this workspace has no `OPENAI_API_KEY` | Explains a server-recomputed result only; does not determine eligibility. See `AI_IMPLEMENTATION.md` and `AI_EVALUATION.md`. |

## Coverage limitations

This sprint proves a public official CSV can be collected, normalized, searched, shown with its source, and kept separate from the eligibility engine. It does not prove an OpenAPI connection, current individual qualification, selection criteria for all catalog entries, or an up-to-date application intake state. The catalog is a dated snapshot and may lag current Bokjiro pages.
