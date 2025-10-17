# Top 10 Largest Files - Refactoring Analysis

**Generated**: October 17, 2025  
**Command Run**: `tokei -f -s code`  
**Analysis Includes**: TypeScript, Python - Business Logic, Services, Components, Utilities

---

## Executive Summary

This analysis examines the 10 largest files in the codebase (excluding node_modules, tests, and config files). The codebase demonstrates strong architectural decisions but shows several files exceeding recommended size limits with opportunities for modularization. Average violations across files:

- **DRY Average**: ⭐⭐⭐ (2.8/5)
- **SoC Average**: ⭐⭐⭐ (2.9/5)
- **Modularity Average**: ⭐⭐⭐ (3.1/5)
- **Avg Overall Score**: 3.0/5.0

**Recommended Effort**: 🔴 High (1-2 weeks total across all files)

---

## Summary Table

| #   | File Path                                                     | Language           | Feature      | LOC  | DRY      | SoC        | Mod    | Avg | Effort      | Key Refactoring Needs                                                              |
| --- | ------------------------------------------------------------- | ------------------ | ------------ | ---- | -------- | ---------- | ------ | --- | ----------- | ---------------------------------------------------------------------------------- |
| 1   | app/utils/service_utils.py                                    | Python/Utility     | Backend/Core | 1173 | ⭐       | ⭐⭐       | ⭐⭐   | 1.7 | ⚫ Critical | Extract into domain-specific service modules; reduce god-file pattern              |
| 2   | app/frontend/features/dashboard/compute.ts                    | TypeScript/Utility | Dashboard    | 1152 | ⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐ | 2.3 | 🔴 High     | Extract computation functions into separate modules; reduce coupling               |
| 3   | app/services/domain/reservation/reservation_service.py        | Python/Service     | Reservations | 981  | ⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐ | 2.7 | 🔴 High     | Split business logic into operation-specific services (create/modify/cancel)       |
| 4   | app/utils/realtime.py                                         | Python/Service     | Backend/Core | 857  | ⭐⭐     | ⭐⭐       | ⭐⭐   | 2.0 | 🔴 High     | Extract WebSocket management; separate concerns (connection, messaging, filtering) |
| 5   | app/views.py                                                  | Python/Router      | Backend/Core | 844  | ⭐       | ⭐         | ⭐     | 1.0 | ⚫ Critical | Split into domain-specific routers; separate concerns across ~30+ endpoints        |
| 6   | app/frontend/shared/libs/i18n.ts                              | TypeScript/Utility | I18n/Config  | 911  | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 3.7 | 🟡 Medium   | Extract locale data into separate files; improve key organization                  |
| 7   | app/frontend/processes/documents/document-save.process.ts     | TypeScript/Utility | Documents    | 696  | ⭐⭐     | ⭐⭐⭐     | ⭐⭐   | 2.3 | 🔴 High     | Extract autosave orchestration; separate persistence from UI logic                 |
| 8   | app/frontend/shared/libs/ws/use-websocket-data.ts             | TypeScript/Hook    | WebSocket    | 717  | ⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐ | 2.7 | 🟡 Medium   | Extract event handlers; create separate utilities for connection management        |
| 9   | app/frontend/processes/dashboard/dashboard-compute.process.ts | TypeScript/Utility | Dashboard    | 582  | ⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐ | 2.3 | 🟡 Medium   | Extract data aggregation functions; reduce code duplication with compute.ts        |
| 10  | app/frontend/widgets/calendar/hooks/use-calendar-events.ts    | TypeScript/Hook    | Calendar     | 557  | ⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐ | 3.3 | 🟡 Medium   | Extract event processing; separate data loading from transformation logic          |

---

## Detailed Analysis

### 1. app/utils/service_utils.py (1173 LOC) - Python - Backend/Core

**Purpose**: Multi-domain utility service containing global helper functions for reservations, customers, conversations, vacations, and WhatsApp message handling. This is a classic "god file" containing cross-domain business logic without clear separation.

**Why It Exists**: Developed as a centralized utility module to avoid duplication across multiple backend services but has grown without modularization boundaries.

**Violation Scores**:

