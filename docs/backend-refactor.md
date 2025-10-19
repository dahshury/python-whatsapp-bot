# Zod Validation Adoption Plan — backend.ts (Planning Only)

Target file: `app/frontend/shared/libs/backend.ts`

- Lines: ~60
- Analysis date: 2025-10-18
- Scope: Introduce Zod-based runtime validation across API routes, HTTP client, WebSocket payloads, persisted JSON, and config. Anchor changes on `callPythonBackend` to enable response decoding. No code changes yet.

## Current State and Issues

- HTTP helper already supports optional Zod schema validation, but many callers don't pass a schema, leaving responses unvalidated end-to-end.

  - Reference (current behavior):

    ```74:114:app/frontend/shared/libs/backend.ts
    export async function callPythonBackend<T = unknown>(
    	path: string,
    	init?: RequestInit,
    	schema?: SchemaLike<T>
    ): Promise<T> {
    	const bases = resolveBackendBaseUrlCandidates();
    	let lastError: unknown;

    	for (const baseUrl of bases) {
    		const url = joinUrl(baseUrl, path);
    		try {
    			const res = await fetch(url, {
    				method: init?.method || "GET",
    				headers: {
    					"Content-Type": "application/json",
    					...(init?.headers as Record<string, string>),
    				},
    				body: (init?.body ?? null) as BodyInit | null,
    				cache: "no-store",
    			});

    			if (!isJsonResponse(res)) {
    				return await decodeTextResponse<T>(res);
    			}

    			const parsed = await parseJsonSafely(res);
    			const validated = validateWithSchema(schema, parsed);
    			if (validated !== null) {
    				return validated as T;
    			}
    			return parsed as T;
    		} catch (error) {
    			lastError = error;
    			// Try the next candidate host
    		}
    	}

    	throw lastError instanceof Error
    		? lastError
    		: new Error("Backend request failed for all candidates");
    }
    ```

- Several Next.js API routes still lack Zod validation for request bodies/queries and/or don't validate backend responses:
  - `app/frontend/app/api/customers/[waId]/route.ts` (params and PUT body; response validation)
  - `app/frontend/app/api/modify-id/route.ts` (body + response)
  - `app/frontend/app/api/vacations/route.ts` (response)
  - `app/frontend/app/api/notifications/route.ts` (response)
  - `app/frontend/app/api/reservations/undo-create/route.ts` (body + response)
  - `app/frontend/app/api/vacations/undo-update/route.ts` (body + response)
  - `app/frontend/app/api/reservations/undo-modify/route.ts` (body + response)
  - `app/frontend/app/api/reservations/undo-cancel/route.ts` (body + response)
  - `app/frontend/app/api/metrics/route.ts` (parsed text → object validation)
- Client API functions don't validate inputs with Zod before sending (e.g., `reserveTimeSlot`, `modifyReservation`, `undoModifyReservation`, `cancelReservation`, `saveCustomerDocument`).
- Numerous `JSON.parse` usages read persisted/cached or external data without validation/fallback shaping (see prioritized list below).
- Config/env validation exists but is minimal; expand to cover additional runtime config keys as needed.

## Refactoring Strategy Overview

1. Add Zod as a dependency and introduce a centralized validation surface in `shared/validation/`.
2. Extend `callPythonBackend` to accept an optional Zod schema for response decoding.
3. Define domain and transport schemas (requests, responses, WS messages, persisted blobs, config).
4. Apply schemas at boundaries: Next.js API routes (request/query), HTTP client responses, WS messages, and JSON.parse sites.
5. Keep schemas in `shared/validation` (no imports from `features/`, `widgets/`, `app/`), respecting import rules.

## Detailed Refactoring Plan

| Step | Description                                                                                   | Source Lines | Target Location                                | Import Updates                        | Dependencies           |
| ---- | --------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------- | ------------------------------------- | ---------------------- |
| 8    | Enforce `callPythonBackend` schema usage in callers; refine typings to surface inferred types | 74-114       | `app/frontend/shared/libs/backend.ts`          | Pass schemas from all call sites      | zod                    |
| 8.1  | Extend `httpClient` (get/post/put) to accept optional schema and delegate validation          | 1-26         | `app/frontend/shared/libs/http/http-client.ts` | Add schema param; delegate to backend | zod                    |
| 10   | Validate request bodies/queries in API routes using schemas and return 400 with details       | various      | `app/frontend/app/api/**/route.ts`             | Import request schemas                | request schemas        |
| 12   | Narrow reducer payloads by event schema before state mutation                                 | 276-351      | `app/frontend/shared/libs/ws/reducer.ts`       | Import per-event schemas              | message schema, domain |
| 13   | Replace risky `JSON.parse` sites with `safeParseJson` and fallback shapes                     | various      | multiple files (see list below)                | Import json helper + specific schemas | json helper            |
| 14   | Validate runtime config/env once and export validated values                                  | 1-4          | `app/frontend/shared/config/index.ts`          | Import config schema                  | primitives             |
| 15   | Update `services/chat/chat.service.ts` to validate HTTP fallback responses if applicable      | 1-61         | `app/frontend/services/chat/chat.service.ts`   | Optional: use response schema         | response schemas       |

