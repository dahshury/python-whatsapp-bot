# Top 10 Largest Files - Refactoring Analysis

**Generated**: 2025-01-27
**Command Run**: `tokei -f -s code`

---

## Python - Backend Services & Utilities

| Rank | File Path                                                | Responsibilities                                                                                                                   | LOC  | DRY    | SoC    | Mod    | Avg | Effort      | Priority Score | Key Refactoring Needs                                                                                                    |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ------ | ------ | --- | ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | `app/utils/service_utils.py`                             | Centralized utility functions for reservations, conversations, customers, date/time parsing, vacation checks, and phone validation | 1170 | ⭐⭐   | ⭐     | ⭐     | 1.3 | ⚫ Critical | 6.5            | Extract domain-specific utilities into separate modules (reservation_utils, conversation_utils, date_utils, phone_utils) |
| 2    | `app/views.py`                                           | FastAPI route handlers for webhooks, WhatsApp messaging, reservations, customers, conversations, and vacation management           | 863  | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🔴 High     | 3.3            | Split into feature-based routers (reservations_router, customers_router, conversations_router, webhook_router)           |
| 3    | `app/utils/realtime.py`                                  | WebSocket connection management, real-time broadcasting, event deduplication, notification persistence, and metrics pushing        | 702  | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🔴 High     | 3.3            | Extract WebSocket message handlers into separate module, separate notification persistence logic                         |
| 4    | `app/services/domain/reservation/reservation_service.py` | Domain service for reservation business logic: creation, modification, cancellation, undo operations, and availability checking    | 645  | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium   | 2.3            | Extract undo operations into separate service, split modification logic into smaller methods                             |
| 5    | `app/utils/whatsapp_utils.py`                            | WhatsApp API integration: sending messages, locations, templates, typing indicators, message processing, and duplicate detection   | 516  | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium   | 2.3            | Extract message processing logic, separate API client from business logic                                                |
| 6    | `app/services/domain/customer/phone_search_service.py`   | Phone search service using PostgreSQL pg_trgm: fuzzy matching, recent contacts, pagination, and filtering                          | 454  | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium   | 2.3            | Extract SQL query building into separate query builder class, separate filtering logic                                   |

---

## TypeScript - Frontend Hooks & Services

| Rank | File Path                                                         | Responsibilities                                                                                                                 | LOC | DRY    | SoC    | Mod    | Avg | Effort    | Priority Score | Key Refactoring Needs                                                              |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --- | ------ | ------ | ------ | --- | --------- | -------------- | ---------------------------------------------------------------------------------- |
| 7    | `app/frontend/features/calendar/lib/reservation-cache-sync.ts`    | Reservation cache synchronization for TanStack Query, handles real-time updates, period-based queries, and cache invalidation    | 601 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium | 2.3            | Extract period descriptor resolution, split cache operations into separate methods |
| 8    | `app/frontend/features/calendar/hooks/useCalendarEvents.ts`       | Calendar events management hook: data fetching, period-based queries, event processing, state management, and cache coordination | 550 | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🟡 Medium | 3.3            | Extract event processing logic, separate cache management from hook logic          |
| 9    | `app/frontend/features/documents/hooks/useDocumentCustomerRow.ts` | Document customer row management: data source initialization, customer loading, grid synchronization, and phone number handling  | 510 | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🟡 Medium | 3.3            | Extract customer data loading logic, separate grid synchronization concerns        |

---

## TSX - Frontend Components

| Rank | File Path                                   | Responsibilities                                                                                                                            | LOC | DRY    | SoC    | Mod    | Avg | Effort    | Priority Score | Key Refactoring Needs                                             |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------ | ------ | ------ | --- | --------- | -------------- | ----------------------------------------------------------------- |
| 10   | `app/frontend/shared/ui/phone-combobox.tsx` | Phone number combobox component: country selection, phone search, validation, dropdown sizing, and controlled/uncontrolled state management | 601 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium | 2.3            | Extract dropdown sizing logic, separate country selector concerns |

---

## Detailed Analysis

### 1. `app/utils/service_utils.py` (1170 LOC) - Utility Module - Backend Infrastructure

**Responsibilities**: Centralized utility functions handling reservations, conversations, customer names, date/time parsing (Gregorian/Hijri), vacation period checks, phone validation, and time slot management.

**Purpose**: Provides shared utility functions used across the application for common operations like date parsing, reservation retrieval, conversation management, and business rule validation.