- **DRY Violations: ⭐** - Severe duplication across functions. Multiple date parsing patterns, customer filtering logic, reservation state checking repeated ~15+ times. Example: `parse_date()` variations, `filter_active_reservations()` duplicates, message formatting repeated in 4+ places.
- **SoC Violations: ⭐⭐** - Mixed responsibilities: WhatsApp utilities, database queries, business logic (reservations, vacations, customers), formatting, i18n all in one file. Contains domain-specific functions mixed with cross-cutting concerns.
- **Modularity Violations: ⭐⭐** - High coupling to database models, config, i18n, external services. Functions intertwine customer logic with reservation logic. Difficult to reuse without importing entire module.

**Refactoring Effort**: ⚫ **Critical** (2-3 weeks) - Requires architectural refactoring. 1173 LOC, high complexity, multiple domain concerns, significant risk of breaking changes across 30+ dependent files.

**Analysis**:

This file violates every architectural principle. Lines 1-100 define generic utilities (format_response, fix_unicode_sequence), then abruptly shift to complex business logic like `get_tomorrow_reservations()` (200+ LOC), `get_all_reservations()` (150+ LOC), and vacation management. Each domain—customers, reservations, vacations, conversations—has intertwined logic that should live in separate domain services.

The file exhibits massive DRY violations. Date parsing is reimplemented in 8+ functions, reservation filtering happens 6+ different ways, and customer name normalization is duplicated. Pagination logic appears 4+ times. State validation checks repeat throughout.

SoC violations are pervasive: vacation logic directly queries databases and broadcasts updates; reservation functions handle WhatsApp formatting; conversation retrieval mixes database logic with business rules; timezone handling is scattered across functions.

**Critical Refactoring Blocks**:

1. **Lines 77-250** (170 LOC)

   - Issue: Core reservation retrieval logic mixed with formatting, timezone handling, filtering
   - Suggestion: Extract to `ReservationQueryService` with focused methods for tomorrow's reservations, upcoming reservations, and by-customer queries

2. **Lines 250-450** (200 LOC)

   - Issue: Vacation utilities coupled with database, i18n, and broadcast logic
   - Suggestion: Create `VacationUtilityService` handling only vacation state management separate from notifications

3. **Lines 600-900** (300 LOC)

   - Issue: Complex message processing, formatting, and customer resolution intertwined
   - Suggestion: Extract `MessageFormattingService` and `ConversationQueryService` with clear responsibilities

4. **Lines 1000-1173** (173 LOC)
   - Issue: WhatsApp-specific utilities mixed with generic formatting
   - Suggestion: Move to `WhatsAppUtilityService` within services layer

---

### 2. app/frontend/features/dashboard/compute.ts (1152 LOC) - TypeScript - Dashboard

**Purpose**: Computes comprehensive dashboard analytics including KPIs, trends, heatmaps, customer segments, and word frequency from conversation and reservation data. Single export function processing all dashboard computations.

**Why It Exists**: Centralized computation engine to avoid scattering complex analytics logic across components. Handles data transformation, aggregation, and trend analysis.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Duplicated patterns: multiple similar trend/heatmap generation functions (daily trends, monthly trends, day-of-week), repeated filtering logic (~8 identical filter patterns), date/time handling duplicated across functions, calculation patterns for averages/medians appear 3+ times.
- **SoC Violations: ⭐⭐⭐** - Primary concern is analytics computation but includes data parsing, date manipulation, filtering, type transformations, and trend calculations all mixed. Some UI concerns leak in (display formatting).
- **Modularity Violations: ⭐⭐⭐** - Heavy internal dependencies between functions; large monolithic export; 70+ internal helper functions; difficult to test or reuse individual calculations; tightly coupled to specific data structure assumptions.

**Refactoring Effort**: 🔴 **High** (1-2 weeks) - 1152 LOC, high complexity, multiple analytics domains, requires careful test coverage during refactoring.

**Analysis**:

While SoC is better than service_utils.py, this file still concentrates too much logic. The `computeFullDashboardData()` function orchestrates 15+ complex analytics computations. Lines 100-250 define constants and basic utilities, but lines 250-1210 are mostly helper functions that could live in separate modules.

DRY violations are significant: trend calculation patterns repeat in `calculateDailyTrends()`, `getMonthlyTrends()`, and `getDayOfWeekData()` with nearly identical iteration and accumulation logic. The `getTopCustomers()` function (lines 514-572) duplicates filtering and sorting patterns from other functions. Message heatmap generation closely mirrors day-of-week data generation.

Modularity is weak: calculating response times, segments, word frequency, and time slots all depend on shared parsing/filtering logic but are defined as separate functions without abstraction. Testing individual calculations requires calling the main function and checking a specific output property.

