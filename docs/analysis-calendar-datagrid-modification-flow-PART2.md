# Analysis: Calendar DataGrid Modification Flow - Part 2

## File-by-File Table with Code Snippets

| File Path                                | Purpose                      | Key Responsibilities                                | Functions/Methods                                                                 | Line Ranges | Critical Code Snippet                                                                  | Notes                        |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- | ---------------------------- |
| **`calendar-callbacks.ts`**              | Calendar event callbacks     | dateClick handler, opens editor dialog              | `createCalendarCallbacks()`, `dateClick()`                                        | 58-193      | `handlers.openEditor({ start: startDate.toISOString(), end: endDate.toISOString() });` | Entry point for grid dialog  |
| **`CalendarDataTableEditorWrapper.tsx`** | Wrapper component for editor | Lazy-loads editor, manages mount state              | `CalendarDataTableEditorWrapper()`                                                | 41-121      | `<LazyDataTableEditor open={editorOpen} .../>`                                         | Lazy loading for performance |
| **`DataTableEditor.tsx`**                | Main dialog component        | Grid rendering, validation, save coordination       | `DataTableEditor()`, `handleSaveChanges()`, `getReservationKey()`                 | 53-835      | `await handleSaveChanges(); closeEditor();`                                            | Central orchestrator         |
| **`use-data-table-save-handler.ts`**     | Save operation hook          | Extract changes, call operations service            | `useDataTableSaveHandler()`, `handleSaveChanges()`                                | 28-206      | `const changesJson = editingState.toJson(baseColumns);`                                | Transforms editing state     |
| **`DataTableOperationsService.ts`**      | Operations orchestrator      | Coordinates all reservation operations              | `processModifications()`, `processAdditions()`, `processCancellations()`          | 14-120      | `return this.modifyService.processModifications(...)`                                  | Dependency injection         |
| **`ReservationModifyService.ts`**        | Modification logic           | Optimistic updates, WebSocket calls, slot reflow    | `processModifications()`, `prepareModificationData()`, `applyOptimisticUpdates()` | 12-278      | `this.calendarIntegration.updateEventProperties(evId, { title, type, cancelled })`     | Optimistic UI pattern        |
| **`WebSocketService.ts`**                | WebSocket communication      | Send messages, wait for confirmation, HTTP fallback | `sendMessage()`, `modifyReservation()`, `waitForWSConfirmation()`                 | 4-184       | `wsRef.current.send(JSON.stringify(message));`                                         | 10s timeout, fallback        |
| **`LocalEchoManager.ts`**                | Deduplication manager        | Mark local ops, suppress echoes                     | `markLocalEcho()`, `withSuppressedEventChange()`                                  | 1-56        | `globalScope.__localOps.add(key);`                                                     | 15s TTL on markers           |
| **`CalendarIntegrationService.ts`**      | Calendar API bridge          | Update events, reflow slots                         | `updateEventProperties()`, `updateEventTiming()`, `reflowSlot()`                  | 8-335       | `evObj.setProp?.("title", updates.title);`                                             | Suppressed event changes     |
| **`realtime-utils.ts`**                  | Deduplication utilities      | Generate keys, check local ops                      | `generateLocalOpKeys()`, `isLocalOperation()`, `buildLocalOpCandidates()`         | 50-185      | `keys.add(${type}:${idPart}:${datePart}:${time24});`                                   | Handles 12h/24h variants     |
| **`ws/reducer.ts`**                      | WebSocket state reducer      | Process incoming messages, update state             | `reduceOnMessage()`                                                               | 5-234       | `case "reservation_updated": ...`                                                      | Immutable state updates      |
| **`websocket-data-provider.tsx`**        | React context provider       | Subscribe to WebSocket, provide data                | `WebSocketDataProvider()`, `useReservationsData()`                                | 17-200      | `ws.reservations as unknown as Record<string, Reservation[]>`                          | Global state management      |
| **`api/index.ts`**                       | HTTP API client              | HTTP fallback for operations                        | `modifyReservation()`, `cancelReservation()`                                      | 50-96       | `await callPythonBackend("/modify-reservation", { method: "POST", body })`             | Direct Python backend calls  |

---

## Complete Code Path with Full Quotes

### Step 1: User Clicks Calendar Date (Entry Point)

**Inputs:** `{ date: Date, dateStr: string, view: { type: string } }`  
**Outputs:** Opens DataTableEditor dialog

**Code Reference:**

