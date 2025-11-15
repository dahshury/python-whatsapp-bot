# Top 10 Largest Files - Refactoring Analysis

**Generated**: 2025-01-27
**Command Run**: `tokei -f -s code`

______________________________________________________________________

## Python - Backend Services

| Rank | File Path                                              | Responsibilities                                                                                                           | LOC  | DRY    | SoC    | Mod    | Avg | Effort      | Priority Score | Key Refactoring Needs                                                                                       |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ------ | ------ | --- | ----------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | app/utils/service_utils.py                             | Centralized utility functions for reservations, conversations, date/time parsing, vacation checks, and customer management | 1184 | ⭐⭐   | ⭐     | ⭐     | 1.3 | ⚫ Critical | 6.7            | Extract domain-specific utilities into separate modules (reservations, conversations, date/time, vacations) |
| 2    | app/views.py                                           | FastAPI router handling webhooks, WhatsApp messaging, reservations, customers, conversations, and vacation management      | 846  | ⭐⭐⭐ | ⭐     | ⭐⭐   | 2.0 | 🔴 High     | 4.0            | Split into domain-specific routers (webhooks, reservations, customers, conversations, vacations)            |
| 3    | app/services/domain/reservation/reservation_service.py | Domain service for reservation CRUD operations, validation, availability checking, and business rule enforcement           | 783  | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium   | 2.3            | Extract undo operations and complex validation logic into separate classes                                  |
| 4    | app/utils/realtime.py                                  | WebSocket connection management, real-time event broadcasting, notification persistence, and calendar event handling       | 714  | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🔴 High     | 3.3            | Separate WebSocket protocol handling from business logic, extract notification persistence                  |
| 5    | app/utils/whatsapp_utils.py                            | WhatsApp API integration for sending messages, locations, templates, typing indicators, and message processing             | 521  | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium   | 2.3            | Extract message processing logic from API client, separate typing indicator logic                           |

______________________________________________________________________

## TypeScript - Frontend Components & Hooks

| Rank | File Path                                                             | Responsibilities                                                                                                       | LOC | DRY    | SoC    | Mod    | Avg | Effort    | Priority Score | Key Refactoring Needs                                                                          |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --- | ------ | ------ | ------ | --- | --------- | -------------- | ---------------------------------------------------------------------------------------------- |
| 1    | app/frontend/features/data-table/hooks/use-data-table-save-handler.ts | Handles data table save operations, reservation mutations, customer phone number changes, and calendar synchronization | 951 | ⭐⭐   | ⭐⭐   | ⭐⭐   | 2.0 | 🔴 High   | 4.0            | Extract customer phone modification logic, separate save orchestration from mutation execution |
| 2    | app/frontend/features/calendar/hooks/useCalendarEvents.ts             | Manages calendar event state, data fetching, cache synchronization, event processing, and customer name resolution     | 683 | ⭐⭐⭐ | ⭐⭐   | ⭐⭐   | 2.3 | 🔴 High   | 3.3            | Extract cache management logic, separate event processing from state management                |
| 3    | app/frontend/features/calendar/lib/reservation-cache-sync.ts          | Synchronizes reservation cache with real-time events, handles period-based queries, and manages cache invalidation     | 601 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium | 2.3            | Extract period descriptor resolution, separate cache update logic from event normalization     |
| 4    | app/frontend/shared/libs/calendar/calendar-config.ts                  | Calendar configuration utilities for business hours, slot times, hidden days, Ramadan detection, and Hijri conversions | 550 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0 | 🟡 Medium | 2.3            | Extract Hijri conversion logic, separate Ramadan detection from business hours calculation     |
| 5    | app/frontend/features/documents/hooks/useDocumentCustomerRow.ts       | Manages customer row data in document editor, handles data loading, grid synchronization, and phone number updates     | 520 | ⭐⭐⭐ | ⭐⭐   | ⭐⭐⭐ | 2.7 | 🟡 Medium | 2.7            | Extract grid synchronization logic, separate data loading from UI state management             |