**Critical Refactoring Blocks**:

1. **Lines 70-230** (160 LOC)

   - Issue: Helper functions for response duration, reservation type counting, and daily trends all share iteration/accumulation patterns
   - Suggestion: Extract `AggregationEngine` class with reusable `aggregate()`, `groupBy()`, and `computeTrend()` methods

2. **Lines 250-400** (150 LOC)

   - Issue: Trend calculation functions (daily, monthly, day-of-week) repeat similar map-building patterns
   - Suggestion: Create `TrendCalculator` service with `computeDailyTrend()`, `computeMonthlyTrend()`, `computeWeeklyTrend()` methods sharing common logic

3. **Lines 450-572** (122 LOC)

   - Issue: Customer segments, top customers, and word frequency share similar sorting/filtering patterns
   - Suggestion: Extract `DataRankingService` for segments, rankings, and frequency analysis

4. **Lines 823-900** (77 LOC)
   - Issue: Duplicate trend computation logic and date range calculations scattered
   - Suggestion: Consolidate date range logic into reusable utility, extract trend calculation into consistent pattern

---

### 3. app/services/domain/reservation/reservation_service.py (981 LOC) - Python/Service - Reservations

**Purpose**: Domain service orchestrating all reservation operations: create, modify, cancel, query, and availability checking. Implements business rules for reservation validation and state management.

**Why It Exists**: Centralizes reservation domain logic per domain-driven design principles. Coordinates between repository and other services.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Operation-specific validation logic repeated in `create()`, `modify()`, and `cancel()` methods (~50 LOC duplicated across 3 methods). Date/time validation happens identically in 4+ places. Failure metric recording code appears 5+ times.
- **SoC Violations: ⭐⭐⭐** - Mostly focused on reservations but mixes business logic with metrics recording, customer service coordination, availability checking, and database transaction management. Validation intertwined with business operations.
- **Modularity Violations: ⭐⭐⭐** - High coupling to repository, customer service, and availability service. Methods exceed 100 LOC. `create_reservation()` handles validation, business rules, metrics, and broadcasting in 200+ LOC monolith.

**Refactoring Effort**: 🔴 **High** (1-2 weeks) - 981 LOC, complex domain logic, many dependent services, requires careful state management preservation.

**Analysis**:

This service demonstrates good domain-driven design principles but violates single responsibility. The file mixes core reservation operations with metrics, logging, and customer coordination. Methods are too large: `create_reservation()` spans ~200 LOC handling validation, business rules, persistence, and notifications together.

DRY violations appear in validation logic. Date format checking, timezone handling, and reservation state validation repeat across create/modify/cancel operations. Error metric recording follows identical pattern in 5 different places. Failure reason mapping is duplicated.

The `_record_failure_metric()` method (lines 62-77) records failures, but similar logic repeats inline in 4+ places. Customer validation happens separately from reservation validation but follows similar patterns.

**Critical Refactoring Blocks**:

1. **Lines 200-400** (~200 LOC - create_reservation method)

   - Issue: Single method handles validation, business logic, persistence, metrics, and broadcasting
   - Suggestion: Extract `ReservationValidator`, `ReservationCreator`, and separate metrics handling into decorator pattern

2. **Lines 400-550** (~150 LOC - modify_reservation method)

   - Issue: Validation and modification logic tightly coupled; metrics mixed with business logic
   - Suggestion: Extract `ReservationModifier` with separated concerns; use strategy pattern for different modification scenarios

3. **Lines 550-700** (~150 LOC - cancel_reservation method)

   - Issue: Similar pattern of validation + business logic + metrics + broadcasting
   - Suggestion: Create `ReservationCanceler` service; separate orchestration from concerns

4. **Lines 800-900** (100+ LOC - query methods)
   - Issue: Query methods have complex filtering and transformation logic
   - Suggestion: Extract `ReservationQueryBuilder` or move complex queries to repository layer

---

### 4. app/utils/realtime.py (857 LOC) - Python/Service - Backend/Core

**Purpose**: Manages WebSocket connections, real-time event broadcasting, message filtering, and client connection lifecycle. Central hub for all real-time communication.

