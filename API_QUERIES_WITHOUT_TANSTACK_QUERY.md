# API Queries Without TanStack Query

This document identifies all API queries in the frontend that do NOT use TanStack Query.

## Summary

Found **1 main category** of API calls that don't use TanStack Query:

1. Infrastructure layer calls (acceptable)

---

## 1. Infrastructure Layer (Acceptable)

### 1.1 Chat Adapter - Message Send Fallback ✅ **REFACTORED**

**File:** `app/frontend/features/chat/services/chat.adapter.ts`  
**Line:** 44  
**Call:**

```typescript
const response = await this.httpPort.post<{
  success?: boolean;
  message?: string;
}>("/api/message/send", { wa_id: waId, text });
```

**Context:** Fallback HTTP call when WebSocket fails  
**Status:** ✅ **Refactored** - Now uses `httpAdapter` (HttpClientPort) instead of direct `fetch()` calls  
**Benefits:** Consistent with infrastructure layer patterns, uses dependency injection, easier to test and mock

---

### 1.2 Metrics Adapter

**File:** `app/frontend/features/metrics/services/metrics.adapter.ts`  
**Line:** 38  
**Call:**

```typescript
return await httpAdapter.get<PrometheusMetrics>("/api/metrics");
```

**Context:** Used by infrastructure layer, not directly in components  
**Status:** Acceptable - infrastructure layer can use direct HTTP calls

---

### 1.3 Dashboard Service

**File:** `app/frontend/features/dashboard/services/dashboard.service.ts`  
**Line:** 6  
**Call:**

```typescript
const data = await apiClient.get<{...}>('/stats')
```

**Context:** Used by `useDashboardStats` hook which wraps it in TanStack Query  
**Status:** Acceptable - service layer, wrapped in hook

---

## 2. Next.js API Routes (Server-Side)

These files are server-side Next.js API routes and don't need TanStack Query:

- `app/frontend/app/api/**/*.ts` - All API route handlers

---

## 3. Functions Used by TanStack Query (Acceptable)

These functions in `app/frontend/shared/api/endpoints.api.ts` are used BY TanStack Query hooks/mutations:

- `fetchReservations()` - Used by TanStack Query hooks
- `reserveTimeSlot()` - Used by `useCreateReservation` mutation
- `modifyReservation()` - Used by `useMutateReservation` mutation
- `cancelReservation()` - Used by `useCancelReservation` mutation
- `fetchVacations()` - Used by `useCalendarVacations` hook
- `fetchCustomer()` - Used by `document.adapter.ts` which is wrapped in TanStack Query
- `saveCustomerDocument()` - Used by `document.adapter.ts` which is wrapped in TanStack Query

**Status:** All acceptable - they're the implementation layer for TanStack Query

---

## Completed Refactoring

### ✅ Refactored: Chat Adapter Message Send Fallback (`chat.adapter.ts:44`)

- **Before:** Direct `fetch()` call in ChatAdapter
- **After:** Uses `httpAdapter.post()` via dependency injection (HttpClientPort)
- **Benefits:** Consistent infrastructure layer patterns, better testability, dependency injection

### ✅ Fixed: Chat Sidebar Typing Indicator (`chat-sidebar-content.tsx:243`)

- **Before:** Direct `fetch()` call in useEffect
- **After:** Wrapped in `useTypingIndicator` hook using `useMutation` from TanStack Query
- **Benefits:** Better error handling, retry logic, and cache invalidation

### ✅ Fixed: Document Customer Row Grid Data (`useDocumentCustomerRow.ts:135`)

- **Before:** Direct API call via `createDocumentsService().getByWaId()`
- **After:** Uses `useCustomerGridData` hook with TanStack Query
- **Benefits:** Automatic caching, loading states, and refetch capabilities

### ✅ Removed: Document Load Service (`document-load.service.ts`)

- Removed exports from `app/frontend/features/documents/services/index.ts`
- Service was deprecated and is no longer used

---

## Files Using TanStack Query (Reference)

These files correctly use TanStack Query:

- `app/frontend/features/calendar/hooks/useCalendarReservations.ts`
- `app/frontend/features/calendar/hooks/useCalendarConversationEvents.ts`
- `app/frontend/features/calendar/hooks/useCalendarVacations.ts`
- `app/frontend/features/chat/hooks/useConversationMessages.ts`
- `app/frontend/features/chat/hooks/useCustomerNames.ts`
- `app/frontend/features/chat/hooks/useSendMessage.ts`
- `app/frontend/features/chat/hooks/useTypingIndicator.ts` ✅ **NEW**
- `app/frontend/features/phone-selector/hooks/useBackendPhoneSearch.ts`
- `app/frontend/features/phone-selector/hooks/usePhoneStats.ts`
- `app/frontend/features/phone-selector/hooks/useRecentContacts.ts`
- `app/frontend/features/phone-selector/hooks/useAllContacts.ts`
- `app/frontend/features/documents/hooks/useDocuments.ts`
- `app/frontend/features/documents/hooks/useDocumentLoad.ts`
- `app/frontend/features/documents/hooks/useCustomerGridData.ts` ✅ **NEW**
- `app/frontend/features/reservations/hooks/useCreateReservation.ts`
- `app/frontend/features/reservations/hooks/useCancelReservation.ts`
- `app/frontend/features/reservations/hooks/useMutateReservation.ts`
- `app/frontend/features/dashboard/hooks/useDashboardStats.ts`
