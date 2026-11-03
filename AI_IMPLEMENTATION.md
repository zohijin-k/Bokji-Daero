# Sprint 3 AI implementation

## Implemented request flow

1. The user opens a selected route and opts in through the AI explanation panel.
2. `src/lib/ai/contracts.ts` projects only the selected benefit's necessary fields.
3. `POST /api/ai-guidance` checks same-origin, content type, body size, rate limit, and server configuration.
4. `src/lib/ai/guidance-core.ts` validates the input allowlist and recomputes the route using the existing rules engine. It ignores client verdicts and progress is treated only as local guidance progress.
5. The server sends the minimal structured context to the OpenAI Responses API and requests strict Structured Outputs.
6. The server checks output fields and allowed IDs, rejects unsupported numbers/claims/URLs, and renders source references, facts, questions, and actions from trusted local data.
7. On any failure, the endpoint returns an explicit error and the UI retains deterministic route guidance.

## Code locations

| File | Responsibility |
|---|---|
| `src/lib/ai/contracts.ts` | Minimal per-benefit request projection and response types. |
| `src/lib/ai/guidance-core.ts` | Input validation, server-side re-evaluation, prompt/schema, provider request, output validation, trusted mapping, and rate limiting. |
| `src/app/api/ai-guidance/route.ts` | Same-origin API boundary, size/content checks, error mapping, and no-store response. |
| `src/components/ai-guidance.tsx` | Per-request consent, disclosure, AI response rendering, and unavailable state. |
| `src/app/route/page.tsx`, `src/app/map/page.tsx`, `src/components/route-list.tsx` | Optional panel on route and blocked-route details, without replacing the existing navigation actions. |
| `src/lib/ai/guidance-core.test.ts` | Rule-context, minimization, untrusted input/output, and rate-limit tests. |

## Configure a live provider call

Create a local `.env.local` (or set equivalent server-side secrets in the hosting environment):

```dotenv
OPENAI_API_KEY=your-server-side-api-key
OPENAI_MODEL=gpt-6-astra
```

Restart the dev server after changing local environment variables. Keep the key out of browser variables, source control, screenshots, and chat. The checked-in `.env.example` contains blank placeholders only. Without the key, the API intentionally responds with `AI_NOT_CONFIGURED`; that is the current verified behavior for this workspace.

## Provider interface and safeguards

The implementation calls `POST https://api.openai.com/v1/responses` with `store: false`, no tools, strict `text.format` JSON Schema, `max_output_tokens: 500`, and a 15-second timeout. The response is extracted from the Responses API `output[].content[]` structure, then independently validated. See the [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) for the provider feature used here.

The model returns no verdict field. The server response carries the route and assessment statuses recomputed before the call. The full confirmed/missing evidence and official source list are always constructed from server-owned records, even if the model omits an ID. Action/question IDs are selected from server-created allowlists; URLs and source metadata are attached by the server. The text validator rejects links, unsupported numeric claims, and common definitive eligibility/approval claims. If validation fails, no model text is rendered.

No direct identifiers or free-text prompt are accepted. The app does not persist or log the request body or model response. Consent discloses that relevant condition data is sent to OpenAI. Provider-side data handling remains subject to the provider's current policy and the deployment's account settings.

## Status and operational constraints

- Code path: implemented.
- Local automated tests: implemented; see `AI_EVALUATION.md`.
- API key available in this workspace: no.
- Live provider request/response: not verified.
- Production multi-instance rate limiting: not implemented; current limits are per process and need shared storage for scaled deployments.
- AI text quality and local participant evaluation: not completed; follow `AI_EVALUATION.md` before claiming measured quality.