**Why It Exists**: Centralizes WebSocket management to handle client connections, event filtering, metrics tracking, and broadcast coordination.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Event filtering logic repeats in `accepts()`, client filter setup, and broadcast dispatch (~40 LOC duplicated). Connection state management patterns repeated in connect/disconnect flows. Error handling try-except blocks follow identical pattern 10+ times.
- **SoC Violations: ⭐⭐** - Mixes WebSocket connection management, message processing, filtering logic, metrics recording, and client state tracking. Database operations, asyncio management, logging, and event broadcasting all intertwined.
- **Modularity Violations: ⭐⭐** - Single `RealtimeManager` class handling 5+ distinct concerns. Event suppression logic tightly coupled to event broadcasting. Client filtering mixed with connection management. 800+ LOC in single class makes testing difficult.

**Refactoring Effort**: 🔴 **High** (1-2 weeks) - 857 LOC, complex async patterns, critical for system stability, requires extensive testing.

**Analysis**:

This service concentration exhibits the largest violation in the backend. The `RealtimeManager` class (800+ LOC) handles connection lifecycle, event filtering, metrics, suppression logic, and broadcasting. Lines 40-150 manage client connections, lines 150-300 handle event dispatch, and lines 300-857 handle suppression and event processing.

DRY violations: Error handling follows identical pattern throughout: try-except blocks with logging. Connection acceptance/rejection logic is similar in structure across 3+ methods. Event type checking repeats. The `accepts()` method logic mirrors filtering done elsewhere.

SoC violations pervasive: Connection management should be separate from filtering; suppression tracking should be separate from broadcasting; metrics should be decoupled from core messaging. Database updates for recent events are mixed with broadcast logic.

**Critical Refactoring Blocks**:

1. **Lines 44-120** (76 LOC - connection management)

   - Issue: Client connection lifecycle mixed with filter setup and state management
   - Suggestion: Extract `ClientConnectionManager` handling only connection accept/reject/disconnect

2. **Lines 130-250** (120 LOC - event dispatch)

   - Issue: Event routing, filtering, and broadcaster coordination all in one method
   - Suggestion: Create `EventDispatcher` service for routing; `EventFilter` for filtering logic

3. **Lines 250-450** (200 LOC - suppression and conflict tracking)

   - Issue: Complex suppression logic mixed with event processing; duplicate event detection intertwined with broadcasting
   - Suggestion: Extract `SuppressionManager` and `EventDeduplicator` as separate concerns

4. **Lines 450-857** (400+ LOC - event processing)
   - Issue: Massive method handling multiple event types with complex state management
   - Suggestion: Use strategy pattern; create event-specific handlers; extract `ReservationEventHandler`, `VacationEventHandler`, `ConversationEventHandler`

---

### 5. app/views.py (844 LOC) - Python/Router - Backend/Core

**Purpose**: Primary FastAPI router handling ~30+ endpoints for webhooks, reservations, cancellations, modifications, conversations, and vacation management. All endpoints in single file.

**Why It Exists**: Centralized entry point for all API requests due to project structure; grew organically as features were added.

**Violation Scores**:

- **DRY Violations: ⭐** - Request handling patterns repeat 25+ times. Error response formatting duplicated across endpoints. Dependency injection setup repeated. Background task wrapping identical in 8+ endpoints. Security checks repeated in multiple places.
- **SoC Violations: ⭐** - Single file mixes reservation operations, cancellations, modifications, conversations, vacation management, WhatsApp message handling, and webhook verification without separation. Authentication, validation, error handling, and business logic all intertwined per endpoint.
- **Modularity Violations: ⭐** - All 30+ endpoints tightly coupled in single file. High complexity per endpoint; impossible to reuse; testing entire module required to test single endpoint; no separation by domain or feature.

**Refactoring Effort**: ⚫ **Critical** (2+ weeks) - 844 LOC with 30+ endpoints, architectural refactoring required, high dependency coupling, extensive testing needed.

**Analysis**:

This file represents a critical architecture violation. All API endpoints—spanning 5+ domains (reservations, conversations, vacations, payments, webhooks)—exist in a single monolithic router. Lines 1-100 define shared utilities and middleware, then lines 100-844 define 30+ endpoints without logical grouping.

DRY violations massive: Background task wrapping pattern repeats in 8+ endpoints:

```python
async def endpoint(...):
    # repeated 8+ times
    background_tasks.add_task(process_task, args)
    return response
```

Error handling standardized but duplicated in every endpoint. Dependency injection pattern identical across all endpoints. Security verification repeated 5+ times.