______________________________________________________________________

## Detailed Analysis

### 1. app/utils/service_utils.py (1184 LOC) - Utility Module - Core Infrastructure

**Responsibilities**: Provides centralized utility functions for reservations, conversations, date/time parsing (Gregorian/Hijri), vacation period checks, customer management, phone validation, and time slot generation.

**Purpose**: Acts as a catch-all utility module containing business logic that spans multiple domains. Originally created to avoid circular dependencies, but has grown into a monolithic utility file.

**Why It Exists**: Historical accumulation of shared functions that didn't fit cleanly into domain services. Functions were added here to avoid refactoring existing code.

**Violation Scores**:

- DRY Violations: ⭐⭐ - Multiple similar date parsing patterns, repeated time slot filtering logic, duplicated vacation checking code
- SoC Violations: ⭐ - Mixes reservation logic, conversation logic, date/time utilities, vacation management, customer operations, and phone validation in a single file
- Modularity Violations: ⭐ - Extremely high coupling (imported by 20+ modules), poor cohesion (unrelated functions grouped together), difficult to test in isolation

**Refactoring Effort**: ⚫ Critical (2+ weeks) - File is imported by many modules, requires careful dependency analysis and gradual migration strategy

**Analysis**:
This file is a classic "god object" anti-pattern. It contains 30+ functions spanning multiple domains:

- Reservation operations (`get_all_reservations`, `get_tomorrow_reservations`, `delete_reservation`)
- Conversation management (`get_all_conversations`, `append_message`, `get_calendar_conversation_events`)
- Date/time parsing (`parse_time`, `parse_date`, `parse_gregorian_date`, `parse_hijri_date`, `normalize_time_format`)
- Vacation management (`is_vacation_period`, `find_vacation_end_date`, `format_enhanced_vacation_message`)
- Customer operations (`get_all_customer_names`, `make_thread`)
- Phone validation (`is_valid_number`)
- Time slot generation (`get_time_slots`, `filter_past_time_slots`)

The file violates Single Responsibility Principle severely - it's impossible to understand what this file does without reading all 1184 lines. Functions are tightly coupled through shared imports and global state (`global_locks`).

**Critical Refactoring Blocks**:

1. **Lines 165-314** (150 LOC) - `get_all_reservations` function

   - Issue: Complex reservation query logic mixed with document status checking, violates SoC
   - Suggestion: Extract to `app/services/domain/reservation/reservation_query_service.py`

1. **Lines 317-413** (97 LOC) - `get_all_conversations` function

   - Issue: Conversation retrieval logic with complex filtering, violates SoC
   - Suggestion: Extract to `app/services/domain/conversation/conversation_query_service.py`

1. **Lines 703-840** (138 LOC) - `parse_time` function

   - Issue: Extremely complex time parsing with multiple fallback strategies, violates DRY (repeated parsing patterns)
   - Suggestion: Extract to `app/utils/date_time/time_parser.py` with strategy pattern for different formats

1. **Lines 904-1008** (105 LOC) - Date parsing functions (`parse_gregorian_date`, `parse_hijri_date`, `parse_date`)

   - Issue: Multiple date parsing functions with similar structure, violates DRY
   - Suggestion: Extract to `app/utils/date_time/date_parser.py` with unified interface

1. **Lines 1172-1282** (111 LOC) - `get_time_slots` function

   - Issue: Complex business hours logic mixed with vacation checking and Ramadan detection, violates SoC
   - Suggestion: Extract to `app/services/domain/availability/time_slot_service.py`

______________________________________________________________________

### 2. app/views.py (846 LOC) - Router Module - API Layer

**Responsibilities**: FastAPI router handling webhook verification, WhatsApp message processing, reservation CRUD endpoints, customer management, conversation endpoints, vacation period management, and various utility endpoints.

**Purpose**: Main API entry point for the application, routing HTTP requests to appropriate service functions.

