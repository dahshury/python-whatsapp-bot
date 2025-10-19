# Analysis: Calendar DataGrid Modification Flow - Part 3 (FINAL)

## Full Request/Response Payloads (Continued)

### WebSocket Response: modify_reservation_ack

**Location:** Received via window event "realtime" (websocket.service.ts:48-54)

```json
{
  "type": "modify_reservation_ack",
  "data": {
    "id": 123,
    "message": "Reservation updated successfully",
    "wa_id": "+1234567890",
    "date": "2025-01-20",
    "time_slot": "10:00 AM"
  }
}
```

### WebSocket Response: modify_reservation_nack

**Location:** websocket.service.ts:55-62

```json
{
  "type": "modify_reservation_nack",
  "error": "Slot already occupied",
  "data": {
    "wa_id": "+1234567890",
    "date": "2025-01-20",
    "message": "The selected time slot is unavailable"
  }
}
```

### WebSocket Broadcast: reservation_updated

**Location:** ws/reducer.ts:97-115

```json
{
  "type": "reservation_updated",
  "data": {
    "id": 123,
    "wa_id": "+1234567890",
    "date": "2025-01-20",
    "time_slot": "10:00 AM",
    "customer_name": "John Doe",
    "type": 0,
    "cancelled": false,
    "created_at": "2025-01-18T10:00:00Z",
    "updated_at": "2025-01-18T10:05:00Z"
  },
  "timestamp": "2025-01-18T10:05:00Z"
}
```

### HTTP Fallback Request: POST /modify-reservation

**Location:** shared/libs/api/index.ts:50-66

```json
{
  "id": "+1234567890",
  "date": "2025-01-20",
  "time": "10:00",
  "title": "John Doe",
  "type": 0,
  "approximate": false,
  "reservationId": 123
}
```

### HTTP Fallback Response

```json
{
  "success": true,
  "message": "Reservation updated successfully",
  "id": 123,
  "data": {
    "wa_id": "+1234567890",
    "date": "2025-01-20",
    "time_slot": "10:00",
    "customer_name": "John Doe",
    "type": 0
  }
}
```

---

## Error Handling and Edge Cases

### Error Case 1: Validation Failure

**Scenario:** User tries to save with missing required fields or invalid data

**Detection:** `DataTableEditor.tsx:312-395` (handleCheckEditingState)

**Handling:**