SoC violations extreme: Webhook verification mixed with reservation operations; conversation endpoints mixed with vacation logic; all authentication/validation/error handling duplicated inline without middleware abstraction.

**Critical Refactoring Blocks**:

1. **Lines 60-250** (190 LOC - reservation endpoints)

   - Issue: Create, modify, cancel all mixed in single router; shared logic duplicated
   - Suggestion: Extract to `ReservationRouter` with dedicated module per operation type

2. **Lines 250-400** (150 LOC - cancellation endpoints)

   - Issue: Redundant with modification endpoints; similar patterns
   - Suggestion: Combine with reservation operations or create focused `ReservationModificationRouter`

3. **Lines 400-600** (200 LOC - conversation/message endpoints)

   - Issue: Message handling, append, send all tightly coupled
   - Suggestion: Extract to `ConversationRouter`; separate concerns into `MessageHandler` service

4. **Lines 600-844** (244 LOC - vacation, webhook, misc endpoints)
   - Issue: Multiple unrelated features crammed together
   - Suggestion: Split into `VacationRouter`, `WebhookRouter`, `AdminRouter`; create APIRouter per domain

---

### 6. app/frontend/shared/libs/i18n.ts (911 LOC) - TypeScript/Utility - I18n/Config

**Purpose**: Internationalization configuration containing all English and Arabic translations, locale-specific utilities, and message interpolation functions for the entire application.

**Why It Exists**: Centralized i18n configuration providing single source of truth for all translated strings and locale-aware utilities.

**Violation Scores**:

- **DRY Violations: ⭐⭐⭐⭐** - Minimal duplication. Keys follow consistent naming patterns. Translation pairs mostly avoid repetition. Some prefixes (kpi*, msg*, etc.) used consistently.
- **SoC Violations: ⭐⭐⭐⭐⭐** - Excellent separation. Localization configuration isolated from application logic. Message formatters separated from key definitions. Validation and utility functions properly sectioned.
- **Modularity Violations: ⭐⭐⭐** - All translations (900 LOC) in single file; difficult to find specific strings; large for IDE responsiveness; import of entire dictionary adds overhead. Could benefit from splitting by feature domain (dashboard, calendar, chat, etc.).

**Refactoring Effort**: 🟡 **Medium** (3-5 days) - 911 LOC but low complexity; no functional risk; organizational improvement; some teams prefer keeping all i18n centralized.

**Analysis**:

This file demonstrates excellent coding practices for a configuration file. No business logic mixed in; clear structure; consistent patterns. However, size impacts maintainability: 911 LOC means scrolling through thousands of lines to find a specific translation key. With 800+ translation keys, searching becomes tedious despite good naming.

The file works well but could improve:

- Split English/Arabic into separate files (500+ LOC each)
- Organize translations by feature domain instead of line-by-line pairing
- Extract utility functions to separate module

DRY violations minimal; the repeated `Object.assign()` pattern (lines 316-866) provides clear visual structure and is appropriate for this context.

**Critical Refactoring Blocks**:

1. **Lines 1-210** (210 LOC - base translations)

   - Issue: Large English/Arabic blocks make finding keys difficult
   - Suggestion: Split into `en.ts` and `ar.ts` files; organize by feature

2. **Lines 316-391** (75 LOC - chat toolbar)

   - Issue: Can be moved to separate domain file
   - Suggestion: Extract to `chat-translations.ts`

3. **Lines 453-506** (53 LOC - chart keys)

   - Issue: Dashboard-specific translations mixed with base
   - Suggestion: Extract to `dashboard-translations.ts`

4. **Lines 868-989** (121 LOC - utility functions)
   - Issue: Message validation and formatting functions mixed with data
   - Suggestion: Extract to separate `i18n-utils.ts` file

---

### 7. app/frontend/processes/documents/document-save.process.ts (696 LOC) - TypeScript/Utility - Documents

**Purpose**: Orchestrates document persistence including signature computation, auto-save debouncing, idle-based saves, and interval-based autosaves. Coordinates save state, timing, and retries.