**Why It Exists**: Centralized API routing file that grew organically as new endpoints were added. Follows FastAPI convention but lacks domain separation.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated error handling patterns, but mostly acceptable
- SoC Violations: ⭐ - Mixes webhook handling, reservation API, customer API, conversation API, vacation API, and utility endpoints in single router
- Modularity Violations: ⭐⭐ - High coupling (depends on many services), but router pattern is acceptable; could be better organized

**Refactoring Effort**: 🔴 High (1-2 weeks) - Requires creating multiple routers and updating imports, but clear separation boundaries exist

**Analysis**:
This file contains 20+ endpoint handlers covering multiple domains:

- Webhook endpoints (`/webhook` GET/POST)
- WhatsApp messaging (`/whatsapp/message`, `/whatsapp/location`, `/whatsapp/template`)
- Reservations (`/reserve`, `/reservations`, `/reservations/{wa_id}/cancel`, `/reservations/{wa_id}/modify`)
- Customers (`/customers/{wa_id}`, `/customers/names`, `/customers/{wa_id}/stats`)
- Conversations (`/conversations/{wa_id}`, `/conversations/calendar/events`)
- Vacations (`/vacations`, `/update-vacation-periods`, `/undo-vacation-update`)
- Phone operations (`/phone/stats`, `/phone/search`, `/phone/recent`, `/phone/all`)

The router violates RESTful design principles by mixing resource-based endpoints with action-based endpoints. Error handling is inconsistent across endpoints.

**Critical Refactoring Blocks**:

1. **Lines 111-203** (93 LOC) - Webhook POST handler

   - Issue: Complex webhook processing logic mixed with semaphore management and background task orchestration, violates SoC
   - Suggestion: Extract webhook processing to `app/routers/webhook_router.py`

1. **Lines 371-415** (45 LOC) - Reservation creation endpoint

   - Issue: Request validation and normalization mixed with service call, violates SoC
   - Suggestion: Extract to `app/routers/reservation_router.py` with dedicated validation middleware

1. **Lines 488-572** (85 LOC) - Phone search/all endpoints

   - Issue: Complex filtering logic in router, violates SoC (should be in service layer)
   - Suggestion: Move filtering logic to `PhoneSearchService`, keep router thin

1. **Lines 619-755** (137 LOC) - Customer PUT endpoint

   - Issue: Complex fast-path optimization logic mixed with domain service calls, violates SoC
   - Suggestion: Extract fast-path logic to service layer, keep router as thin adapter

1. **Lines 866-999** (134 LOC) - Vacation update/undo endpoints

   - Issue: Date normalization and validation logic in router, violates SoC
   - Suggestion: Extract to `app/routers/vacation_router.py` with service-layer validation

______________________________________________________________________

### 3. app/services/domain/reservation/reservation_service.py (783 LOC) - Domain Service - Reservation Domain

**Responsibilities**: Domain service for reservation business operations including creation, modification, cancellation, undo operations, availability checking, and business rule enforcement.

**Purpose**: Encapsulates reservation business logic and coordinates with repositories and other domain services.

**Why It Exists**: Part of domain-driven design refactoring to separate business logic from API layer. Handles complex reservation workflows.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated validation patterns, but mostly well-extracted
- SoC Violations: ⭐⭐⭐ - Clear domain focus, but mixes CRUD operations, undo operations, and validation
- Modularity Violations: ⭐⭐⭐ - Good dependency injection, but methods are large (some >100 lines)

**Refactoring Effort**: 🟡 Medium (2-5 days) - Well-structured but needs method extraction and undo operation separation

**Analysis**:
This is a well-structured domain service following DDD principles. However, it contains several large methods that mix concerns:

- `reserve_time_slot` (228 lines) handles validation, availability checking, modification fallback, reinstatement logic, and broadcasting
- `modify_reservation` (245 lines) handles validation, date/time changes, availability checking, name updates, type updates, and broadcasting
- `cancel_reservation` (190 lines) handles multiple cancellation scenarios (by ID, by date, all) with complex logic