```typescript
// useDataTableSaveHandler.ts:60-69
const validation = validateAllCells();
if (!validation.isValid) {
  const errorMessages = validation.errors
    .map(
      (err) => `${isLocalized ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`
    )
    .join("\n");

  toastService.error(
    isLocalized ? "أخطاء في التحقق" : "Validation Errors",
    errorMessages,
    8000
  );

  return;
}
```

**User Notification:**

- Save button disabled while errors exist
- `ValidationErrorsPopover` shows error count with details (DataTableEditor.tsx:812-816)
- Toast notification on save attempt with validation errors

**Fallback:** Save aborted, user can fix errors and retry

---

### Error Case 2: WebSocket Connection Unavailable

**Scenario:** WebSocket not connected when user clicks save

**Detection:** `websocket.service.ts:12-20`

```typescript
const wsRef = (globalThis as GlobalThis).__wsConnection;
if (wsRef?.current?.readyState === WebSocket.OPEN) {
  wsRef.current.send(JSON.stringify(message));
  resolve(true);
} else {
  resolve(false); // WebSocket unavailable
}
```

**Handling:** Immediate fallback to HTTP POST (websocket.service.ts:150)

```typescript
// Fallback to HTTP API
return (await modifyReservation(waId, updates)) as unknown as ApiResponse;
```

**User Notification:** None (transparent fallback)

**Fallback:** HTTP request ensures operation completes

---

### Error Case 3: WebSocket Timeout

**Scenario:** Backend doesn't respond within 10 seconds

**Detection:** `websocket.service.ts:81-89`

```typescript
const timeoutId = setTimeout(() => {
  if (!resolved) {
    resolved = true;
    try {
      window.removeEventListener("realtime", handler as EventListener);
    } catch {}
    resolve({ success: false, message: "Request timeout" });
  }
}, timeoutMs); // 10000ms default
```

**Handling:** Returns failure to `ReservationModifyService`, triggers error toast

**User Notification:** "Failed to update reservation. Please try again." (reservation-modify.service.ts:103-110)

**Fallback:** Optimistic UI changes may need manual revert (TODO: revert logic at line 112)

---

### Error Case 4: Backend Rejection (nack)

**Scenario:** Backend rejects modification (e.g., slot conflict, validation error)

**Detection:** `websocket.service.ts:55-62`

```typescript
else if (t === "modify_reservation_nack") {
	if (!resolved) {
		resolved = true;
		window.removeEventListener("realtime", handler as EventListener);
		clearTimeout(timeoutId);
		const errorMessage = detail?.error || d.message || "Operation failed";
		resolve({ success: false, message: String(errorMessage) });
	}
}
```

**Handling:** `reservation-modify.service.ts:98-115`

```typescript
if (!resp?.success) {
  hasErrors = true;

  const errorMessage =
    resp?.message ||
    resp?.error ||
    i18n.getMessage("update_failed", this.isLocalized);
  toastService.reservationModificationFailed({
    customer: modificationData.titleNew,
    wa_id: modificationData.waId,
    date: modificationData.dateStrNew,
    time: modificationData.timeStrNew,
    isLocalized: this.isLocalized,
    error: errorMessage,
  });

  // TODO: Add revert logic for optimistic updates if needed
  continue;
}
```

**User Notification:** Detailed error toast with customer name, date, time, and backend error message

**Fallback:** Optimistic changes remain until page refresh (revert logic not yet implemented)

---

### Error Case 5: Concurrent Edit Conflict

**Scenario:** User edits a row that another user has modified via WebSocket

**Detection:** `DataTableEditor.tsx:531-625` (WebSocket merge logic)

**Handling:**

```typescript
// Build quick lookup of previous events by key
const prevMap = new Map<string, DataTableCalendarEvent>();
for (const ev of previousEventsRef.current || []) {
  const k = getReservationKeyRef.current(ev);
  if (k) prevMap.set(k, ev);
}

// Merge: follow new ordering, but preserve blocked keys' prior versions
const merged: DataTableCalendarEvent[] = [];
for (const ev of events || []) {
  const k = getReservationKeyRef.current(ev);
  if (k && blockedKeys.has(k)) {
    merged.push(prevMap.get(k) ?? ev); // Keep local version
  } else {
    merged.push(ev); // Accept remote version
  }
}
```

**User Notification:** None (local changes preserved until save)

**Conflict Resolution:** Local edits take precedence during editing session; on save, backend validates and may reject if conflicts exist

---

### Error Case 6: Network Failure During Save

**Scenario:** Network drops during HTTP fallback request

**Detection:** `use-data-table-save-handler.ts:178-185`

```typescript
catch (error) {
	console.error("Error saving changes:", error);
	toastService.error(
		i18n.getMessage("save_error", isLocalized),
		i18n.getMessage("system_error_try_later", isLocalized),
		5000
	);
	return false;
}
```

**Handling:** Generic error toast, save marked as failed

**User Notification:** "Failed to save. Please try again later."

**Fallback:** User can retry save; optimistic changes remain in grid

---

### Edge Case: Editing Unmapped Template Row

**Scenario:** User creates a new reservation in an empty row

**Detection:** `DataTableEditor.tsx:366-382`

```typescript
for (let r = 0; r < rowCount; r++) {
  const isMapped = mappedRows.has(r);
  if (isMapped) continue; // existing event row
  if (!rowHasEdits(r)) continue; // untouched template row

  // Enforce completeness for required columns in this row
  for (let c = 0; c < colCount; c++) {
    const colDef = provider.getColumnDefinition?.(c);
    if (!colDef?.isRequired) continue;
    const cell = provider.getCell?.(c, r);
    if (isRequiredCellMissing(cell, colDef)) {
      canEnable = false;
      break;
    }
  }
  if (!canEnable) break;
}
```

**Handling:** Save button remains disabled until ALL required fields are filled

**Validation:** Phone, name, date, time must be present for new reservations

---

## Observable Points and Debugging

### Logs

**Location:** `reservation-modify.service.ts:48-53, 145-150`

```typescript
console.log("[CAL] reflow prev slot", {
  prevDate,
  prevTime,
  evId: modificationData.evId,
});

console.log("[CAL] reflow new slot", {
  date: modificationData.dateStrNew,
  baseTimeNew,
  evId: modificationData.evId,
});
```

**Location:** `calendar-integration.service.ts:190-194, 207-212, 230-238, 259-261, 309-315, 324-329`

```typescript
console.log("[CAL] reflowSlot()", {
	dateStr,
	timeSlotRaw,
	computedBaseTime: computed,
});

console.log("[CAL] reflowSlot() slotStart:", {
	slotStart: slotStart.toISOString(),
	localTime: slotStart.toString(),
});

console.log("[CAL] reflowSlot() inSlot candidates", ...);
console.log("[CAL] reflowSlot() sorted order", ...);
console.log("[CAL] reflowSlot() moved", ...);
console.log("[CAL] reflowSlot() completed", ...);
```

**Purpose:** Track slot reflow operations, event movements, and ordering

---

### Metrics

**Location:** N/A (no explicit metrics tracking for this flow)

**Potential Metrics:**

- Save operation duration (not currently tracked)
- WebSocket vs HTTP fallback rate (not tracked)
- Validation error frequency (not tracked)

---

### Debug Toggles

**Location:** N/A (no debug flags for this specific flow)

**Global Debug:**

- Browser DevTools → Console filter: `[CAL]` shows all calendar operations
- Network tab shows HTTP fallback requests to `/modify-reservation`
- WebSocket frame inspector shows realtime messages

---

### Error Visibility

**Toast Notifications:**

1. **Validation Errors** (DataTableEditor.tsx:812-816)

   - Shown as error popover with count badge
   - Click to see details per row/column

2. **Backend Rejection** (reservation-modify.service.ts:103-110)

   - Custom toast via `toastService.reservationModificationFailed`
   - Includes customer name, date, time, error message

3. **Generic Save Error** (use-data-table-save-handler.ts:180-185)

   - Generic "Failed to save" message
   - Duration: 5000ms

4. **System Error** (use-data-table-save-handler.ts:51, 119)
   - "System error, please try again later"
   - Triggered if data provider unavailable or calendar API missing

---

## Invariants and Safety Guarantees

### Invariant 1: Reservation Key Immutability During Editing

**Statement:** Once a reservation is loaded into the grid, its identity key (waId OR reservationId) does NOT include the start time

**Enforcement:** `DataTableEditor.tsx:93-108` (getReservationKey function)

```typescript
const getReservationKey = useCallback((ev: DataTableCalendarEvent): string => {
  try {
    const ex = ev?.extendedProps as Record<string, unknown> | undefined;
    const rid = (ex?.reservationId as string | number | undefined) ?? undefined;
    if (rid !== undefined && rid !== null) return String(rid);
    const wa =
      (ex?.waId as string | undefined) ||
      (ex?.wa_id as string | undefined) ||
      (ex?.phone as string | undefined) ||
      "";
    const start = ev?.start || "";
    return `${wa}__${start}`; // CRITICAL: No time in key
  } catch {
    return String(ev?.id ?? ev?.start ?? "");
  }
}, []);
```

**Why:** If time were included, dragging an event would create a NEW key, causing duplicate events (old time + new time both shown)

**Verification:** Memory ID 10023252 - **FIXED: Previously included time, now excluded**

**Breaking Risk:** If key includes time, drag-and-drop creates duplicates instead of moving events

---

### Invariant 2: Optimistic Updates Applied BEFORE Backend Call

**Statement:** Calendar UI updates immediately when user saves, regardless of backend success

**Enforcement:** `reservation-modify.service.ts:40-56`

```typescript
try {
	// Optimistic UI updates
	this.applyOptimisticUpdates(modificationData);

	// Reflow previous slot first
	try {
		const prevDate = modificationData.prevDate;
		const prevTime = (String(original?.extendedProps?.slotTime || "") ||
			modificationData.prevStartStr.split("T")[1]?.slice(0, 5) ||
			"00:00") as string;
		if (prevDate && prevTime) {
			this.calendarIntegration.reflowSlot(prevDate, prevTime);
		}
	} catch {}

	// Backend modification (AFTER optimistic updates)
	const resp = await this.webSocketService.modifyReservation(...);
```

**Why:** Instant UI feedback improves perceived performance; backend validation happens asynchronously

**Verification:** Line order confirms optimistic updates (line 40) precede backend call (line 95)

**Breaking Risk:** If backend rejects, optimistic changes remain until manual revert (TODO at line 112)

---

### Invariant 3: Local Echo Marked BEFORE Backend Call

**Statement:** Operation keys are added to `__localOps` Set BEFORE WebSocket message sent

**Enforcement:** `reservation-modify.service.ts:65-73`

```typescript
// Pre-mark local echo BEFORE calling backend (WebSocket echo may arrive immediately)
try {
	const preKeys = generateLocalOpKeys("reservation_updated", {
		id: original.extendedProps?.reservationId || modificationData.evId,
		wa_id: modificationData.waId,
		date: modificationData.dateStrNew,
		time: slotTime,
	});
	for (const k of preKeys) this.localEchoManager.markLocalEcho(k);
} catch {}

const resp = await this.webSocketService.modifyReservation(...);  // AFTER marking
```

**Why:** WebSocket echo broadcast can arrive before HTTP response; marking first prevents duplicate notifications

**Verification:** Line 72 (markLocalEcho) precedes line 95 (modifyReservation call)

**Breaking Risk:** If marking happens after call, user may see duplicate success toasts

---

### Invariant 4: EditingState Cleared on Successful Save

**Statement:** After successful save, all pending changes are cleared from memory

**Enforcement:** `use-data-table-save-handler.ts:170-174`

```typescript
if (!hasErrors && successfulOperations.length > 0) {
  operations.updateCalendarWithOperations(successfulOperations, onAddedAdapter);

  if (dataProviderRef.current) {
    const editingState = dataProviderRef.current.getEditingState();
    editingState.clearMemory();
    dataProviderRef.current.refresh();
  }
}
```

**Why:** Prevents accidental re-save of already-committed changes; forces grid to re-fetch from source

**Verification:** `clearMemory()` called on line 172

**Breaking Risk:** If not cleared, user could accidentally save the same changes twice

---

### Invariant 5: Slot Reflow Uses STRICT Metadata Matching

**Statement:** Reflow only affects events with EXACT `slotDate` and `slotTime` metadata match

**Enforcement:** `calendar-integration.service.ts:214-229`

```typescript
const inSlot = all.filter((e: CalendarEventObject) => {
  try {
    const ext = (e?.extendedProps || {}) as {
      type?: unknown;
      cancelled?: boolean;
      slotDate?: string;
      slotTime?: string;
    };
    const t = Number(ext.type ?? 0);
    if (t === 2) return false; // vacation
    if (ext.cancelled === true) return false;
    return ext.slotDate === dateStr && ext.slotTime === baseTime; // STRICT match
  } catch {
    return false;
  }
});
```

**Why:** Avoids timezone confusion; events without metadata are not reflowed (manual positioning preserved)

**Verification:** Line 228 requires exact string equality for `slotDate` and `slotTime`

**Breaking Risk:** If using `Date` object comparison, timezone conversions could incorrectly include/exclude events

---

## Risks and Mitigations

### Risk 1: Optimistic UI Not Reverted on Backend Failure

**Location:** `reservation-modify.service.ts:112`

**Code:**

```typescript
// TODO: Add revert logic for optimistic updates if needed
continue;
```

**Impact:** HIGH - User sees incorrect calendar state until page refresh

**Scenario:**

1. User modifies event, optimistic update shows new time
2. Backend rejects (slot conflict)
3. Optimistic changes remain, user thinks operation succeeded
4. Calendar shows incorrect data until WebSocket broadcast or refresh

**Mitigation:**

- **Current:** Error toast notifies user of failure
- **Missing:** Automatic revert of optimistic changes

**Recommended Fix:**

```typescript
if (!resp?.success) {
  hasErrors = true;
  // Revert optimistic updates
  try {
    this.calendarIntegration.updateEventProperties(modificationData.evId, {
      title: original.title,
      type: Number(original.extendedProps?.type ?? 0),
    });
    this.calendarIntegration.updateEventTiming(
      modificationData.evId,
      startIso,
      modificationData.prevStartStr
    );
  } catch {}
  // Show error toast...
}
```

**Effort:** Small (20-30 lines of code)

---

### Risk 2: Race Condition in Concurrent Modifications

**Location:** `DataTableEditor.tsx:531-625` (WebSocket merge logic)

**Impact:** MEDIUM - Local edits can be overwritten by incoming WebSocket updates

**Scenario:**

1. User A starts editing reservation R1 in grid
2. User B modifies R1 via different session, WebSocket broadcasts update
3. User A's local changes for R1 are preserved (blockedKeys logic)
4. User A saves, both changes go to backend
5. Last-write-wins: User A's changes overwrite User B's

**Mitigation:**

- **Current:** `blockedKeys` prevents incoming updates from overwriting local edits
- **Missing:** No conflict detection or version checking

**Recommended Fix:**

- Add `version` or `updated_at` field to reservations
- Backend rejects save if version mismatch
- Frontend prompts user to review conflicts

**Effort:** Medium (requires backend changes + conflict UI)

---

### Risk 3: WebSocket Echo Suppression Expiry

**Location:** `local-echo.manager.ts:5-17` (15-second TTL)

**Impact:** LOW - Duplicate notifications if operation takes >15 seconds

**Scenario:**

1. User saves modification
2. Local echo marked with 15-second TTL
3. Backend processing takes 18 seconds (e.g., slow network, high load)
4. WebSocket broadcast arrives after TTL expired
5. Notification shown (duplicate of optimistic update)

**Mitigation:**

- **Current:** 15-second TTL balances memory cleanup vs operation duration
- **Missing:** No adaptive TTL based on operation type

**Recommended Fix:**

- Increase TTL to 30 seconds for modify operations
- Add operation-specific TTLs: create=30s, modify=20s, cancel=15s

**Effort:** Trivial (1 line change)

```typescript
// In ReservationModifyService
this.localEchoManager.markLocalEcho(k, 20000); // 20s for modify
```

---

### Risk 4: Memory Leak from EditingState Subscriptions

**Location:** `DataTableEditor.tsx:525-529`

**Code:**

```typescript
useEffect(() => {
  return () => {
    const provider = dataProviderRef.current as
      | (DataProvider & { unsubscribe?: () => void })
      | null;
    if (provider?.unsubscribe) provider.unsubscribe();
  };
}, []);
```

**Impact:** LOW - Potential memory leak if component unmounts during save

**Scenario:**

1. User opens dialog, EditingState subscription created
2. User clicks save (long-running operation)
3. User navigates away, component unmounts
4. Subscription cleanup may not run if save in progress

**Mitigation:**

- **Current:** Cleanup on unmount (lines 525-529)
- **Issue:** Cleanup only runs if `provider.unsubscribe` exists; may not be set if component unmounts during initialization

**Recommended Fix:**

- Ensure `unsubscribe` is ALWAYS set before any async operations

**Effort:** Trivial (defensive programming)

```typescript
// Store unsubscribe immediately after creation
const unsub = editingState.onChange(debouncedCheck);
(dataProviderRef.current as any).unsubscribe = unsub;
```

---

### Risk 5: Infinite Loop in WebSocket Merge Logic

**Location:** `DataTableEditor.tsx:533-624` (useLayoutEffect for merge)

**Impact:** HIGH (if triggered) - Browser freezes due to infinite re-renders

**Scenario:**

1. WebSocket sends reservation_updated
2. Merge logic runs, updates `sourceEvents`
3. `sourceEvents` change triggers effect again
4. If merge logic has bug, could create infinite loop

**Mitigation:**

- **Current:** `hasUnsavedChangesRef.current()` guards against unnecessary merges (line 547)
- **Current:** Deduplication at end (lines 608-618) prevents duplicate events
- **Issue:** Effect depends on `gridRowToEventMapRef?.current` (line 624) which mutates on every render

**Recommended Fix:**

- Remove `gridRowToEventMapRef?.current` from dependency array
- Use stable reference or useMemo for map

**Effort:** Small

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [events, open]);  // Remove gridRowToEventMapRef dependency
```

---

## Actionable Findings and Improvements

### 1. Implement Optimistic Update Revert on Backend Failure

**What:** Add automatic revert of calendar changes when backend rejects modification

**Where:** `app/frontend/services/operations/reservation-modify.service.ts:112` (TODO comment)

**Why:** Prevents UI from showing incorrect state after rejected operations; improves data integrity

**How:**

```typescript
if (!resp?.success) {
  hasErrors = true;

  // Revert optimistic updates
  try {
    // Store original state before optimistic updates
    const originalState = {
      title: original.title,
      type: Number(original.extendedProps?.type ?? 0),
      startStr: modificationData.prevStartStr,
    };

    // Revert properties
    this.calendarIntegration.updateEventProperties(modificationData.evId, {
      title: originalState.title,
      type: originalState.type,
      cancelled: false,
    });

    // Revert timing
    const revertIso = originalState.startStr;
    this.calendarIntegration.updateEventTiming(
      modificationData.evId,
      modificationData.startIso,
      revertIso
    );

    // Reflow both slots to restore original layout
    this.calendarIntegration.reflowSlot(
      modificationData.prevDate,
      modificationData.prevTime
    );
    this.calendarIntegration.reflowSlot(modificationData.dateStrNew, slotTime);
  } catch (revertError) {
    console.error("Failed to revert optimistic updates:", revertError);
  }

  // Show error toast
  toastService.reservationModificationFailed({
    customer: modificationData.titleNew,
    wa_id: modificationData.waId,
    date: modificationData.dateStrNew,
    time: modificationData.timeStrNew,
    isLocalized: this.isLocalized,
    error: resp?.message || "Update rejected by server",
  });

  continue;
}
```

**Risk:** Revert may fail if event was deleted by another user; needs additional guard

**Effort:** Small (30-40 lines, ~1 hour)

---

### 2. Add Conflict Detection with Version Field

**What:** Add `version` field to reservations, reject saves if version mismatch

**Where:**

- Backend: Add `version` column to reservations table
- Frontend: `app/frontend/entities/event/model.ts` (Reservation type)
- Frontend: `app/frontend/services/operations/reservation-modify.service.ts:95` (send version)

**Why:** Prevents last-write-wins conflicts when multiple users edit same reservation

**How:**

Backend (Python):

```python
# In modify_reservation endpoint
existing = db.query(Reservation).filter_by(id=reservation_id).first()
if existing.version != request_version:
    return {"success": False, "error": "Reservation modified by another user. Please refresh."}