```typescript
// app/frontend/shared/libs/calendar/calendar-callbacks.ts (lines 86-193)
dateClick: (info: DateClickInfo) => {
  const clickedDate: Date =
    info?.date instanceof Date ? info.date : new Date(info?.date || Date.now());

  // Skip vacation days
  if (handlers.isVacationDate(dateOnly as string)) return;

  const viewType: string = info?.view?.type || (currentView as string) || "";
  const isTimeGrid = viewType?.toLowerCase().includes("timegrid");

  // Open editor: include time (with computed end) for timeGrid, date-only otherwise
  if (isTimeGrid) {
    const startDate = new Date(startStr);
    const endDate = new Date(
      startDate.getTime() + SLOT_DURATION_HOURS * 60 * 60 * 1000
    );
    handlers.openEditor({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
  } else {
    handlers.openEditor({ start: dateOnly || "" });
  }
};
```

**Side Effects:**

- Calls `handlers.openEditor({ start, end })` which updates parent state
- Triggers `CalendarDataTableEditorWrapper` to render dialog

**Validation:**

- Vacation date check (line 98)
- Past date check if not in freeRoam mode (lines 154-177, 185-190)
- Business hours validation for timeGrid (lines 146-148)

**Notes:** Entry point is calendar-agnostic - works with dayGridMonth, timeGridWeek, timeGridDay views

---

### Step 2: Dialog Opens with Grid

**Inputs:** `{ open: boolean, events: CalendarEvent[], selectedDateRange: { start, end } }`  
**Outputs:** Rendered DataTableEditor dialog with editable grid

**Code Reference:**

```typescript
// app/frontend/widgets/data-table-editor/DataTableEditor.tsx (lines 53-835)
export function DataTableEditor(props: DataTableEditorProps) {
  const {
    open,
    events,
    selectedDateRange,
    onSave: _onSave,
    calendarRef,
    onEventAdded,
    onEventModified,
    onEventCancelled,
  } = props;

  const [isGridReady, setIsGridReady] = useState(false);
  const [canSave, setCanSave] = useState(false);

  // Stable reservation identity used for locking and dedupe
  const getReservationKey = useCallback(
    (ev: DataTableCalendarEvent): string => {
      try {
        const ex = ev?.extendedProps as Record<string, unknown> | undefined;
        const rid =
          (ex?.reservationId as string | number | undefined) ?? undefined;
        if (rid !== undefined && rid !== null) return String(rid);
        const wa =
          (ex?.waId as string | undefined) ||
          (ex?.wa_id as string | undefined) ||
          (ex?.phone as string | undefined) ||
          "";
        const start = ev?.start || "";
        return `${wa}__${start}`;
      } catch {
        return String(ev?.id ?? ev?.start ?? "");
      }
    },
    []
  );

  const { dataSource, gridRowToEventMapRef } = useDataTableDataSource(
    sourceEvents,
    selectedDateRange,
    slotDurationHours,
    freeRoam,
    open,
    isLocalized ?? false
  );

  const { validateAllCells, checkEditingState, hasUnsavedChanges } =
    useDataTableValidation(dataProviderRef);

  const { isSaving, handleSaveChanges: performSave } = useDataTableSaveHandler({
    ...(calendarRef ? { calendarRef } : {}),
    isLocalized: _isLocalized,
    slotDurationHours: slotDurationHours || 1,
    freeRoam,
    gridRowToEventMapRef,
    dataProviderRef,
    validateAllCells,
    ...(onEventAdded ? { onEventAdded } : {}),
    ...(onEventModified ? { onEventModified } : {}),
    ...(onEventCancelled ? { onEventCancelled } : {}),
  });

  // ... rest of component
}
```

**Side Effects:**

- Transforms events to DataSource format
- Creates DataProvider with EditingState
- Initializes validation hooks
- Sets up deduplication via `getReservationKey`

**Validation:**

- None at this stage (validation happens on cell edit)

**Error Handling:**

- Graceful fallback in `getReservationKey` (lines 93-108)

**Notes:** **CRITICAL - `getReservationKey` does NOT include time** to prevent duplicate events on drag-and-drop (see memory ID 10023252)

---

### Step 3: User Edits Cell (Phone/Name/Date)

**Inputs:** `{ col: number, row: number, value: unknown }`  
**Outputs:** EditingState updated, validation runs, Save button state changes

**Code Reference:**