**Why It Exists**: Centralizes complex document save orchestration logic to prevent data loss and optimize persistence timing.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Save orchestration logic patterns repeat in 3 separate controllers (IdleAutosave, IntervalAutosave, SaveWhenDirty). Retry logic duplicated. Error handling follows identical pattern 8+ times. Signature computation called with nearly identical logic in multiple places.
- **SoC Violations: ⭐⭐⭐** - Primarily focused on document save orchestration but mixes signature computation, state management, persistence, error handling, and UI notifications. Different save strategies intertwined rather than cleanly separated.
- **Modularity Violations: ⭐⭐** - Three controller types share common logic but inherit from single base class; difficult to extend with new save strategies; tight coupling between orchestration and API calls; testing requires mocking API layer.

**Refactoring Effort**: 🔴 **High** (1-2 weeks) - 696 LOC, complex timing/state logic, critical for data integrity, requires thorough testing.

**Analysis**:

This file concentrates complex document persistence orchestration. While the responsibility is focused, the implementation is monolithic. Three save strategy classes (IdleAutosave, IntervalAutosave, SaveWhenDirty) inherit from `SaveController` base but duplicate 100+ LOC of shared orchestration code.

DRY violations significant: Retry logic appears in 3 places identically. Error handling try-catch pattern repeats 8+ times with identical structure. The `attemptSave()` method logic duplicated across different controller types.

SoC violations present: Signature computation mixes with persistence logic; dirty state management intertwined with auto-save timing; error notifications coupled to save operations; retry logic mixed with state management.

**Critical Refactoring Blocks**:

1. **Lines 96-200** (104 LOC - IdleAutosaveController)

   - Issue: Idle detection, debouncing, and save orchestration mixed; retry logic intertwined
   - Suggestion: Extract `IdleDetector` and `SaveRetryOrchestrator` as separate concerns

2. **Lines 200-350** (150 LOC - IntervalAutosaveController)

   - Issue: Similar to IdleAutosave but with different timing; duplicates orchestration logic
   - Suggestion: Create `SaveOrchestrator` base handling common retry/state logic; strategies only differ in timing

3. **Lines 350-450** (100 LOC - SaveWhenDirtyController)

   - Issue: Dirty tracking mixed with save logic
   - Suggestion: Extract `DirtyStateTracker` as separate dependency; controller only orchestrates

4. **Lines 450-696** (246 LOC - utilities and helpers)
   - Issue: Signature computation, state management, and error handling all mixed
   - Suggestion: Extract `DocumentSignatureService`, `SaveStateManager`, `SaveErrorHandler` as separate services

---

### 8. app/frontend/shared/libs/ws/use-websocket-data.ts (717 LOC) - TypeScript/Hook - WebSocket

**Purpose**: Custom React hook managing WebSocket connection lifecycle, message processing, state management, heartbeat, reconnection logic, and data persistence.

**Why It Exists**: Encapsulates complex WebSocket management logic in reusable hook; handles connection resilience, auto-reconnect, and data caching.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Timeout/delay constants repeated in multiple places. Error handling pattern duplicates across 10+ try-catch blocks. Connection state checks repeated (socket.readyState === WebSocket.OPEN appears 5+ times). Lock retry logic appears twice with nearly identical code.
- **SoC Violations: ⭐⭐⭐⭐** - Well-separated concerns: connection management, state management, event handling are logically distinct. Message processing cleanly extracted. Filtering separate from core logic.
- **Modularity Violations: ⭐⭐⭐** - Large hook (717 LOC) mixing many concerns into one component. Complex nested functions. Event handler setup, message processing, and connection logic could be extracted to separate utilities. Heavy use of useRef makes testing difficult.

**Refactoring Effort**: 🟡 **Medium** (5-7 days) - 717 LOC but good SoC; extracting utilities won't break functionality; moderate complexity.

**Analysis**:

This hook demonstrates good architectural separation despite large size. Connection management clearly separated from message processing; event handling extracted to separate functions; caching logic isolated. However, 717 LOC in a single hook is difficult to test and understand.

DRY violations moderate: Timeout constants repeated throughout (25_000 for heartbeat, 50, 200, 500 for snapshot requests appear hardcoded). The pattern `wsRef.current?.readyState === WebSocket.OPEN` repeats 5 times. Error handling try-catch structure identical across 8+ locations.

SoC is actually excellent for a hook this complex. Clear separation between connection (lines 319-471), message processing (lines 286-315), and state management.

**Critical Refactoring Blocks**:

1. **Lines 319-471** (152 LOC - connect function)

   - Issue: Large function handling connection establishment, lock management, and event setup
   - Suggestion: Extract `WebSocketConnector` utility class; separate lock management to `ConnectionLockManager`