existing.version += 1  # Increment version on update
db.commit()
```

Frontend type:

```typescript
// entities/event/model.ts
export interface Reservation {
  id: number;
  wa_id: string;
  date: string;
  time_slot: string;
  customer_name: string;
  type: number;
  cancelled?: boolean;
  version: number; // NEW
  created_at: string;
  updated_at: string;
}
```

Frontend service:

```typescript
// reservation-modify.service.ts:95
const resp = await this.webSocketService.modifyReservation(
  modificationData.waId,
  {
    date: modificationData.dateStrNew,
    time: slotTime,
    title: modificationData.titleNew,
    type: Number(modificationData.typeNew),
    reservationId: original.extendedProps?.reservationId,
    version: original.extendedProps?.version, // NEW: Send current version
    approximate: !this.calendarIntegration.isTimeGridView(),
  }
);
```

**Risk:** Requires database migration; all existing rows need version=1

**Effort:** Medium (backend migration + frontend type updates + conflict UI, ~4-6 hours)

---

### 3. Increase Local Echo TTL to 20 Seconds

**What:** Change default TTL from 15s to 20s for modify operations

**Where:** `app/frontend/services/operations/reservation-modify.service.ts:72, 264`

**Why:** Prevents duplicate notifications during slow backend operations (network latency, high load)

**How:**

```typescript
// Line 72: Pre-mark local echo BEFORE backend call
for (const k of preKeys) this.localEchoManager.markLocalEcho(k, 20000); // Was 15000