**Why It Exists**: Originally created as a catch-all utility module to avoid code duplication, but has grown into a monolithic file containing multiple unrelated concerns.

**Violation Scores**:

- DRY Violations: ⭐⭐ - Some duplication in date parsing logic, repeated error handling patterns, similar validation checks across functions
- SoC Violations: ⭐ - Multiple distinct concerns mixed: database access, business logic, date/time utilities, phone validation, vacation checks, reservation queries
- Modularity Violations: ⭐ - Poor cohesion (unrelated functions grouped together), high coupling (many functions depend on database models), difficult to test individual concerns

**Refactoring Effort**: ⚫ Critical (2+ weeks) - Large file with many dependencies, requires careful extraction to avoid breaking changes, needs comprehensive testing

**Analysis**:
This file is a classic "god object" anti-pattern, containing 20+ functions spanning multiple domains. Functions like `get_all_reservations`, `get_all_conversations`, `parse_time`, `parse_date`, `is_vacation_period`, and `is_valid_number` have no logical grouping beyond being "utilities." The file mixes database queries, business logic, date parsing, and validation concerns. Many functions directly access database models, creating tight coupling. The date/time parsing functions (`parse_time`, `parse_gregorian_date`, `parse_hijri_date`) contain complex logic that should be in a dedicated date utility module.

**Critical Refactoring Blocks**:

1. **Lines 165-311** (147 LOC) - `get_all_reservations`

   - Issue: Database access mixed with business logic, complex filtering logic, document status checking
   - Suggestion: Extract to `app/services/domain/reservation/reservation_query_service.py` as a repository pattern

2. **Lines 313-401** (89 LOC) - `get_all_conversations`

   - Issue: Database access mixed with filtering logic, complex date range handling
   - Suggestion: Extract to `app/services/domain/conversation/conversation_query_service.py`

3. **Lines 686-823** (138 LOC) - `parse_time` function

   - Issue: Complex time parsing logic with multiple fallback strategies, platform-specific formatting, Arabic AM/PM handling
   - Suggestion: Extract to `app/utils/date_time_utils.py` as a dedicated time parsing module

4. **Lines 885-997** (113 LOC) - Date parsing functions (`parse_gregorian_date`, `parse_hijri_date`, `parse_date`)

   - Issue: Date parsing logic mixed with other utilities, complex Hijri month name mapping
   - Suggestion: Extract to `app/utils/date_time_utils.py` alongside time parsing

5. **Lines 1143-1248** (106 LOC) - `get_time_slots` function
   - Issue: Complex business logic for time slot generation mixed with utility functions, Ramadan handling, schedule management
   - Suggestion: Extract to `app/services/domain/reservation/availability_service.py` (may already exist, consolidate)

---

### 2. `app/views.py` (863 LOC) - Router - API Layer

**Responsibilities**: FastAPI route handlers for webhooks, WhatsApp messaging, reservations, customers, conversations, vacation management, and various API endpoints.

**Purpose**: Main API entry point handling HTTP requests and coordinating with domain services.

**Why It Exists**: Central router file that grew to include all API endpoints, mixing webhook handling, REST API routes, and business logic coordination.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated error handling patterns, similar response formatting, but mostly acceptable
- SoC Violations: ⭐⭐ - API layer mixed with some business logic, webhook handling mixed with REST endpoints, but generally follows FastAPI patterns
- Modularity Violations: ⭐⭐ - Single large router file, but endpoints are logically grouped, moderate coupling to services

**Refactoring Effort**: 🔴 High (1-2 weeks) - Large router file, requires splitting into feature-based routers, needs careful dependency management

**Analysis**:
This file contains all API routes in a single router, which violates modularity principles. Routes are logically grouped by feature (webhooks, reservations, customers, conversations, vacations) but all in one file. The webhook handling logic (lines 58-203) is complex and could be extracted. Some endpoints contain business logic that should be in services (e.g., customer update logic in lines 650-781). The vacation period management endpoints (lines 825-1014) contain date normalization logic that should be in a service.

**Critical Refactoring Blocks**:

1. **Lines 58-203** (146 LOC) - Webhook handling (`webhook_get`, `webhook_post`)

   - Issue: Complex webhook verification and message processing logic mixed with route handlers, semaphore management
   - Suggestion: Extract to `app/routers/webhook.py` with separate handler functions

