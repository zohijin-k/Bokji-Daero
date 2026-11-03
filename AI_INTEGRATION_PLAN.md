# AI integration plan and implementation status

## Current status (Sprint 3)

The app now has an optional server-side OpenAI Responses API explanation path for a selected benefit route. The implementation uses Structured Outputs with a strict JSON Schema, then independently validates the model response and maps IDs to server-owned facts, actions, questions, and source links. The deterministic rules engine remains authoritative; the model cannot change its verdict or set application/approval status.

The implementation is present, but a live provider call has **not** been verified in this workspace because `OPENAI_API_KEY` is not configured. The UI therefore reports the AI service as unconfigured and keeps the existing deterministic guidance available. Do not describe this as a tested live AI service until a configured deployment completes the live checklist in `AI_EVALUATION.md`.

## Safe role and boundaries

AI explains a server-recomputed route result in plain Korean. It does not decide eligibility, calculate benefits, resolve exceptions, alter the route status, or infer a missing value. For 국민취업지원제도 I유형, the app recomputes the existing conservative assessment on the server and keeps its assessment status immutable in the response.

For other routes, the existing recommendation rules are demonstrations. The AI response labels those rules as demonstrations and does not represent them as official individual eligibility decisions.

## Data minimization and consent

The user must opt in for each request. The browser sends only the selected route's relevant fields. It sends no name, phone number, address, account details, free-text prompt, or unrelated local-storage record. The I-type request can include the profile fields used by that assessment (age, household size, household income and reference year, assets, work history, applicant income, work status, and listed restriction answers); other benefit requests include only the fields used by that route.

The server accepts a strict field allowlist, rejects unexpected keys, discards any client-supplied verdict, and runs the rules again. Requests and responses are not written to application storage or logs. Provider-side processing is governed by the provider's current terms and settings; the UI discloses the transfer before consent.

## Model request and output

- Provider interface: OpenAI Responses API over server-side HTTPS.
- Model: `OPENAI_MODEL`, default `gpt-6-astra`.
- Secret: server-only `OPENAI_API_KEY`; never use a `NEXT_PUBLIC_` variable.
- Request: `store: false`, no tools, 500 output token limit, 15-second timeout.
- Structured output: strict JSON Schema. The model returns explanation text plus IDs for conditions, approved actions, clarification questions, and source references.
- The server validates the schema, allowed IDs, claim language, and unsupported numeric values. It maps those IDs to trusted server-side content; source URLs and eligibility status are never accepted from the model.
- Abuse controls: same-origin POST, bounded request body, per-client and process-wide rate limits, no request-body logging.

See `AI_IMPLEMENTATION.md` for code mapping and setup, and `AI_EVALUATION.md` for scenario coverage and live verification status.

## Fallback and limitations

When the key is missing, the provider is unavailable, times out, refuses, or returns invalid content, the endpoint returns an explicit error. The client preserves existing deterministic route guidance and explains that AI is unavailable; it does not show fabricated AI output. The current rate limiter is process-local and should be replaced or backed by shared storage for multi-instance production deployment. The implementation still needs a configured live-call and deployment privacy review before production use.