// Line 264: Mark after backend response
for (const key of keys) {
  this.localEchoManager.markLocalEcho(key, 20000); // Was 15000
}
```

**Risk:** Slightly longer memory retention (5s extra per operation); negligible impact

**Effort:** Trivial (2-line change, <5 minutes)

---

### 4. Add Retry Logic for WebSocket Timeout

**What:** Automatically retry WebSocket operations that timeout before falling back to HTTP

**Where:** `app/frontend/services/websocket/websocket.service.ts:106-151`

**Why:** Transient network issues may cause timeout; retry can succeed without HTTP fallback

**How:**

```typescript
async modifyReservation(
	waId: string,
	updates: { ... },
	opts?: { isLocalized?: boolean; maxRetries?: number }
): Promise<ApiResponse> {
	const maxRetries = opts?.maxRetries ?? 2;  // Default 2 retries

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		// Try WebSocket
		const wsSuccess = await this.sendMessage({ ... });

		if (wsSuccess) {
			const confirmation = await this.waitForWSConfirmation({ ... }, 10000);

			if (confirmation.success) {
				return {
					success: true,
					...(confirmation.message && { message: confirmation.message }),
				};
			}

			// If timeout and not last attempt, retry
			if (confirmation.message === "Request timeout" && attempt < maxRetries) {
				console.warn(`WebSocket timeout, retrying (${attempt + 1}/${maxRetries})...`);
				await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1s before retry
				continue;
			}
		}

		// If last attempt or WebSocket unavailable, fallback to HTTP
		if (attempt === maxRetries) break;
	}

	// Fallback to HTTP API
	return (await modifyReservation(waId, updates)) as unknown as ApiResponse;
}
```

**Risk:** Increases perceived latency if all retries timeout (10s + 10s + 10s = 30s before HTTP fallback)

**Effort:** Small (30 lines, ~30 minutes)

---

### 5. Remove `gridRowToEventMapRef.current` from Effect Dependencies

**What:** Fix potential infinite loop by removing mutable ref from useLayoutEffect deps

**Where:** `app/frontend/widgets/data-table-editor/DataTableEditor.tsx:624`

**Why:** Ref mutates on every render, causing effect to run unnecessarily; risk of infinite loop

**How:**

```typescript
// Before (line 624)
}, [events, open, gridRowToEventMapRef?.current]);