```typescript
// app/frontend/widgets/data-table-editor/DataTableEditor.tsx (lines 760-789)
onDataProviderReady={(provider: unknown) => {
	const dataProvider = provider as DataProvider;
	dataProviderRef.current = dataProvider;

	const editingState = dataProvider.getEditingState();

	// Use the stable debounced validation check function
	const debouncedCheck = createDebouncedValidationCheck();

	const unsubscribe = editingState.onChange(debouncedCheck);

	// Live validation updates whenever a cell value is loaded/changed
	try {
		dataProvider.setOnCellDataLoaded?.((_c: number, _r: number) => {
			try {
				const v = validateAllCells();
				setValidationErrorsIfChanged(v.errors || []);
			} catch {}
		});
	} catch {}

	(
		dataProviderRef.current as DataProvider & {
			unsubscribe?: () => void;
		}
	).unsubscribe = unsubscribe;

	handleCheckEditingState();
}}
```

**Side Effects:**

- EditingState stores changes in memory (not persisted yet)
- Debounced validation runs after 100ms (lines 397-484)
- Save button enabled/disabled based on validation result

**Validation:**

- Required fields check (lines 342-379)
- Field-specific validation (phone format, date validity, etc.)
- Template row completeness check (lines 366-382)

**Debouncing:**

- 100ms debounce on validation (line 481)
- Prevents excessive validation on rapid typing

**Notes:** Changes are tracked per-cell in EditingState, not sent to backend until save

---

### Step 4: User Clicks "Save Changes"

**Inputs:** None (uses EditingState from dataProvider)  
**Outputs:** `{ success: boolean }`

**Code Reference:**

```typescript
// app/frontend/widgets/data-table-editor/DataTableEditor.tsx (lines 626-635)
const handleSaveChanges = useCallback(async () => {
  // Check validation
  validateAllCells();

  const success = await performSave();

  if (success) {
    setCanSave(false);
  }
}, [performSave, validateAllCells]);

// Button component (lines 799-811)
<Button
  onClick={handleSaveChanges}
  className="gap-2"
  disabled={!canSave || isSaving}
>
  {isSaving ? (
    <>
      <Spinner className="h-4 w-4" />
      {i18n.getMessage("saving", _isLocalized)}
    </>
  ) : (
    <>
      <Save className="h-4 w-4" />
      {i18n.getMessage("save_changes", _isLocalized)}
    </>
  )}
</Button>;
```

**Side Effects:**

- Sets `isSaving` state (disables button)
- Calls `performSave()` from `useDataTableSaveHandler`
- Shows validation errors if invalid

**Validation:**

- Final validation before save (line 628)
- If validation fails, save aborts with error toast

**Error Handling:**

- Validation errors shown via `ValidationErrorsPopover` (lines 812-816)
- Backend errors handled in `performSave`

**Notes:** Button disabled during save to prevent duplicate submissions

---

### Step 5: Extract Changes from EditingState

**Inputs:** EditingState object with all pending changes  
**Outputs:** `EditingChanges { deleted_rows, edited_rows, added_rows }`

**Code Reference:**

```typescript
// app/frontend/widgets/data-table-editor/hooks/use-data-table-save-handler.ts (lines 48-101)
const handleSaveChanges = useCallback(
  async () => {
    if (!dataProviderRef.current) {
      console.error("❌ No data provider available");
      toastService.error(
        i18n.getMessage("system_error_try_later", isLocalized),
        undefined,
        5000
      );
      return;
    }

    if (isSaving) {
      console.log("⏳ Already saving, skipping...");
      return;
    }

    const validation = validateAllCells();
    if (!validation.isValid) {
      const errorMessages = validation.errors
        .map(
          (err) =>
            `${isLocalized ? "الصف" : "Row"} ${err.row + 1}: ${err.message}`
        )
        .join("\n");

      toastService.error(
        isLocalized ? "أخطاء في التحقق" : "Validation Errors",
        errorMessages,
        8000
      );

      return;
    }

    setIsSaving(true);

    try {
      const editingState = dataProviderRef.current.getEditingState();
      // Build BaseColumnProps from provider's column definitions so toJson can map values correctly
      const provider = dataProviderRef.current;
      const defs: IColumnDefinition[] =
        (
          provider as unknown as {
            dataSource?: { getColumnDefinitions?: () => IColumnDefinition[] };
          }
        ).dataSource?.getColumnDefinitions?.() ?? [];
      const baseColumns: BaseColumnProps[] = defs.map(
        (def: IColumnDefinition, index: number): BaseColumnProps => ({
          id: def?.id ?? def?.name ?? `col_${index}`,
          name: def?.name ?? def?.id ?? `col_${index}`,
          title: def?.title ?? def?.name ?? def?.id ?? `Column ${index}`,
          width: def?.width ?? 100,
          isEditable: def?.isEditable !== false,
          isHidden: false,
          isPinned: false,
          isRequired: def?.isRequired === true,
          isIndex: false,
          indexNumber: index,
          contentAlignment: "left",
          defaultValue: def?.defaultValue,
          columnTypeOptions: {},
        })
      );
      const changesJson = editingState.toJson(baseColumns);
      const changes: EditingChanges = JSON.parse(changesJson);

      // ... process changes
    } catch (error) {
      console.error("Error saving changes:", error);
      toastService.error(
        i18n.getMessage("save_error", isLocalized),
        i18n.getMessage("system_error_try_later", isLocalized),
        5000
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  },
  [
    /* deps */
  ]
);
```