The undo operations (`undo_cancel_reservation_by_id`, `undo_reserve_time_slot_by_id`) are mixed with main operations, making the class harder to understand.

**Critical Refactoring Blocks**:

1. **Lines 116-354** (239 LOC) - `reserve_time_slot` method

   - Issue: Extremely long method mixing validation, availability checking, modification fallback, reinstatement, and creation logic, violates SoC
   - Suggestion: Extract modification fallback to `_handle_existing_reservation`, reinstatement to `_reinstatement_cancelled_reservation`, creation to `_create_new_reservation`

1. **Lines 356-615** (260 LOC) - `modify_reservation` method

   - Issue: Long method handling multiple modification types (date/time, name, type) with complex validation, violates SoC
   - Suggestion: Extract to separate methods: `_modify_reservation_date_time`, `_modify_reservation_name`, `_modify_reservation_type`

1. **Lines 617-808** (192 LOC) - `cancel_reservation` method

   - Issue: Handles three different cancellation scenarios (by ID, by date, all) with duplicated logic, violates DRY
   - Suggestion: Extract common cancellation logic to `_cancel_reservation_by_id` helper, use it from all three paths

1. **Lines 810-909** (100 LOC) - `undo_cancel_reservation_by_id` method

   - Issue: Undo logic mixed with main service operations, violates SoC
   - Suggestion: Extract undo operations to `app/services/domain/reservation/reservation_undo_service.py`

1. **Lines 911-964** (54 LOC) - `undo_reserve_time_slot_by_id` method

   - Issue: Undo logic mixed with main service operations, violates SoC
   - Suggestion: Move to undo service alongside `undo_cancel_reservation_by_id`

______________________________________________________________________

### 4. app/utils/realtime.py (714 LOC) - Infrastructure Module - Real-time Communication

**Responsibilities**: WebSocket connection management, real-time event broadcasting, notification persistence, reservation event deduplication, and calendar event handling via WebSocket.

**Purpose**: Manages real-time communication infrastructure for the application, handling WebSocket connections and broadcasting events to connected clients.

**Why It Exists**: Centralized real-time communication layer to support live updates across the application without polling.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated WebSocket message handling patterns, but mostly acceptable
- SoC Violations: ⭐⭐ - Mixes WebSocket protocol handling, business logic (reservation modification, cancellation, message sending), and notification persistence
- Modularity Violations: ⭐⭐ - High coupling (depends on database models, services), but infrastructure concern is acceptable

**Refactoring Effort**: 🔴 High (1-2 weeks) - Requires separating protocol handling from business logic, extracting notification persistence

**Analysis**:
This file handles multiple concerns:

- WebSocket connection lifecycle (`connect`, `disconnect`, `broadcast`)
- Event broadcasting with filtering and deduplication
- Notification persistence to database
- WebSocket message protocol handling (`set_filter`, `ping`, `get_snapshot`, `modify_reservation`, `cancel_reservation`, `conversation_send_message`, `vacation_update`)
- Reservation event deduplication logic

The WebSocket endpoint handler (lines 320-773) is extremely long (454 lines) and handles 8+ different message types, mixing protocol concerns with business logic.

**Critical Refactoring Blocks**:

1. **Lines 98-247** (150 LOC) - `broadcast` method

   - Issue: Mixes event broadcasting, reservation deduplication, and notification persistence, violates SoC
   - Suggestion: Extract notification persistence to `NotificationPersistenceService`, extract deduplication to `ReservationEventDeduplicator`

1. **Lines 320-773** (454 LOC) - `websocket_endpoint` function

   - Issue: Extremely long function handling 8+ message types with business logic mixed in, violates SoC and Modularity
   - Suggestion: Extract message handlers to separate classes: `WebSocketMessageRouter` with handlers for each message type (`ModifyReservationHandler`, `CancelReservationHandler`, etc.)