2. **Lines 94-225** (131 LOC - event handlers)

   - Issue: Three separate handler setup functions with similar error handling patterns
   - Suggestion: Extract to `SocketEventHandlerFactory` or separate utility module

3. **Lines 522-593** (71 LOC - sendVacationUpdate)

   - Issue: Complex payload building and local ops tracking mixed
   - Suggestion: Extract `VacationUpdateBuilder` and `LocalOpsTracker` utilities

4. **Lines 1-80** (80 LOC - constants and types)
   - Issue: Many hardcoded constants; scattered throughout
   - Suggestion: Extract to `WebSocketConstants` configuration file

---

### 9. app/frontend/processes/dashboard/dashboard-compute.process.ts (582 LOC) - TypeScript/Utility - Dashboard

**Purpose**: Process-layer dashboard data computation wrapper that delegates to `computeFullDashboardData()` while handling data transformation, caching, and error management specific to process concerns.

**Why It Exists**: Separates process-level orchestration from pure computation logic; provides caching and error handling at process layer.

**Violation Scores**:

- **DRY Violations: ⭐⭐** - Duplicates computation patterns from main compute.ts; similar trend calculations, filtering logic, aggregation patterns appear in both files. Parsing functions duplicated. Constants repeated between files.
- **SoC Violations: ⭐⭐⭐** - Mostly focused on dashboard computation orchestration but mixes process-level caching, error handling, data transformation, and direct computation logic together.
- **Modularity Violations: ⭐⭐⭐** - Moderate coupling to compute.ts main function; tightly integrated with data types; difficult to reuse computation logic separately from process management.

**Refactoring Effort**: 🟡 **Medium** (3-5 days) - 582 LOC; moderate complexity; mostly organizational; risk of duplication with main compute.ts.

**Analysis**:

This file demonstrates process-layer pattern but creates duplication concerns. While separation of process orchestration from pure computation is good architectural practice, the implementation results in similar logic existing in two files.

The file should primarily orchestrate and delegate to `compute.ts` but instead reimplements some computation logic. For example, vacation slot calculations (lines 33-69) duplicate logic from main file; date extraction functions repeat.

**Critical Refactoring Blocks**:

1. **Lines 1-100** (100 LOC - type definitions and helpers)

   - Issue: Duplicates types and helpers from main compute.ts
   - Suggestion: Import shared types from main file; avoid duplication

2. **Lines 100-250** (150 LOC - data transformation)

   - Issue: Similar transformation logic to main compute; redundant processing
   - Suggestion: Have process layer only orchestrate; push transformation to compute.ts

3. **Lines 250-400** (150 LOC - trend calculation wrapper)

   - Issue: Wraps trend logic but reimplements similar patterns
   - Suggestion: Use main `computeFullDashboardData()` directly; process layer only handles caching/error handling

4. **Lines 400-582** (182 LOC - edge case handling)
   - Issue: Complex null checks and edge cases that might exist in main file too
   - Suggestion: Push edge case handling to main compute function; process layer only orchestrates

---

### 10. app/frontend/widgets/calendar/hooks/use-calendar-events.ts (557 LOC) - TypeScript/Hook - Calendar

**Purpose**: Custom hook managing calendar event processing including data fetching, filtering, transformation, and synchronization with reservation/conversation/vacation data.

**Why It Exists**: Encapsulates calendar event logic in reusable hook; handles complex data mapping between domain entities and calendar format.

**Violation Scores**:

- **DRY Violations: ⭐⭐⭐** - Some signature computation duplication with other hooks; event filtering patterns mostly well-extracted. Minimal copy-paste; good abstraction of common patterns.
- **SoC Violations: ⭐⭐⭐⭐** - Clear separation: data fetching, transformation, filtering each have distinct responsibilities. State management isolated. Processing logic well-extracted.
- **Modularity Violations: ⭐⭐⭐** - Good hook design but could benefit from extracting event processing strategy into separate module; caching logic could be extracted; integration between reservation/conversation/vacation processing tightly coupled.

**Refactoring Effort**: 🟡 **Medium** (3-5 days) - 557 LOC, good SoC, mostly organizational improvements, low risk.

**Analysis**:

This hook demonstrates solid React patterns. The separation between data fetching, transformation, and caching is clean. Event processing logic (signature computation, change detection) is well-extracted into helper functions outside the hook.