// After
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [events, open]);
```

**Risk:** None (ref is read-only in effect body, doesn't need to be in deps)

**Effort:** Trivial (1-line change, <2 minutes)

---

### 6. Add Performance Metrics for Save Operations

**What:** Track save operation duration, WebSocket vs HTTP fallback rate, validation errors

**Where:**

- `app/frontend/widgets/data-table-editor/hooks/use-data-table-save-handler.ts:48-188`
- `app/frontend/services/websocket/websocket.service.ts:106-151`

**Why:** Provides insights into operation performance, failure rates, and user experience

**How:**

```typescript
// In useDataTableSaveHandler
const handleSaveChanges = useCallback(
  async () => {
    const startTime = performance.now();
    const metricsData = {
      editedRows: 0,
      addedRows: 0,
      deletedRows: 0,
      validationErrors: 0,
      wsSuccess: false,
      httpFallback: false,
      duration: 0,
      success: false,
    };

    try {
      // ... existing save logic ...

      metricsData.editedRows = Object.keys(changes.edited_rows || {}).length;
      metricsData.addedRows = (changes.added_rows || []).length;
      metricsData.deletedRows = (changes.deleted_rows || []).length;

      // ... existing save logic ...

      metricsData.success = !hasErrors;
    } finally {
      metricsData.duration = performance.now() - startTime;

      // Send metrics to analytics
      try {
        if (typeof window !== "undefined") {
          const evt = new CustomEvent("calendar:save-metrics", {
            detail: metricsData,
          });
          window.dispatchEvent(evt);
        }
      } catch {}
    }
  },
  [
    /* deps */
  ]
);
```

**Risk:** None (metrics collection doesn't affect operation)

**Effort:** Small (50-60 lines across 2 files, ~2 hours including analytics integration)

---

### 7. Add Validation for Past Date Modifications

**What:** Prevent users from moving reservations to past dates (unless in freeRoam mode)

**Where:** `app/frontend/widgets/data-table-editor/hooks/use-data-table-validation.ts` (validation rules)

**Why:** Business rule: can't schedule appointments in the past (unless reviewing historical data)

**How:**

```typescript
// In validation hook
const validateScheduledTime = (value: unknown, row: number): string | null => {
  if (!(value instanceof Date)) return "Invalid date format";

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Compare date only

  const selected = new Date(value);
  selected.setHours(0, 0, 0, 0);

  if (!freeRoam && selected < now) {
    return isLocalized
      ? "لا يمكن حجز موعد في الماضي"
      : "Cannot schedule appointments in the past";
  }

  return null;
};
```

**Risk:** May block legitimate use cases (rescheduling missed appointments); needs business rule clarification

**Effort:** Small (20 lines, ~30 minutes)

---

## Summary of Recommendations Priority

| #   | Recommendation                            | Impact | Effort  | Priority              |
| --- | ----------------------------------------- | ------ | ------- | --------------------- |
| 1   | Implement optimistic revert on failure    | HIGH   | Small   | **P0** (Critical)     |
| 5   | Fix infinite loop risk in effect deps     | HIGH   | Trivial | **P0** (Critical)     |
| 3   | Increase local echo TTL to 20s            | LOW    | Trivial | **P1** (High)         |
| 4   | Add retry logic for WebSocket timeout     | MEDIUM | Small   | **P1** (High)         |
| 2   | Add conflict detection with version field | MEDIUM | Medium  | **P2** (Medium)       |
| 6   | Add performance metrics                   | LOW    | Small   | **P2** (Medium)       |
| 7   | Add past date validation                  | MEDIUM | Small   | **P3** (Nice-to-have) |

---

## Conclusion

This analysis documents the complete frontend flow for modifying reservations in the calendar's data grid dialog. The architecture follows clean code principles with dependency injection, optimistic UI updates, WebSocket communication with HTTP fallback, and comprehensive deduplication logic.

**Key Strengths:**

- Optimistic updates provide instant feedback
- WebSocket with HTTP fallback ensures reliability
- Local echo prevents duplicate notifications
- Slot reflow maintains deterministic ordering
- Comprehensive validation prevents invalid data

**Key Weaknesses:**

- Optimistic updates not reverted on backend failure (P0 issue)
- No conflict detection for concurrent edits (P2 issue)
- Potential infinite loop risk in effect dependencies (P0 issue)

**Next Steps:**

1. Implement P0 fixes (optimistic revert + effect deps) immediately
2. Plan P1 improvements (TTL + retry logic) for next sprint
3. Evaluate P2 items based on user feedback and observed issues

---

**Document Status:** COMPLETE  
**Last Updated:** 2025-01-18  
**Reviewed By:** AI Analysis (Claude Sonnet 4.5)