1. **Lines 394-471** (78 LOC) - `modify_reservation` WebSocket handler

   - Issue: Business logic (reservation modification) in infrastructure layer, violates SoC
   - Suggestion: Extract to `WebSocketHandlers.modify_reservation` that delegates to domain service

1. **Lines 473-523** (51 LOC) - `cancel_reservation` WebSocket handler

   - Issue: Business logic in infrastructure layer, violates SoC
   - Suggestion: Extract to `WebSocketHandlers.cancel_reservation` that delegates to domain service

1. **Lines 525-640** (116 LOC) - `conversation_send_message` WebSocket handler

   - Issue: WhatsApp API calls and message persistence in WebSocket handler, violates SoC
   - Suggestion: Extract to `WebSocketHandlers.send_message` that delegates to messaging service

______________________________________________________________________

### 5. app/frontend/features/data-table/hooks/use-data-table-save-handler.ts (951 LOC) - React Hook - Data Table Feature

**Responsibilities**: Handles data table save operations, reservation mutations (create/modify/cancel), customer phone number changes, calendar synchronization, and cache management.

**Purpose**: Orchestrates complex save operations for the data table editor, coordinating between grid state, calendar API, and backend mutations.

**Why It Exists**: Centralized save handler to manage complex interactions between data grid, calendar, and backend when saving reservation changes.

**Violation Scores**:

- DRY Violations: ⭐⭐ - Repeated cache rekeying patterns, similar mutation error handling
- SoC Violations: ⭐⭐ - Mixes data extraction, mutation orchestration, cache management, and calendar synchronization
- Modularity Violations: ⭐⭐ - High coupling (depends on calendar API, query client, mutations), but hook pattern is acceptable

**Refactoring Effort**: 🔴 High (1-2 weeks) - Requires extracting customer phone modification logic and separating concerns

**Analysis**:
This hook is extremely complex, handling:

- Customer phone number modification with cache rekeying (lines 90-421, 332 LOC)
- Modification data extraction (lines 424-603, 180 LOC)
- Creation data extraction (lines 606-669, 64 LOC)
- Save orchestration (lines 678-1063, 386 LOC)

The `modifyCustomerWaId` function is particularly problematic - it handles cache rekeying for multiple query keys, calendar API updates, and conversation state updates, violating Single Responsibility Principle.

**Critical Refactoring Blocks**:

1. **Lines 90-421** (332 LOC) - `modifyCustomerWaId` function

   - Issue: Extremely long function handling customer phone changes, cache rekeying, calendar updates, and conversation state, violates SoC and Modularity
   - Suggestion: Extract to `useCustomerPhoneModification` hook, separate cache rekeying to `customerCacheUtils.rekeyAllCaches`

1. **Lines 424-603** (180 LOC) - `extractModificationData` function

   - Issue: Complex data extraction logic mixing date/time parsing, phone normalization, and event construction, violates SoC
   - Suggestion: Extract to `reservationDataExtractors.extractModificationData` utility module

1. **Lines 678-1063** (386 LOC) - `handleSaveChanges` function

   - Issue: Extremely long function orchestrating cancellations, modifications, additions, and phone changes, violates SoC
   - Suggestion: Extract to separate functions: `handleCancellations`, `handleModifications`, `handleAdditions`, `handlePhoneChanges`

1. **Lines 232-256** (25 LOC) - Cache rekeying logic (repeated pattern)

   - Issue: Repeated cache rekeying pattern in multiple places, violates DRY
   - Suggestion: Extract to `customerCacheUtils.rekeyReservationMap` utility function

1. **Lines 946-999** (54 LOC) - Calendar API update logic

   - Issue: Calendar API manipulation mixed with save orchestration, violates SoC
   - Suggestion: Extract to `calendarSyncUtils.applyModificationsToCalendar` utility

______________________________________________________________________

### 6. app/utils/whatsapp_utils.py (521 LOC) - Utility Module - WhatsApp Integration

**Responsibilities**: WhatsApp API integration for sending messages, locations, templates, typing indicators, message processing, and API configuration testing.