2. **Lines 650-781** (132 LOC) - Customer update endpoint (`api_put_customer`)

   - Issue: Complex business logic for document-only updates, name/age updates mixed with route handler, performance optimization code
   - Suggestion: Extract business logic to `CustomerService.update_customer()` method

3. **Lines 237-280** (44 LOC) - WhatsApp message sending endpoint

   - Issue: Message persistence and broadcasting logic mixed with route handler
   - Suggestion: Extract to service method, route handler should only coordinate

4. **Lines 825-1014** (190 LOC) - Vacation period management endpoints
   - Issue: Date normalization and DB operations mixed with route handlers, complex undo logic
   - Suggestion: Extract to `VacationService` with methods for update/undo operations

---

### 3. `app/utils/realtime.py` (702 LOC) - Service - Real-time Communication

**Responsibilities**: WebSocket connection management, real-time event broadcasting, event deduplication, notification persistence, metrics pushing, and message handling.

**Purpose**: Manages real-time communication between server and clients via WebSocket, handles event broadcasting and notification persistence.

**Why It Exists**: Centralized real-time communication service that handles WebSocket connections, event broadcasting, and notification storage.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated error handling, but generally well-structured
- SoC Violations: ⭐⭐ - WebSocket management, event broadcasting, notification persistence, and message handling mixed together
- Modularity Violations: ⭐⭐ - Single large class handling multiple concerns, but well-encapsulated

**Refactoring Effort**: 🔴 High (1-2 weeks) - Complex WebSocket logic, requires careful extraction of message handlers and notification logic

**Analysis**:
The `RealtimeManager` class handles multiple concerns: connection management, event broadcasting, notification persistence, and message handling. The WebSocket message handling logic (lines 320-759) is very long and handles many different message types (modify_reservation, cancel_reservation, conversation_send_message, secretary_typing, vacation_update, get_customer_document). The notification persistence logic (lines 199-246) is embedded in the broadcast method and could be extracted. The reservation event deduplication logic (lines 104-168) is complex and could be a separate concern.

**Critical Refactoring Blocks**:

1. **Lines 320-759** (440 LOC) - WebSocket message handling (`websocket_endpoint`)

   - Issue: Massive message handler with many different message types, complex logic for each type
   - Suggestion: Extract message handlers into separate modules: `websocket_handlers/reservation_handler.py`, `websocket_handlers/message_handler.py`, `websocket_handlers/vacation_handler.py`, `websocket_handlers/document_handler.py`

2. **Lines 199-246** (48 LOC) - Notification persistence logic

   - Issue: Notification persistence embedded in broadcast method, violates single responsibility
   - Suggestion: Extract to `NotificationPersistenceService` or decorator pattern

3. **Lines 98-258** (161 LOC) - `broadcast` method
   - Issue: Complex method handling event deduplication, broadcasting, notification persistence, and connection cleanup
   - Suggestion: Extract deduplication logic to separate method, extract notification persistence to service

---

### 4. `app/services/domain/reservation/reservation_service.py` (645 LOC) - Domain Service - Reservation Domain

**Responsibilities**: Domain service for reservation business operations: creation, modification, cancellation, undo operations, availability checking, and customer coordination.

**Purpose**: Encapsulates reservation business logic and coordinates with repositories and other services.

**Why It Exists**: Domain service following DDD principles, but has grown large with multiple operation types and undo functionality.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated validation patterns, but generally well-extracted
- SoC Violations: ⭐⭐⭐ - Clear domain focus, but undo operations mixed with main operations
- Modularity Violations: ⭐⭐⭐ - Well-structured service, but large methods, some coupling to availability service

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but large, requires method extraction and potential undo service separation

**Analysis**:
This is a well-structured domain service following DDD principles. The main violations are method size (some methods exceed 200 lines) and mixing undo operations with main operations. The `modify_reservation` method (lines 324-551) is 228 lines and handles many concerns: validation, finding reservation, applying modifications, checking availability. The undo operations (lines 705-829) could be in a separate service. The `reserve_time_slot` method (lines 118-321) handles creation, modification, and reinstatement logic.

**Critical Refactoring Blocks**:

1. **Lines 324-551** (228 LOC) - `modify_reservation` method

   - Issue: Very large method handling multiple modification scenarios, complex validation and update logic
   - Suggestion: Extract into smaller methods: `_validate_modification_inputs`, `_find_reservation_to_modify`, `_apply_modifications`, `_check_availability_for_modification`

