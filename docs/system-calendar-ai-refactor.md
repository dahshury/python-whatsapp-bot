# Refactoring Plan: System Calendar AI Agent

## User Objectives

- **Primary Goal**: Introduce a privileged AI agent for internal calendar operations that can execute batch reservation management commands via chat without impacting the customer-facing assistant.
- **Specific Requirements**:
  - Distinct toolchain with batch-aware functions (modify/reserve/cancel/search) plus utilities to extract WA IDs by date range, analyze chats, and fetch reservation snapshots.
  - Ability to converse with the agent through the existing chat sidebar by selecting the template number `+12125550123`, using a dedicated system prompt defined in `.env`.
  - Full segregation from the customer LLM (new prompt + tool registry) while reusing the current domain services to stay DRY.
  - Support fuzzy customer lookup (reuse phone selector search) so batch commands can target users by name or WA ID.
  - Backend and frontend wiring so system conversations are persisted/broadcast like other chats and appear in the combobox even before first use.
- **Behavioral Changes**: Adds a new privileged conversational workflow; existing customer flows, WhatsApp messaging, and assistant tools must remain unchanged.

## Current State

- File: `app/services/assistant_functions.py` (~430 lines) centralizes single-customer operations (reserve/modify/cancel/etc.) but exposes no batch orchestration or date-range filters.
- File: `app/services/tool_schemas.py` / `app/services/{anthropic,gemini,openai}_service.py` / `app/services/llm_service.py` assume a single global toolset and system prompt, so we cannot register a second agent without duplicating large blocks.
- File: `app/views.py` always forwards `/whatsapp/message` payloads to WhatsApp and logs messages as `secretary`, meaning internal-only conversations are impossible.
- File: `app/utils/service_utils.py` `retrieve_messages` treats every non-`user` role as assistant, so even if we special-case system chats the LLM would misread the conversation.
- Frontend: `features/chat` relies on `/whatsapp/message` for every send action and the conversation combobox is populated from `/customers/names`, which currently omits the template user (no seeded record).
- Resulting pain points:
  - No batch-aware domain API for multi-wa_id operations.
  - No mechanism to expose new tools safely to an internal LLM.
  - No UI path to talk to the template number or display it as a selectable contact.

## Proposed Changes

**Refactoring Approach:**

- Introduce a dedicated system-agent toolkit that wraps existing domain services to perform batch actions (looping through reservations/customers with shared validation logic).
- Generalize the LLM provider layer so each agent injects its own tool definitions and system prompt without duplicating provider-specific code.
- Extend API/message persistence so conversations with the template number stay inside the app (no WhatsApp call) yet still flow through the same React Query caches/broadcasts.
- Surface the system agent contact and env metadata in both backend (customer names endpoint) and frontend (chat combobox default).

**Scope**:

- Backend config, LLM services, assistant tooling, new batch domain services, API endpoints, and chat persistence logic.
- Frontend chat service, combobox, and shared constants/env exports.
- No changes to the customer-facing assistant behavior, WhatsApp webhook handling, or reservation UI beyond wiring the new agent.

**Behavioral impact**:

- Adds an internal-only AI workflow with elevated tooling; existing customers continue using the prior assistant unaffected.
- Batch operations become available exclusively through the system agent.

**Refactoring Constraints:**

- Reuse `ReservationService`, `AvailabilityService`, `CustomerService`, and `PhoneSearchService` wherever possible; batch functions should orchestrate existing methods rather than duplicating validation logic.
- Maintain import boundaries (shared → entities → features → widgets → pages → app); new domain/batch services must live under `app/services/domain`.
- Tool schemas and LLM provider glue should be shared abstractions—no copy/paste between agents.
- Chat UI must keep using current hooks/services; only inject minimum awareness of the system agent WA ID.