**Purpose**: Provides abstraction layer over WhatsApp Graph API, handling authentication, request formatting, and error handling.

**Why It Exists**: Centralized WhatsApp API client to avoid duplicating API integration code across the application.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Well-extracted functions, minimal duplication
- SoC Violations: ⭐⭐⭐ - Clear focus on WhatsApp API integration, but mixes message processing with API client
- Modularity Violations: ⭐⭐⭐ - Good separation, reusable API client functions

**Refactoring Effort**: 🟡 Medium (2-5 days) - Extract message processing logic, separate typing indicator concerns

**Analysis**:
This file is relatively well-structured but mixes two concerns:

- WhatsApp API client functions (`send_whatsapp_message`, `send_whatsapp_location`, `send_whatsapp_template`, `mark_message_as_read`)
- Message processing logic (`process_whatsapp_message`, `generate_response`)

The `process_whatsapp_message` function (lines 389-485) handles message processing, LLM integration, and typing indicators, which could be separated.

**Critical Refactoring Blocks**:

1. **Lines 232-330** (99 LOC) - `_send_whatsapp_request` helper

   - Issue: Complex error handling and response processing, but acceptable for infrastructure code
   - Suggestion: Consider extracting error handling to `WhatsAppErrorHandler` class for better testability

1. **Lines 389-485** (97 LOC) - `process_whatsapp_message` function

   - Issue: Mixes message processing, LLM integration, and typing indicator logic, violates SoC
   - Suggestion: Extract to `app/services/whatsapp/whatsapp_message_processor.py`, separate typing indicator to `WhatsAppTypingService`

1. **Lines 588-642** (55 LOC) - `generate_response` function

   - Issue: LLM integration logic in WhatsApp utils, violates SoC
   - Suggestion: Extract to `app/services/llm/llm_response_generator.py` or keep in existing LLM service

______________________________________________________________________

### 7. app/frontend/features/calendar/hooks/useCalendarEvents.ts (683 LOC) - React Hook - Calendar Feature

**Responsibilities**: Manages calendar event state, data fetching with period-based queries, cache synchronization, event processing, customer name resolution, and loading state management.

**Purpose**: Central hook for calendar event management, coordinating data fetching, caching, and event generation.

**Why It Exists**: Complex calendar event management requiring coordination between multiple data sources (reservations, conversations, vacations) with period-based caching.

**Violation Scores**:

- DRY Violations: ✅ Resolved - Cache update patterns extracted to `calendar-event-cache.service.ts`
- SoC Violations: ✅ Resolved - Separated into data layer (`useCalendarEventsData`), state layer (`useCalendarEventStateMachine`), and orchestrator (`useCalendarEvents`)
- Modularity Violations: ✅ Resolved - Reduced coupling through service extraction and clear layer boundaries

**Refactoring Status**: ✅ **COMPLETED** - See `docs/useCalendarEvents-refactor.md` for details

**Current Structure**:

- `useCalendarEvents.ts`: 97 lines (orchestrator hook)
- `useCalendarEventsData.ts`: 437 lines (data fetching & processing)
- `useCalendarEventStateMachine.ts`: 216 lines (state management)
- Services: `calendar-event-cache.service.ts`, `calendar-customer-name.service.ts`, `calendar-event-processing.service.ts`
- Libs: `reservation-normalizers.ts`
- Types: `calendar-events.types.ts`

**Analysis**:
This hook orchestrates complex calendar event management:

- Period-based data fetching with sliding window prefetch
- Cache synchronization across multiple periods
- Customer name resolution with fallback logic
- Event processing and generation
- Loading and error state management

The hook mixes concerns - it's both a data fetcher and a state manager. The cache synchronization logic (lines 278-381) is particularly complex, handling period eviction and merging.

**Critical Refactoring Blocks**:

1. **Lines 278-381** (104 LOC) - Cache synchronization useMemo

   - Issue: Complex cache merging logic mixing period eviction, data merging, and deduplication, violates SoC
   - Suggestion: Extract to `useCalendarCacheSync` hook or `calendarCacheUtils.mergePeriods` utility