2. **Lines 705-829** (125 LOC) - Undo operations (`undo_cancel_reservation_by_id`, `undo_reserve_time_slot_by_id`)

   - Issue: Undo operations mixed with main service operations
   - Suggestion: Extract to `ReservationUndoService` or separate methods in dedicated module

3. **Lines 118-321** (204 LOC) - `reserve_time_slot` method
   - Issue: Large method handling creation, modification, and reinstatement logic
   - Suggestion: Extract reinstatement logic to `_reinstate_cancelled_reservation`, extract modification path to separate method

---

### 5. `app/utils/whatsapp_utils.py` (516 LOC) - Utility - WhatsApp Integration

**Responsibilities**: WhatsApp API integration: sending messages, locations, templates, typing indicators, message processing, duplicate detection, and response generation.

**Purpose**: Provides WhatsApp API client functionality and message processing utilities.

**Why It Exists**: Centralized WhatsApp API integration to avoid code duplication across the application.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Generally well-extracted, some repeated error handling patterns
- SoC Violations: ⭐⭐⭐ - Clear focus on WhatsApp integration, but message processing mixed with API client
- Modularity Violations: ⭐⭐⭐ - Well-structured utilities, but could separate API client from message processing

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but could benefit from separating API client from business logic

**Analysis**:
This file is generally well-structured with clear separation between API client functions and message processing. The main issue is that message processing logic (`process_whatsapp_message`, `generate_response`) is mixed with API client functions. The duplicate message detection logic (lines 22-43) uses global state and could be extracted. The `_send_whatsapp_request` helper (lines 232-330) is well-designed but could be part of a WhatsApp API client class.

**Critical Refactoring Blocks**:

1. **Lines 389-481** (93 LOC) - `process_whatsapp_message` function

   - Issue: Message processing logic mixed with API utilities, handles multiple concerns (media handling, typing indicators, LLM calls)
   - Suggestion: Extract to `app/services/whatsapp/message_processor.py`

2. **Lines 583-637** (55 LOC) - `generate_response` function

   - Issue: LLM response generation logic mixed with WhatsApp utilities, duplicate detection
   - Suggestion: Extract to `app/services/llm/response_generator.py` or keep in LLM service

3. **Lines 22-43** (22 LOC) - Duplicate message detection (global state)
   - Issue: In-memory duplicate detection using global state, not thread-safe
   - Suggestion: Extract to `MessageDeduplicationService` class with proper locking

---

### 6. `app/services/domain/customer/phone_search_service.py` (454 LOC) - Domain Service - Customer Domain

**Responsibilities**: Phone search service using PostgreSQL pg_trgm: fuzzy matching on phones and names, recent contacts retrieval, pagination, and filtering by country/registration/date range.

**Purpose**: Provides phone number search functionality with fuzzy matching capabilities using PostgreSQL trigram similarity.

**Why It Exists**: Service for searching customer phone numbers and names with fuzzy matching, replacing old search implementation.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Generally well-extracted, some repeated SQL query patterns
- SoC Violations: ⭐⭐⭐ - Clear focus on phone search, but SQL query building mixed with business logic
- Modularity Violations: ⭐⭐⭐ - Well-structured service, but large SQL queries embedded in methods

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but could benefit from extracting SQL query building

**Analysis**:
This is a well-structured domain service with clear responsibilities. The main issue is that large SQL queries are embedded directly in methods, making them hard to test and maintain. The `search_phones` method (lines 47-173) contains a complex SQL query with CTEs. The `get_all_contacts` method (lines 241-531) has very long SQL queries with dynamic WHERE clause building. The country filtering logic (lines 445-529) is done in Python after fetching, which is inefficient.

**Critical Refactoring Blocks**:

1. **Lines 81-140** (60 LOC) - `search_phones` SQL query

   - Issue: Complex SQL query with multiple CTEs embedded in method
   - Suggestion: Extract to `PhoneSearchQueryBuilder` class or separate SQL file

2. **Lines 241-531** (291 LOC) - `get_all_contacts` method

   - Issue: Very long method with complex SQL query building, Python-based country filtering
   - Suggestion: Extract SQL query building to `PhoneQueryBuilder` class, move country filtering to SQL

