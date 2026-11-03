# AI evaluation and demonstration evidence

## What was verified in this repository

Automated tests exercise deterministic server-side context construction and safety boundaries without calling an external model. They cover the ten requested scenarios:

| Scenario | Automated verification |
|---|---|
| All required I-type values are present and satisfy the engine's checks | Assessment remains `LIKELY_ELIGIBLE`, which still requires official review. |
| A required condition is unmet | The unmet evidence is preserved and cannot be upgraded by model output. |
| Required information is missing | Assessment stays `NEEDS_MORE_INFO`; the missing condition can be returned only by its approved ID. |
| Unemployment benefit is active | Existing engine reports the restriction; explanation cannot change the status. |
| Benefit ended three months ago | Six-month restriction remains in force. |
| Benefit ended at least six months ago | Elapsed time does not approve; other missing requirements remain visible. |
| Household size is unknown | Household income threshold cannot be safely compared and remains unconfirmed. |
| Income versus recognized income | Only explicit profile fields and their documented rule context are used; the general income slider cannot substitute for household income. |
| Reference year is unknown | Year-sensitive comparison remains unconfirmed. |
| Official catalog changes or fails to refresh | The checked-in catalog summary stays an `overview_only` source with no `verifiedAt`; it is not promoted to an eligibility rule. Data refresh and AI call failures do not create fabricated model content. |

The current AI test file also verifies minimal payload projection, rejection of direct/free-text or forged fields, rejection of unsupported model URLs/actions, server-owned source URL mapping, strict request options, and request limiting. The full test suite result is recorded below after running the repository commands.

## Live model evaluation status

No OpenAI key is configured in this workspace, so the live API-call count is **0** and model-response quality is **not measured**. The automated scenarios above test the rules/context and output-validation code; they do not prove that a provider call succeeds or that model explanations are consistently useful. No participant A/B or production evaluation has been performed.

Do not present the model as live in a demonstration until a server-side key is configured and these steps pass:

1. Start the app with `OPENAI_API_KEY` set only in the server environment.
2. Opt in on a selected route and verify a real response from `POST /api/ai-guidance`.
3. Confirm the response keeps the server-computed assessment status unchanged, cites only server-owned source references, and contains no new criteria, dates, amounts, or URLs.
4. Repeat for I-type cases: all known checks met, one failed condition, missing household size/year, active unemployment benefit, three months after end, and six or more months after end with another missing condition.
5. Remove the key or make the provider unavailable and verify the explicit unavailable state with deterministic route guidance preserved.
6. Review consent language and provider account data-handling settings for the deployment before using real personal information.

Record the test date, model identifier, anonymized case ID, pass/fail for each output check, and failure category. Do not store raw profile data or API responses in a public evidence document.

## Current implementation verification

- Unit tests: run result is reported in the task completion message.
- ESLint: run result is reported in the task completion message.
- Production build: run result and any environment-specific limitation are reported in the task completion message.
- Live provider request: not run; no key is configured.