1. **Lines 426-469** (44 LOC) - Customer name resolution logic

   - Issue: Complex name resolution with fallback logic mixed with event processing, violates SoC
   - Suggestion: Extract to `useCustomerNameResolution` hook or `customerNameUtils.resolveEffectiveNames`

1. **Lines 606-665** (60 LOC) - Event processing useMemo

   - Issue: Event generation logic mixed with state management, violates SoC
   - Suggestion: Extract event processing to `useProcessedCalendarEvents` hook that takes raw data and returns events

1. **Lines 726-749** (24 LOC) - Refresh logic

   - Issue: Query invalidation logic in main hook, violates SoC
   - Suggestion: Extract to `useCalendarRefresh` hook

______________________________________________________________________

### 8. app/frontend/features/calendar/lib/reservation-cache-sync.ts (601 LOC) - Cache Synchronizer - Calendar Feature

**Responsibilities**: Synchronizes reservation cache with real-time events, handles period-based queries, manages cache updates, and normalizes reservation data.

**Purpose**: Keeps TanStack Query cache in sync with WebSocket events, handling complex period-based query invalidation and updates.

**Why It Exists**: Complex cache synchronization logic required to support period-based calendar queries while maintaining real-time updates.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Well-structured with minimal duplication
- SoC Violations: ⭐⭐⭐ - Clear focus on cache synchronization, good separation
- Modularity Violations: ⭐⭐⭐ - Good class structure, clear interfaces

**Refactoring Effort**: 🟡 Medium (2-5 days) - Extract period descriptor resolution and improve method organization

**Analysis**:
This is a well-structured class following Single Responsibility Principle. However, some methods are complex:

- `normalizeAction` (lines 144-194) handles event normalization
- `resolveDescriptor` (lines 528-569) handles query key parsing
- `applyReservationToDataset` (lines 322-395) handles cache updates

The class could benefit from extracting some helper methods, but overall structure is good.

**Critical Refactoring Blocks**:

1. **Lines 528-569** (42 LOC) - `resolveDescriptor` method

   - Issue: Complex query key parsing logic, could be extracted for better testability
   - Suggestion: Extract to `QueryKeyParser` utility class

1. **Lines 322-395** (74 LOC) - `applyReservationToDataset` method

   - Issue: Complex cache update logic with date range checking, could be simplified
   - Suggestion: Extract date range checking to `_isReservationInPeriod` helper method

1. **Lines 144-194** (51 LOC) - `normalizeAction` method

   - Issue: Complex event normalization with multiple conditional paths, could be simplified
   - Suggestion: Extract to separate methods: `_normalizeSyncAction`, `_normalizePurgeAction`

______________________________________________________________________

### 9. app/frontend/shared/libs/calendar/calendar-config.ts (550 LOC) - Configuration Utility - Calendar Domain

**Responsibilities**: Calendar configuration utilities for business hours, slot times, hidden days, Ramadan detection, Hijri calendar conversions, and date range calculations.

**Purpose**: Provides calendar configuration logic supporting business hours, custom ranges, Ramadan adjustments, and Hijri calendar integration.

**Why It Exists**: Centralized calendar configuration to support complex business rules including Ramadan hours, custom date ranges, and day-specific configurations.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated date calculation patterns, but mostly acceptable
- SoC Violations: ⭐⭐⭐ - Clear focus on calendar configuration, good separation
- Modularity Violations: ⭐⭐⭐ - Well-modularized functions, clear interfaces

**Refactoring Effort**: 🟡 Medium (2-5 days) - Extract Hijri conversion logic and Ramadan detection

**Analysis**:
This file is well-structured with clear function boundaries. However, it mixes concerns:

- Business hours calculation
- Hijri calendar conversion (lines 512-604)
- Ramadan detection (lines 322-333, 650-661)
- Date range calculations

The Hijri conversion functions are complex and could be extracted to a separate module.