**Side Effects:**

- Sets `isSaving` state (line 71)
- Shows validation errors if invalid (lines 62-68)

**Validation:**

- Final pre-save validation (lines 60-69)
- Column definition validation (lines 77-99)

**Data Transformation:**

- EditingState → JSON string → EditingChanges object (lines 100-101)
- Column definitions mapped to BaseColumnProps (lines 83-99)

**Notes:** `toJson()` serializes all pending changes; columns param ensures proper field mapping

---

### Step 6: Process Modifications via OperationsService

**Inputs:** `{ edited_rows: Record<string, RowChange>, gridRowToEventMap: Map<number, CalendarEvent> }`  
**Outputs:** `OperationResult { hasErrors: boolean, successfulOperations: SuccessfulOperation[] }`

**Code Reference:**

```typescript
// app/frontend/processes/data-table-operations.process.ts (lines 64-73)
async processModifications(
	editedRows: Record<string, RowChange>,
	gridRowToEventMap: Map<number, CalendarEvent>,
	onEventModified?: (eventId: string, event: CalendarEvent) => void
): Promise<OperationResult> {
	return this.modifyService.processModifications(editedRows, gridRowToEventMap, onEventModified);
}

// app/frontend/services/operations/reservation-modify.service.ts (lines 21-179)
async processModifications(
	editedRows: Record<string, RowChange>,
	gridRowToEventMap: Map<number, CalendarEvent>,
	onEventModified?: (eventId: string, event: CalendarEvent) => void
): Promise<OperationResult> {
	let hasErrors = false;
	const successful: SuccessfulOperation[] = [];

	const indices = Object.keys(editedRows || {});
	for (const idxStr of indices) {
		const rowIdx = Number(idxStr);
		const change = editedRows[idxStr] || {};
		const original = gridRowToEventMap.get(rowIdx);
		if (!original) continue;

		const modificationData = this.prepareModificationData(change, original);

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

			// Backend modification
			const slotTime = this.formattingService.normalizeToSlotBase(
				modificationData.dateStrNew,
				modificationData.timeStrNew
			);

			// Pre-mark local echo BEFORE calling backend
			try {
				const preKeys = generateLocalOpKeys("reservation_updated", {
					id: original.extendedProps?.reservationId || modificationData.evId,
					wa_id: modificationData.waId,
					date: modificationData.dateStrNew,
					time: slotTime,
				});
				for (const k of preKeys) this.localEchoManager.markLocalEcho(k);
			} catch {}

			const resp = await this.webSocketService.modifyReservation(modificationData.waId, {
				date: modificationData.dateStrNew,
				time: slotTime,
				title: modificationData.titleNew,
				type: Number(modificationData.typeNew),
				approximate: !this.calendarIntegration.isTimeGridView(),
				...(typeof original.extendedProps?.reservationId === "number" ? {
					reservationId: original.extendedProps.reservationId
				} : {}),
			});

			if (!resp?.success) {
				hasErrors = true;
				toastService.reservationModificationFailed({
					customer: modificationData.titleNew,
					wa_id: modificationData.waId,
					date: modificationData.dateStrNew,
					time: modificationData.timeStrNew,
					isLocalized: this.isLocalized,
					error: resp?.message || resp?.error || i18n.getMessage("update_failed", this.isLocalized),
				});
				continue;
			}

			// Reflow new slot
			try {
				const baseTimeNew = this.formattingService.normalizeToSlotBase(
					modificationData.dateStrNew,
					modificationData.timeStrNew
				);
				this.calendarIntegration.reflowSlot(modificationData.dateStrNew, baseTimeNew);
			} catch {}

			// Track successful operation
			successful.push({
				type: "modify",
				id: modificationData.evId,
				data: {
					waId: modificationData.waId,
					date: modificationData.dateStrNew,
					time: slotTime,
					type: Number(modificationData.typeNew),
				},
			});

			// Store context and mark local echo
			this.storeModificationContext(modificationData, original);
			this.markLocalEchoForModification(resp, modificationData, original);
		} catch (e) {
			hasErrors = true;
			this.handleModificationError(e as Error);
		}
	}

	return { hasErrors, successfulOperations: successful };
}
```