The main opportunity is extracting event processing strategies. Reservations, conversations, and vacations each have distinct processing logic that could be organized as separate processor classes/strategies. This would improve reusability and testability.

**Critical Refactoring Blocks**:

1. **Lines 53-100** (47 LOC - signature computation)

   - Issue: Duplicates similar logic from other hooks
   - Suggestion: Extract to shared `EventSignatureComputer` utility

2. **Lines 100-250** (150 LOC - cache invalidation and update logic)

   - Issue: Complex state management logic intertwined with data processing
   - Suggestion: Extract `EventCacheManager` service handling invalidation/update patterns

3. **Lines 250-400** (150 LOC - event transformation from different data types)

   - Issue: Separate transformers for reservations, conversations, vacations but not clearly abstracted
   - Suggestion: Create `ReservationEventProcessor`, `ConversationEventProcessor`, `VacationEventProcessor` classes implementing common interface

4. **Lines 400-557** (157 LOC - integration with data providers)
   - Issue: Hook integration with multiple data providers creates coupling
   - Suggestion: Inject event processors as dependencies; decouple from specific data sources

---

## Cross-File Patterns

### Common Violations Across Multiple Files

1. **Duplicate Date/Time Handling**

   - Appears in: compute.ts, dashboard-compute.process.ts, use-calendar-events.ts, calendar-dnd.service.ts
   - **Recommendation**: Create shared `DateTimeUtility` module with standardized date parsing, formatting, range calculation

2. **State Management Duplication**

   - Appears in: use-websocket-data.ts, use-calendar-events.ts, document-save.process.ts
   - **Recommendation**: Extract common `CacheManager` or `StateOrchestrator` pattern

3. **Error Handling Pattern Repetition**

   - Appears in: service_utils.py, realtime.py, views.py, use-websocket-data.ts
   - **Recommendation**: Create error handling middleware/decorators to reduce boilerplate

4. **Retry Logic Duplication**
   - Appears in: document-save.process.ts, use-websocket-data.ts, realtime.py
   - **Recommendation**: Extract reusable `RetryOrchestrator` utility

### Architectural Recommendations

1. **Python Backend**

   - Split `service_utils.py` (1173 LOC) into domain-specific service modules
   - Refactor `views.py` (844 LOC) into domain routers (ReservationRouter, ConversationRouter, etc.)
   - Extract WebSocket logic from `realtime.py` into separate connection manager and event processor

2. **TypeScript Frontend**

   - Consolidate duplicate computation logic between `compute.ts` and `dashboard-compute.process.ts`
   - Extract shared utilities (date handling, signature computation, caching) to library modules
   - Split large hooks into smaller, composable utilities
   - Create event processor strategies for calendar/document/reservation handling

3. **Cross-Layer**
   - Establish clear domain boundaries in both frontend and backend
   - Extract shared constants and configuration
   - Implement dependency injection pattern more consistently
   - Create separate modules for each domain (reservations, conversations, documents, etc.)

---

## Implementation Priority

### Phase 1: High-Risk, High-Impact (Week 1-2)

1. **Refactor app/views.py** - Split into domain routers; reduces API coupling
2. **Extract app/utils/service_utils.py** - Create domain-specific services; improves backend modularity

### Phase 2: Medium-Risk, Medium-Impact (Week 3-4)

3. **Consolidate dashboard computation** - Merge compute.ts and dashboard-compute.process.ts duplicate logic
4. **Extract WebSocket management** - Separate connection from events in realtime.py

### Phase 3: Low-Risk, High-Maintainability (Week 5+)

5. **Extract shared utilities** - Date handling, error handling, retry logic
6. **Refactor calendar event processing** - Create processor strategies
7. **Optimize i18n structure** - Split by feature domains

---

## Conclusion

The codebase demonstrates good architectural intentions but shows signs of organic growth without periodic refactoring. Average file complexity (3.0/5.0 rating) indicates moderate violation of core principles. The backend (Python) shows more severe violations due to god-file patterns in `views.py` and `service_utils.py`. The frontend (TypeScript) shows better organization with violations more localized to large hooks and utilities.

**Overall Recommendation**: Schedule 2-3 week refactoring sprint focusing on Python backend architecture first, then consolidate frontend utilities. Estimated effort: 15-25 developer-days across 4-5 team members working in parallel on separate domains.