**Critical Refactoring Blocks**:

1. **Lines 512-604** (93 LOC) - Hijri conversion functions (`gregorianToJDN`, `islamicToJDN`, `jdnToIslamic`)

   - Issue: Complex calendar conversion logic mixed with business hours configuration, violates SoC
   - Suggestion: Extract to `app/frontend/shared/libs/calendar/hijri-converter.ts`

1. **Lines 322-333, 650-661** (24 LOC) - Ramadan detection logic

   - Issue: Ramadan detection scattered across multiple functions, violates DRY
   - Suggestion: Extract to `ramadanUtils.isRamadan` and `ramadanUtils.getRamadanBusinessHours`

1. **Lines 408-488** (81 LOC) - `subtractRamadanFromNormal` function

   - Issue: Complex date range subtraction logic, could be simplified
   - Suggestion: Extract interval merging to `dateRangeUtils.mergeIntervals` helper

______________________________________________________________________

### 10. app/frontend/features/documents/hooks/useDocumentCustomerRow.ts (520 LOC) - React Hook - Documents Feature

**Responsibilities**: Manages customer row data in document editor, handles data loading, grid synchronization, phone number updates, and editing state management.

**Purpose**: Coordinates customer data between backend, data grid, and document editor, handling complex synchronization requirements.

**Why It Exists**: Complex integration between document editor grid and customer data, requiring careful state synchronization and event handling.

**Violation Scores**:

- DRY Violations: ⭐⭐⭐ - Some repeated grid update patterns, but mostly acceptable
- SoC Violations: ⭐⭐ - Mixes data loading, grid synchronization, phone updates, and editing state management
- Modularity Violations: ⭐⭐⭐ - Good hook structure, but high coupling to grid API

**Refactoring Effort**: 🟡 Medium (2-5 days) - Extract grid synchronization logic and separate concerns

**Analysis**:
This hook handles multiple concerns:

- Customer data loading (lines 268-334)
- Grid synchronization (lines 159-266, 336-346, 349-514)
- Phone number updates (lines 446-507)
- Editing state management

The grid synchronization logic is repeated in multiple places (applying customer row, clearing fields, updating phone), violating DRY.

**Critical Refactoring Blocks**:

1. **Lines 159-266** (108 LOC) - `applyCustomerRow` function

   - Issue: Complex grid synchronization logic mixing data source updates, provider updates, and grid API calls, violates SoC
   - Suggestion: Extract to `gridSyncUtils.applyCustomerRow` utility function

1. **Lines 349-514** (166 LOC) - Phone column update effect

   - Issue: Extremely long effect handling phone updates, grid synchronization, and editing state, violates SoC
   - Suggestion: Extract phone update logic to `usePhoneColumnSync` hook

1. **Lines 358-420** (63 LOC) - Grid clearing logic (repeated pattern)

   - Issue: Repeated grid clearing pattern, violates DRY
   - Suggestion: Extract to `gridSyncUtils.clearCustomerRow` utility function

1. **Lines 446-507** (62 LOC) - Phone value setting logic

   - Issue: Complex phone update logic with suppression flags, violates SoC
   - Suggestion: Extract to `phoneUpdateUtils.setPhoneValue` utility function

______________________________________________________________________

## Summary

The analysis reveals several critical refactoring opportunities:

1. **Highest Priority**: `service_utils.py` (Priority Score: 6.7) - This file is a "god object" containing 30+ functions across multiple domains. It requires critical refactoring to extract domain-specific utilities.

1. **High Priority**: `views.py` (Priority Score: 4.0) and `use-data-table-save-handler.ts` (Priority Score: 4.0) - Both mix multiple concerns and would benefit from domain-based splitting.

1. **Medium Priority**: The remaining files have moderate violations but are generally well-structured. They would benefit from method extraction and concern separation rather than major architectural changes.

The codebase shows signs of organic growth with utility files accumulating functions over time. A systematic refactoring approach focusing on domain separation would significantly improve maintainability.