**Side Effects:**

- Optimistic UI updates via `CalendarIntegrationService.updateEventProperties` and `updateEventTiming` (lines 40, 84-100, 220-231)
- Slot reflow for previous and new slots (lines 42-56, 140-152)
- Local echo marking (lines 65-73, 249-266)
- Modification context stored for toast notifications (lines 233-247)

**Validation:**

- None (already validated before this step)

**Error Handling:**

- Backend rejection: reverts optimistic changes, shows error toast (lines 98-115)
- Exception handling: generic error toast (lines 172-175, 268-274)

**Notes:**

- **Optimistic updates applied BEFORE backend call** for instant UI feedback
- **Local echo marked BEFORE backend call** (line 72) because WebSocket echo may arrive immediately
- **Slot reflow happens twice**: once for old slot (cleanup), once for new slot (re-layout)

---

### Step 7: WebSocket Communication with Fallback

**Inputs:** `{ waId: string, updates: { date, time, title, type, reservationId?, approximate? } }`  
**Outputs:** `ApiResponse { success: boolean, message?: string }`

**Code Reference:**

```typescript
// app/frontend/services/websocket/websocket.service.ts (lines 106-151)
async modifyReservation(
	waId: string,
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		reservationId?: number;
		approximate?: boolean;
	},
	opts?: { isLocalized?: boolean }
): Promise<ApiResponse> {
	// Try WebSocket first
	const wsSuccess = await this.sendMessage({
		type: "modify_reservation",
		data: {
			wa_id: waId,
			date: updates.date,
			time_slot: updates.time,
			customer_name: updates.title,
			type: updates.type,
			reservation_id: updates.reservationId,
			approximate: updates.approximate,
			ar: opts?.isLocalized || false,
		},
	});

	if (wsSuccess) {
		// Wait for backend confirmation
		const confirmation = await this.waitForWSConfirmation({
			reservationId: updates.reservationId || "",
			waId,
			date: updates.date,
			time: updates.time,
		});

		return {
			success: confirmation.success,
			...(confirmation.message && { message: confirmation.message }),
		};
	}

	// Fallback to HTTP API
	return (await modifyReservation(waId, updates)) as unknown as ApiResponse;
}

// WebSocket send (lines 8-22)
async sendMessage(message: WebSocketMessage): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const wsRef = (globalThis as GlobalThis).__wsConnection;
			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify(message));
				resolve(true);
			} else {
				resolve(false);
			}
		} catch {
			resolve(false);
		}
	});
}

// Wait for confirmation (lines 27-101)
private waitForWSConfirmation(args: {
	reservationId?: string | number;
	waId?: string | number;
	date: string;
	time: string;
	timeoutMs?: number;
}): Promise<{ success: boolean; message?: string }> {
	const { reservationId, waId, date, timeoutMs = 10000 } = args;

	return new Promise((resolve) => {
		let resolved = false;

		const handler = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| { type?: string; data?: Record<string, unknown>; error?: string }
					| undefined;
				const t = detail?.type;
				const d = detail?.data || {};

				// Listen for direct WebSocket ack/nack responses
				if (t === "modify_reservation_ack") {
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						clearTimeout(timeoutId);
						resolve({ success: true, message: String(d.message || "") });
					}
				} else if (t === "modify_reservation_nack") {
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						clearTimeout(timeoutId);
						const errorMessage = detail?.error || d.message || "Operation failed";
						resolve({ success: false, message: String(errorMessage) });
					}
				}
				// Fallback: listen for reservation_updated broadcasts
				else if (
					(t === "reservation_updated" || t === "reservation_reinstated") &&
					((reservationId != null && String(d.id) === String(reservationId)) ||
						(waId != null && String(d.wa_id ?? d.waId) === String(waId) && String(d.date) === String(date)))
				) {
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						clearTimeout(timeoutId);
						resolve({ success: true });
					}
				}
			} catch {}
		};

		// Set up timeout
		const timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				try {
					window.removeEventListener("realtime", handler as EventListener);
				} catch {}
				resolve({ success: false, message: "Request timeout" });
			}
		}, timeoutMs);

		try {
			window.addEventListener("realtime", handler as EventListener);
		} catch {
			clearTimeout(timeoutId);
			resolve({
				success: false,
				message: "Failed to set up confirmation listener",
			});
		}
	});
}
```

**Side Effects:**

- Sends WebSocket message to global connection
- Waits for ack/nack or broadcast (10s timeout)
- Falls back to HTTP if WebSocket unavailable