3. **Lines 445-529** (85 LOC) - Country filtering in Python
   - Issue: Inefficient Python-based country filtering after fetching all results
   - Suggestion: Add country_code column to customers table, filter in SQL

---

### 7. `app/frontend/features/calendar/lib/reservation-cache-sync.ts` (601 LOC) - Service - Calendar Feature

**Responsibilities**: Reservation cache synchronization for TanStack Query, handles real-time updates, period-based queries, cache invalidation, and reservation data merging.

**Purpose**: Synchronizes reservation cache with real-time events, ensuring UI stays up-to-date without unnecessary refetches.

**Why It Exists**: Complex cache synchronization logic needed to handle real-time reservation updates across multiple period-based queries.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Generally well-extracted, some repeated reservation matching logic
- SoC Violations: ⭐⭐⭐ - Clear focus on cache synchronization, but period resolution mixed with cache operations
- Modularity Violations: ⭐⭐⭐ - Well-structured class, but large methods, some complex interdependencies

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but large, requires method extraction

**Analysis**:
This is a well-designed cache synchronization class. The main issues are method size and mixing period descriptor resolution with cache operations. The `applyReservationToDataset` method (lines 322-394) is complex and handles multiple scenarios (period vs legacy, cancellation vs creation). The `resolveDescriptor` method (lines 528-569) contains complex period descriptor resolution logic that could be extracted.

**Critical Refactoring Blocks**:

1. **Lines 322-394** (73 LOC) - `applyReservationToDataset` method

   - Issue: Complex method handling multiple scenarios (period vs legacy, cancellation vs creation)
   - Suggestion: Extract into smaller methods: `_applyToPeriodDataset`, `_applyToLegacyDataset`, `_handleCancellation`, `_handleCreation`

2. **Lines 528-569** (42 LOC) - `resolveDescriptor` method

   - Issue: Complex period descriptor resolution logic mixed with cache operations
   - Suggestion: Extract to `PeriodDescriptorResolver` utility class

3. **Lines 144-194** (51 LOC) - `normalizeAction` method
   - Issue: Complex action normalization with multiple conditional paths
   - Suggestion: Extract to smaller methods: `_resolveReservationId`, `_resolveWaId`, `_buildReservationFromPayload`

---

### 8. `app/frontend/features/calendar/hooks/useCalendarEvents.ts` (550 LOC) - Hook - Calendar Feature

**Responsibilities**: Calendar events management hook: data fetching, period-based queries, event processing, state management, cache coordination, and WebSocket invalidation.

**Purpose**: Central hook for managing calendar events state, coordinating between multiple data sources and processing events for display.

**Why It Exists**: Complex hook needed to coordinate period-based queries, cache management, and event processing for the calendar feature.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Generally well-extracted, some repeated cache merging logic
- SoC Violations: ⭐⭐ - Data fetching, cache management, event processing, and state management mixed together
- Modularity Violations: ⭐⭐ - Large hook with multiple responsibilities, complex dependencies

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured hook but large, requires extraction of cache management and event processing logic

**Analysis**:
This hook handles multiple concerns: data fetching, cache management, event processing, and state management. The cache merging logic (lines 267-370) is complex and handles period detection, cache updates, and data aggregation. The event processing useMemo (lines 503-526) depends on many inputs and could be extracted. The processing options memoization (lines 432-471) is complex and tracks many dependencies.

**Critical Refactoring Blocks**:

1. **Lines 267-370** (104 LOC) - Cache merging logic (useMemo)

   - Issue: Complex cache merging logic with period detection and data aggregation
   - Suggestion: Extract to `useCalendarCacheMerger.ts` hook or `calendarCacheUtils.ts`

2. **Lines 503-526** (24 LOC) - Event processing useMemo

   - Issue: Complex event processing depending on many inputs
   - Suggestion: Extract event processing to `useCalendarEventProcessor.ts` hook

3. **Lines 432-471** (40 LOC) - Processing options memoization
   - Issue: Complex memoization with ref tracking to prevent re-renders
   - Suggestion: Extract to `useCalendarProcessingOptions.ts` hook

---

### 9. `app/frontend/features/documents/hooks/useDocumentCustomerRow.ts` (510 LOC) - Hook - Documents Feature

**Responsibilities**: Document customer row management: data source initialization, customer loading, grid synchronization, phone number handling, and event dispatching.

**Purpose**: Manages customer row data for the documents grid, handles loading, synchronization, and phone number updates.