| Step | Description                                                                                                                                                                                                                                 | Source Lines                                                                                                                                                                                                                    | Target Location                                                   | Dependencies                                 | Change Type                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| 1    | Add `SYSTEM_AGENT_WA_ID` & `SYSTEM_AGENT_PROMPT` env plumbing (backend config + Next.js exposure + defaults)                                                                                                                                | `app/config.py` (~40), `.env.example`, `app/frontend/next.config.mjs`                                                                                                                                                           | Same files + new `app/frontend/shared/config/system-agent.ts`     | Env consumers (`callPythonBackend`, chat UI) | Update configuration                   |
| 2    | Refactor LLM tool plumbing to support multiple registries (inject tool definitions/function maps into Anthropic/Gemini/OpenAI services + `llm_service.py`)                                                                                  | `app/services/tool_schemas.py`, `app/services/{anthropic,gemini,openai}_service.py`, `app/services/llm_service.py` (~400 total)                                                                                                 | Same files + shared helper (e.g., `app/services/toolkit/base.py`) | Step 1 env data                              | Adapt structure (dependency inversion) |
| 3    | Create system-agent batch domain layer (e.g., `app/services/domain/system_agent/batch_service.py`) that composes `ReservationService`, `CustomerService`, `PhoneSearchService`, `AvailabilityService` for multi-wa_id/date-range operations | New (~250 lines)                                                                                                                                                                                                                | `app/services/domain/system_agent/`                               | Existing domain services                     | Add module                             |
| 4    | Implement system-agent functions facade (`app/services/system_agent_functions.py`) reusing Step 3 service to expose batch APIs (move day, cancel range, reserve multi, fetch wa_ids, analyze chat stats)                                    | New (~200 lines)                                                                                                                                                                                                                | `app/services/system_agent_functions.py`                          | Step 3 service + phone search                | Add module                             |
| 5    | Define new tool schemas for system agent (`app/services/system_tool_schemas.py`) and export tool registry metadata for Step 2                                                                                                               | New (~150 lines)                                                                                                                                                                                                                | `app/services/system_tool_schemas.py`                             | Step 4 functions                             | Add module                             |
| 6    | Add `get_system_agent_llm_service()` in `llm_service.py`, hook it into API flow: intercept `/whatsapp/message` when WA ID matches template, store messages as `user` equivalents, call new LLM service, append/broadcast system responses   | `app/views.py` (~280-360), `app/utils/service_utils.py` (~40), `app/utils/whatsapp_utils.py` (`retrieve_messages`)                                                                                                              | Same files                                                        | Steps 1-5                                    | Behavioral enhancement                 |
| 7    | Ensure customer roster includes system agent (augment `get_all_customer_names`, seed display name if missing) and adjust `retrieve_messages` to treat secretary role as user for the template WA ID                                         | `app/utils/service_utils.py` (~60)                                                                                                                                                                                              | Same file                                                         | Step 1 env                                   | Update logic                           |
| 8    | Frontend: expose `SYSTEM_AGENT_WA_ID` constant, pin it in chat combobox/customer names, optionally label as "Calendar AI"; ensure `ChatService.sendMessage` includes `_call_source` so backend can differentiate                            | `app/frontend/shared/libs/documents/default-document.ts`, `app/frontend/features/chat/conversation-combobox.tsx`, `app/frontend/features/chat/services/chat.service.ts`, `app/frontend/features/chat/hooks/useCustomerNames.ts` | Same files + new shared util                                      | Step 6 backend route                         | UI wiring                              |
| 9    | Add targeted tests/docs (e.g., unit tests for batch service + API regression notes) and update `docs/` to describe agent usage                                                                                                              | `app/services/domain/system_agent/__tests__` (new), `docs/`                                                                                                                                                                     | New files                                                         | Steps 3-6                                    | Tests/documentation                    |

## Expected Outcomes

- Two independent tool registries share the same provider code, preventing duplication while letting each agent use tailored prompts and permissions.
- Batch reservation/cancellation/modification/search operations become available through a single orchestrator that reports per-wa_id success/failure for LLM consumption.
- Messages sent to `+12125550123` stay inside the platform, automatically invoking the new agent and broadcasting replies in real time.
- The chat sidebar lists the system agent contact by default, so operators can immediately start issuing commands.

## Verification Steps

- [ ] Send a message to a regular customer via `/whatsapp/message`; ensure WhatsApp delivery and conversation logging still work.
- [ ] Send “move all users from 2025-06-01 to 2025-06-03” to `+12125550123` in the chat UI; verify the backend bypasses WhatsApp, invokes the new LLM tool, and updates reservations accordingly.
- [ ] Call the new batch tools directly (e.g., list wa_ids for date range, batch cancel) through automated tests to confirm summaries and error handling.
- [ ] Confirm `/customers/names` and the chat combobox always list the system agent contact even on fresh databases.
- [ ] Run automated test suites / lint (Python + Next.js) to ensure no regressions across affected modules.

## System Agent Usage Notes

- `SYSTEM_AGENT_WA_ID` identifies the privileged contact (default `+12125550123`). Optionally set `SYSTEM_AGENT_NAME`/`SYSTEM_AGENT_PROMPT` (and `NEXT_PUBLIC_SYSTEM_AGENT_*` for the frontend) to customize the label or instructions without touching code.
- The chat sidebar automatically lists the contact (labeled “Calendar AI Assistant” by default) via `/customers/names`, so operators can select it even before any conversation exists.
- Messages sent to the system agent stay within the platform: they persist in the conversations table as `secretary` (user) or `assistant` roles and trigger the new LLM toolkit instead of WhatsApp.
- Batch commands should target the streamlined tool names (`system_get_reservations`, `system_batch_*`, etc.), which are documented in `app/services/system_tool_schemas.py` and covered by `SystemAgentBatchService`. `system_get_reservations` is now the “Swiss army knife” for data retrieval: it accepts fuzzy queries, date filters, WA IDs (single or multiple), and an `include` selector so the agent can request only `reservations`, `wa_ids`, or `customers`. Every response contains a `summary` block and each section is capped by `max_results` (default 200, max 500) so year-long queries stay manageable. Availability queries are consolidated under `search_available_appointments`, which handles both single-day slot lookups and range scans.
- Batch mutation tools default to a compact summary response (aggregate stats plus up to 50 sample rows). Supply `verbosity: "detailed"` when the agent explicitly needs the full raw payloads from the underlying reservation service.
- Quick reference for the core tools:
  - **`system_get_reservations`** – Provides reservations, WA IDs, and/or customer metadata based on fuzzy search plus date/type filters. Set `include` to control which sections are returned and `max_results` to raise/lower the per-section cap if needed (summary always includes total counts).
  - **`system_batch_reserve`** – Creates one or many reservations; each payload contains the reservation basics (`wa_id`, `customer_name`, `date_str`, `time_slot`, `reservation_type`, etc.). Use `verbosity` to switch between summary/detailed outputs.
  - **`system_batch_modify`** – Accepts explicit `requests` or filter-driven discovery and can update dates, times, names, types, and even `new_wa_id`. Supports `verbosity`.
  - **`system_batch_cancel`** – Cancels explicit reservations or everything that matches the provided filters (dates, WA IDs, reservation types, etc.). Supports `verbosity`.