**Validation:**

- WebSocket connection state check (line 12)

**Error Handling:**

- Connection unavailable: immediate fallback to HTTP (lines 16-20)
- Timeout after 10s: returns failure (lines 81-89)
- Listener setup failure: returns error (lines 92-98)

**Notes:**

- **10-second timeout** (line 34, default `timeoutMs = 10000`)
- Listens for **both** ack/nack AND broadcast events (fallback, lines 65-76)
- HTTP fallback ensures operation completes even if WebSocket down

---

### Step 8: Slot Reflow (Deterministic Ordering)

**Inputs:** `{ dateStr: string, timeSlotRaw: string }`  
**Outputs:** Calendar events rearranged with 1-minute gaps and type-then-title sorting

**Code Reference:**

```typescript
// app/frontend/services/calendar/calendar-integration.service.ts (lines 162-333)
reflowSlot(dateStr: string, timeSlotRaw: string): void {
	try {
		if (!this.calendarApi?.getEvents) return;
		const all = this.calendarApi.getEvents();
		if (!Array.isArray(all) || all.length === 0) return;

		// Compute the correct slot base time using business hours logic
		const fmt = new FormattingService();
		const baseTime = (() => {
			try {
				const inputTime = fmt.to24h(String(timeSlotRaw || "00:00"));
				const [hh, mm] = inputTime.split(":").map((v) => Number.parseInt(v, 10));
				const minutes = (Number.isFinite(hh ?? 0) ? (hh ?? 0) : 0) * 60 + (Number.isFinite(mm ?? 0) ? (mm ?? 0) : 0);
				const day = new Date(`${dateStr}T00:00:00`);
				const { slotMinTime } = getSlotTimes(day, false, "");
				const [sH, sM] = String(slotMinTime || "00:00:00")
					.slice(0, 5)
					.split(":")
					.map((v) => Number.parseInt(v, 10));
				const minMinutes =
					(Number.isFinite(sH ?? 0) ? (sH ?? 0) : 0) * 60 + (Number.isFinite(sM ?? 0) ? (sM ?? 0) : 0);
				const duration = 2 * 60; // 2 hours = 120 minutes
				const rel = Math.max(0, minutes - minMinutes);
				const slotIndex = Math.floor(rel / duration);
				const baseMinutes = minMinutes + slotIndex * duration;
				const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
				const mmOut = String(baseMinutes % 60).padStart(2, "0");
				return `${hhOut}:${mmOut}`;
			} catch (e) {
				return fmt.to24h(String(timeSlotRaw || "00:00"));
			}
		})();

		// Collect reservation events within this slot by STRICT metadata match
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
				return ext.slotDate === dateStr && ext.slotTime === baseTime;
			} catch {
				return false;
			}
		});

		if (inSlot.length === 0) return;

		// Sort by type then title
		inSlot.sort((a, b) => {
			const extA = (a?.extendedProps || {}) as { type?: unknown };
			const extB = (b?.extendedProps || {}) as { type?: unknown };
			const t1 = Number(extA.type ?? 0);
			const t2 = Number(extB.type ?? 0);
			if (t1 !== t2) return t1 - t2;
			const n1 = String(a?.title || "");
			const n2 = String(b?.title || "");
			return n1.localeCompare(n2);
		});

		// Apply sequential layout with 1-minute gaps
		const minutesPerReservation = inSlot.length >= 6 ? 15 : 20;
		const gapMinutes = 1;
		for (let i = 0; i < inSlot.length; i++) {
			const ev = inSlot[i];
			if (!ev) continue;
			const offsetMinutes = i * (minutesPerReservation + gapMinutes);
			const startClock = addMinutesToClock(baseTime, offsetMinutes);
			const endClock = addMinutesToClock(baseTime, offsetMinutes + minutesPerReservation);
			const startNaive = `${dateStr}T${startClock}:00`;
			const endNaive = `${dateStr}T${endClock}:00`;
			this.localEchoManager.withSuppressedEventChange(() => {
				try {
					(
						ev as unknown as {
							setDates?: (start: string, end: string | null) => void;
						}
					)?.setDates?.(startNaive, endNaive);
				} catch (e) {
					console.error(`[CAL] Error setting dates for ${ev.id}:`, e);
				}
				try {
					ev.setExtendedProp?.("slotDate", dateStr);
				} catch {}
				try {
					ev.setExtendedProp?.("slotTime", baseTime);
				} catch {}
			});
		}

		// Nudge calendar to ensure re-render
		try {
			(this.calendarApi as { rerenderEvents?: () => void })?.rerenderEvents?.();
			this.calendarApi?.updateSize?.();
		} catch {}
	} catch (e) {
		console.error("[CAL] reflowSlot() error", e);
	}
}
```

