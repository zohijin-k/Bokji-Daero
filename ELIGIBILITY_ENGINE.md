# Eligibility engine

## Current architecture

The app has two layers that must not be confused:

1. `src/lib/engine/evaluate.ts` assembles independently selectable benefit routes and their existing demo statuses.
2. `src/lib/engine/kuksi1-assessment.ts` screens 국민취업지원제도 I유형 using versioned official criteria, captured user values, and per-condition evidence.
3. `src/lib/data/official-benefits.ts` reads the 2026-08-19 official central-ministry CSV snapshot for the searchable `/official-data` directory. That catalog is a source of service descriptions, not person-level eligibility rules.

The route UI still has legacy display states (`available`, `consult`, `waiting`, `blocked`). For I유형, a confirmed exclusion maps to `blocked`; every other result maps to `consult`, including `LIKELY_ELIGIBLE`. The UI therefore does not turn a rule-based screen into confirmed eligibility or an open application status. `intakeStatus` remains `unknown` and is separate from the user's local progress record.

## I-type verdicts

| Verdict | Meaning |
|---|---|
| `LIKELY_ELIGIBLE` | All modeled core checks have known, compatible values. It is still not an official decision. |
| `NEEDS_MORE_INFO` | At least one required value is missing or unknown, and no known failing condition has already been found. |
| `CURRENTLY_INELIGIBLE` | At least one known restriction or required condition currently fails. A met condition cannot cancel it. |
| `UNKNOWN` | Reserved for cases where the governing rule set itself cannot be validated. |

The current checked 2026 rule set covers age 15–69; household income at or below 60% of 2026 median income (with household size); household assets at or below 400 million KRW, or 500 million KRW for ages 15–34; recent work experience thresholds (100 days or 800 hours) and the non-economic-activity selection route; the applicant's own monthly-average-income exclusion shown by Work24; known current-employment exceptions; work ability and job-search intent; schooling restrictions; other public job-search support restrictions; and the unemployment-benefit restriction.

For 구직급여, receiving it now or ending it less than six months ago is `CURRENTLY_INELIGIBLE` for the present. Once six months have elapsed, only that condition becomes met. Other missing conditions still produce `NEEDS_MORE_INFO`; the result never auto-promotes to eligible because time passed.

## Inputs and measurement

The previous single `income` demo value is not used by the I-type assessment. I-type inputs are separated into exact age, household size, household monthly income used for the median-income screen, household assets, applicant's own monthly-average income, recent work days/hours, current work status, capacity and intent, schooling, and other restriction checks. Unknown values remain unknown. Monthly wage, household income, and income-recognized amount are not treated as interchangeable.

Other benefit routes still use the pre-existing demonstration `income` field and thresholds. Those remain unverified demo rules and are marked as such in the existing rationale UI; this sprint does not make them official determinations.

## Evidence and provenance

Each I-type `AssessmentCondition` records:

- stable condition ID and readable name;
- user value;
- applied rule text;
- `met`, `unmet`, or `unknown` result and missing-information reason;
- official source name and URL;
- effective date only when the source specifies it;
- last checked date.

The route rationale renders these values and source links. Condition evidence, eligibility verdict, application intake status, and local user progress are distinct. The assessment does not claim that a user has applied or been approved.

## Changes and limitations

- Rule values live in the versioned assessment module rather than the general demo rules file.
- Source review dates and the effective year are explicit; changes require a code/data update and the boundary test suite.
- Local storage remains version 1 and old records load with an empty I-type profile; existing completed IDs and progress are preserved.
- The work-history selection branch, exceptions and self-reported status need confirmation by the employment center. The model does not reproduce the agency's full administrative evaluation.
- The profile currently depends on user-entered values; no government identity or income verification is integrated.
- The CSV/OpenAPI catalog is discovery metadata. It is not a sufficient source for I-type eligibility, and no catalog text is executed as rules.
- Sprint 2 imported 461 real CSV records and connected their names, summaries, departments, basis years and Bokjiro links to a separate discovery screen. This collection does not change any recommendation verdict.
- No rule can determine the official application result. The final decision and current intake availability must be confirmed with 고용24/고용센터.