**Why It Exists**: Complex hook needed to coordinate between customer data, grid data source, and phone selector component.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated grid update patterns, but generally acceptable
- SoC Violations: ⭐⭐ - Customer loading, grid synchronization, phone handling, and event dispatching mixed together
- Modularity Violations: ⭐⭐ - Large hook with multiple responsibilities, complex dependencies on grid API

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but large, requires extraction of customer loading and grid synchronization logic

**Analysis**:
This hook handles customer data loading, grid synchronization, and phone number management. The customer loading logic (lines 250-316) is complex and handles async loading with state management and error handling. The grid synchronization logic (lines 141-248) handles multiple concerns: data source updates, provider refresh, and grid API updates. The phone number update effect (lines 331-496) is very large and handles phone updates, grid updates, and event dispatching.

**Critical Refactoring Blocks**:

1. **Lines 250-316** (67 LOC) - `loadCustomerData` function

   - Issue: Complex async customer loading with state management and error handling
   - Suggestion: Extract to `useCustomerDataLoader.ts` hook

2. **Lines 141-248** (108 LOC) - `applyCustomerRow` function

   - Issue: Complex function handling data source updates, provider refresh, and grid API updates
   - Suggestion: Extract grid synchronization to `useGridSynchronization.ts` hook

3. **Lines 331-496** (166 LOC) - Phone number update effect
   - Issue: Very large effect handling phone number updates, grid updates, and event dispatching
   - Suggestion: Extract phone handling to `useDocumentPhoneHandler.ts` hook

---

### 10. `app/frontend/shared/ui/phone-combobox.tsx` (601 LOC) - Component - UI Library

**Responsibilities**: Phone number combobox component: country selection, phone search, validation, dropdown sizing, controlled/uncontrolled state management, and phone formatting.

**Purpose**: Reusable phone number selector component with country selection and search functionality.

**Why It Exists**: Complex UI component needed for phone number selection with multiple features: country selection, search, validation, and dynamic sizing.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Generally well-extracted, some repeated phone formatting logic
- SoC Violations: ⭐⭐⭐ - Clear component focus, but dropdown sizing logic could be separated
- Modularity Violations: ⭐⭐⭐ - Well-structured component, but large, could benefit from sub-components

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured component but large, requires extraction of dropdown sizing and phone formatting logic

**Analysis**:
This is a well-structured React component following good practices. The main issue is size - it handles many concerns: state management, dropdown sizing, phone formatting, country selection, and search. The dropdown sizing logic (lines 425-518) is complex and uses canvas measurement for text width calculation. The country selection handler (lines 334-410) contains complex phone number conversion logic. The phone selection handlers (lines 269-332) handle both controlled and uncontrolled modes.

**Critical Refactoring Blocks**:

1. **Lines 425-518** (94 LOC) - Dropdown width calculation (useLayoutEffect)

   - Issue: Complex dropdown sizing logic with canvas measurement and empty state calculations
   - Suggestion: Extract to `useDropdownSizing.ts` hook

2. **Lines 334-410** (77 LOC) - Country selection handler

   - Issue: Complex handler with phone number conversion logic
   - Suggestion: Extract phone conversion logic to `phoneConversionUtils.ts`

3. **Lines 269-332** (64 LOC) - Phone selection handlers
   - Issue: Multiple handlers with similar logic for controlled/uncontrolled modes
   - Suggestion: Extract to `usePhoneSelection.ts` hook with mode abstraction

---

## Summary

The analysis reveals several patterns:

1. **Backend Python files** tend to have severe SoC violations, mixing database access, business logic, and utilities
2. **Frontend TypeScript hooks** frequently combine data fetching, cache management, and state management
3. **Frontend TSX components** are generally well-structured but can be large
4. **Utility modules** have grown into "god objects" with multiple unrelated concerns

**Recommended Refactoring Priority**:

1. `service_utils.py` (highest priority - critical violations, 6.5 score)
2. `views.py` and `realtime.py` (high priority - significant violations, 3.3 score)
3. Remaining files (medium priority - moderate violations with good structure, 2.3-3.3 scores)

**Key Refactoring Strategies**:

- Extract domain-specific utilities into feature modules
- Split large router files into feature-based routers
- Extract complex hooks into smaller, composable hooks
- Separate API client logic from business logic
- Use service classes and repository patterns for data access
- Extract SQL query building into query builder classes
- Separate cache management from data fetching logic