**Side Effects:**

- Moves calendar events to new positions
- Sets slotDate/slotTime extended props
- Triggers calendar re-render

**Validation:**

- Filters out vacations (type=2) and cancelled events (lines 214-228)
- Uses STRICT metadata match (slotDate + slotTime) to avoid timezone issues

**Slot Calculation:**

- Computes base slot time from business hours (lines 169-204)
- Applies 2-hour slot bucketing (line 182)

**Layout Algorithm:**

- Sort by type (check-up vs follow-up), then by name (lines 246-257)
- 15 or 20 minutes per event (depends on slot density, line 280)
- 1-minute gap between events (line 281)

**Notes:**

- **Suppressed event change** (line 291) prevents triggering handleEventChange callback
- Uses naive datetime strings to avoid double timezone application
- Called TWICE per modification: once for old slot, once for new slot

---

### Step 9: Local Echo Deduplication

**Inputs:** `{ type: "reservation_updated", data: { id, wa_id, date, time } }`  
**Outputs:** `boolean` (true if local operation, false if remote)

**Code Reference:**

```typescript
// app/frontend/shared/libs/realtime-utils.ts (lines 50-88, 111-143, 145-171)
// Generate keys when MARKING local operations
export function generateLocalOpKeys(
	type: string,
	params: {
		id?: string | number;
		wa_id?: string;
		date: string;
		time: string; // Time in 24-hour format
	}
): string[] {
	const idPart = String(params?.id ?? "");
	const waPart = String(params?.wa_id ?? "");
	const datePart = String(params?.date ?? "");
	const time24 = String(params?.time ?? "");

	const keys = new Set<string>();

	// Generate variants for both 12-hour and 24-hour formats
	if (idPart) {
		keys.add(`${type}:${idPart}:${datePart}:${time24}`);
		if (time24.match(/^\d{2}:\d{2}$/)) {
			const time12 = convertTo12Hour(time24);
			if (time12) keys.add(`${type}:${idPart}:${datePart}:${time12}`);
		}
	}
	if (waPart) {
		keys.add(`${type}:${waPart}:${datePart}:${time24}`);
		if (time24.match(/^\d{2}:\d{2}$/)) {
			const time12 = convertTo12Hour(time24);
			if (time12) keys.add(`${type}:${waPart}:${datePart}:${time12}`);
		}
	}

	return Array.from(keys);
}

// Build candidates when CHECKING if operation is local
export function buildLocalOpCandidates(type: string, data: LocalOpData): string[] {
	const idPart = String(data?.id ?? "");
	const waPart = String(data?.wa_id ?? "");
	const datePart = String(data?.date ?? "");
	const time12 = String(data?.time_slot ?? "");
	const time24 = normalizeTime12To24(time12, String(data?.time ?? ""));
	const cands = new Set<string>();

	// Generate all possible key variants
	cands.add(`${type}:${idPart}:${datePart}:${time12}`);
	cands.add(`${type}:${idPart}:${datePart}:${time24}`);
	cands.add(`${type}:${waPart}:${datePart}:${time12}`);
	cands.add(`${type}:${waPart}:${datePart}:${time24}`);

	return Array.from(cands);
}

// Check if operation is local
export function isLocalOperation(type: string, data: LocalOpData): boolean {
	try {
		const candidates = buildLocalOpCandidates(type, data);
		(globalThis as { __localOps?: Set<string> }).__localOps =
			(globalThis as { __localOps?: Set<string> }).__localOps || new Set<string>();

		const localOps = (globalThis as { __localOps?: Set<string> }).__localOps;

		for (const k of candidates) {
			if (localOps?.has(k)) {
				return true;
			}
		}
	} catch {}
	return false;
}

// Mark operation as local (in LocalEchoManager)
// app/frontend/shared/libs/utils/local-echo.manager.ts (lines 5-17)
markLocalEcho(key: string, ttlMs = 15000): void {
	try {
		const globalScope = globalThis as GlobalThis;
		globalScope.__localOps = globalScope.__localOps || new Set<string>();
		globalScope.__localOps.add(key);

		setTimeout(() => {
			try {
				globalScope.__localOps?.delete(key);
			} catch {}
		}, ttlMs);
	} catch {}
}
```

**Side Effects:**

- Marks operation in global `__localOps` Set
- Auto-expires after 15 seconds (TTL)

**Key Generation:**