### Files affected in Steps 10 and 13 (non-exhaustive but prioritized, updated)

- API routes (add Zod for request/response where missing):

  - `app/frontend/app/api/customers/[waId]/route.ts` (params/body + response)
  - `app/frontend/app/api/conversations/route.ts` (query + response)
  - `app/frontend/app/api/reservations/route.ts` (query + response)
  - `app/frontend/app/api/modify-id/route.ts` (body + response)
  - `app/frontend/app/api/notifications/route.ts` (response)
  - `app/frontend/app/api/vacations/route.ts` (response)
  - `app/frontend/app/api/reservations/undo-create/route.ts` (body + response)
  - `app/frontend/app/api/vacations/undo-update/route.ts` (body + response)
  - `app/frontend/app/api/reservations/undo-modify/route.ts` (body + response)
  - `app/frontend/app/api/reservations/undo-cancel/route.ts` (body + response)
  - `app/frontend/app/api/metrics/route.ts` (parsed text → object validation)

- JSON.parse sites to wrap via `safeParseJson` with appropriate schemas or ensure guarded usage:
  - `app/frontend/shared/libs/data-grid/serializers/editing-state.ts`
  - `app/frontend/shared/libs/documents/library-utils.ts`
  - `app/frontend/shared/libs/data-grid/components/hooks/use-grid-persistence.ts`
  - `app/frontend/widgets/data-table-editor/hooks/use-data-table-save-handler.ts`
  - `app/frontend/shared/libs/calendar/calendar-event-converters.ts` (debug-only cloning)
  - `app/frontend/features/chat/chat/tool-call-group.tsx`

## Additional Context

- New files to be created or refined (indicative):

  - `app/frontend/shared/validation/primitives.ts` (exists)
  - `app/frontend/shared/validation/json.ts` (exists)
  - `app/frontend/shared/validation/api/response.schema.ts` (exists)
  - `app/frontend/shared/validation/api/requests/{send,append,reserve,modify,cancel,updateVacations,customerPut,conversationsQuery,reservationsQuery,modifyId,undoCreate,undoModify,undoCancel}.schema.ts`
  - `app/frontend/shared/validation/domain/{reservation,conversation,vacation}.schema.ts` (exists)
  - `app/frontend/shared/validation/domain/{notification,metrics}.schema.ts` (new)
  - `app/frontend/shared/validation/ws/message.schema.ts` (exists)

- Import flow compliance:

  - Schemas live under `shared/validation` and are consumed by `app/`, `features/`, `widgets/`, `services/`, `processes/`, and `shared/libs/**`.
  - No imports from `features/` or `widgets/` into `shared`.
  - `entities/` remain type-only; Zod lives in `shared/validation` to avoid runtime code in `entities/`.

- Performance considerations:
  - Decode only at boundaries (HTTP, WS, API handlers). Avoid deep validation within hot loops.
  - Make schemas permissive where backend variability exists; refine iteratively.

## Success Criteria

- Type-safe runtime validation in all external boundaries (HTTP, WS, persisted JSON, config).
- No TypeScript `any` introduced; inferred types from Zod via `z.infer` where needed.
- All files adhere to import rules and file size limits (<500 lines).
- Zero TypeScript errors and zero lint violations after execution.

## Verification Steps (to run during execution phase)

1. After each step, run:
   - `pnpm tsc --noEmit` (from `app/frontend/`)
   - `npx ultracite check app/frontend/`
2. For API routes: add unit-level request samples and ensure 400 responses include Zod error summaries.
3. For WS: simulate a few message types and confirm reducer receives validated/narrowed payloads.
4. For JSON.parse replacements: confirm graceful fallback when cache is corrupt.
5. For config: missing/invalid envs yield sane defaults or startup errors (decide per requirement).

## Notes on Execution Order

Follow the table order: primitives → domain → response/request → WS → backend.ts extension → adopters (API client, routes) → JSON.parse sites → config.

---

Planning complete. No code changes have been made. Review and say "execute the plan" to proceed with implementation.