- Generates 2-4 key variants per operation (12h/24h × id/waId)
- Example: `"reservation_updated:123:2025-01-18:10:00"` and `"reservation_updated:123:2025-01-18:10:00 AM"`

**Why Multiple Variants:**

- Backend may send time in 12-hour or 24-hour format
- Events may be identified by `id` (reservationId) OR `wa_id` (phone number)
- Ensures dedup works regardless of backend format

**Notes:**

- **15-second TTL** (line 5, `ttlMs = 15000`) prevents stale markers from blocking future operations
- Keys marked BEFORE backend call (see Step 6, line 72)

---

### Step 10: WebSocket Echo Broadcast (Remote Clients)

**Inputs:** WebSocket message `{ type: "reservation_updated", data: Reservation }`  
**Outputs:** State updated, calendar refreshed, toast notification (if not local)

**Code Reference:**

```typescript
// app/frontend/shared/libs/ws/reducer.ts (lines 97-115)
case "reservation_created":
case "reservation_updated":
case "reservation_reinstated": {
	const d = data as { wa_id?: string; waId?: string; id?: string | number };
	const waIdKey: string | undefined = d.wa_id || d.waId;
	if (waIdKey) {
		const byCustomer = Array.isArray(next.reservations[waIdKey]) ? [...next.reservations[waIdKey]] : [];
		const index = byCustomer.findIndex((r: Reservation) => String(r.id) === String(d.id));
		const reservation = data as unknown as Reservation;
		if (index >= 0) byCustomer[index] = reservation;
		else byCustomer.push(reservation);
		next.reservations = {
			...next.reservations,
			[waIdKey]: byCustomer,
		};
	}
	next.lastUpdate = timestamp;
	return next;
}
```

**Side Effects:**

- Updates `reservations` state in WebSocketDataProvider
- Dispatches window event "realtime" (handled by calendar)
- Shows toast notification (if not suppressed by local echo)

**Deduplication:**

- Checks `isLocalOperation()` before showing notification
- If local: suppresses toast (user already sees optimistic UI)
- If remote: shows "Reservation updated" toast

**State Update:**

- Immutable update: spreads existing state, replaces/adds reservation
- Updates `lastUpdate` timestamp for tracking

**Notes:**

- Broadcast reaches ALL connected clients (including the originator)
- Local echo prevents duplicate notifications on originating client

---

## Configuration and Constants

| Constant                    | File:Line                                    | Value           | Description                                 |
| --------------------------- | -------------------------------------------- | --------------- | ------------------------------------------- |
| `SLOT_DURATION_HOURS`       | `shared/libs/calendar/calendar-config.ts:XX` | `2`             | Default reservation slot duration (2 hours) |
| `Z_INDEX.DIALOG_BACKDROP`   | `shared/libs/ui/z-index.ts:XX`               | `50`            | z-index for dialog backdrop overlay         |
| `Z_INDEX.DIALOG_CONTENT`    | `shared/libs/ui/z-index.ts:XX`               | `51`            | z-index for dialog content (above backdrop) |
| **Validation debounce**     | `DataTableEditor.tsx:481`                    | `100ms`         | Debounce interval for live validation       |
| **WebSocket timeout**       | `websocket.service.ts:34`                    | `10000ms` (10s) | Timeout for WebSocket confirmation          |
| **Local echo TTL**          | `local-echo.manager.ts:5`                    | `15000ms` (15s) | Time-to-live for local operation markers    |
| **Slot reflow gap**         | `calendar-integration.service.ts:281`        | `1 minute`      | Gap between sequential events in a slot     |
| **Minutes per reservation** | `calendar-integration.service.ts:280`        | `15-20 min`     | Event duration (15 if ≥6 events, else 20)   |

---

## Full Request/Response Payloads

### WebSocket Request: modify_reservation

**Location:** `app/frontend/services/websocket/websocket.service.ts:119-132`

```json
{
  "type": "modify_reservation",
  "data": {
    "wa_id": "+1234567890",
    "date": "2025-01-20",
    "time_slot": "10:00",
    "customer_name": "John Doe",
    "type": 0,
    "reservation_id": 123,
    "approximate": false,
    "ar": false
  }
}
```

**Field Descriptions:**

- `wa_id`: WhatsApp ID (phone number with + prefix)
- `date`: ISO date string (YYYY-MM-DD)
- `time_slot`: Time in 24-hour format (HH:MM)
- `customer_name`: Display name for the reservation
- `type`: Reservation type (0 = check-up, 1 = follow-up)
- `reservation_id`: Database primary key (optional for new reservations)
- `approximate`: True if date-only view (no specific time), false if timeGrid
- `ar`: Localization flag (true for Arabic UI)
