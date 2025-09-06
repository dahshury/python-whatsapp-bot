/**
 * Calendar Core Component
 *
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

"use client";

import type {
	CalendarApi,
	DatesSetArg,
	EventApi,
	EventChangeArg,
	EventClickArg,
	EventContentArg,
	EventHoveringArg,
} from "@fullcalendar/core";
import arLocale from "@fullcalendar/core/locales/ar-sa";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	getBusinessHours,
	getValidRange,
	SLOT_DURATION_HOURS,
	TIMEZONE,
} from "@/lib/calendar-config";
import { count } from "@/lib/dev-profiler";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

export interface CalendarCoreProps {
	// Data props
	events: CalendarEvent[];

	// State props
	currentView: string;
	currentDate: Date;
	isRTL: boolean;
	freeRoam: boolean;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	calendarHeight: number | "auto";

	// Vacation checker
	isVacationDate?: (dateStr: string) => boolean;

	// Event handlers
	onDateClick?: (info: {
		date: Date;
		dateStr: string;
		allDay: boolean;
	}) => void;
	onSelect?: (info: {
		start: Date;
		end: Date;
		startStr: string;
		endStr: string;
		allDay: boolean;
	}) => void;
	onEventClick?: (info: EventClickArg) => void;
	onEventChange?: (info: EventChangeArg) => void;
	onViewDidMount?: (info: {
		view: { type: string; title: string };
		el: HTMLElement;
	}) => void;
	onEventDidMount?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
	}) => void;
	onDatesSet?: (info: DatesSetArg) => void;
	onEventMouseEnter?: (info: EventHoveringArg) => void;
	onEventMouseLeave?: (info: EventHoveringArg) => void;
	onEventDragStart?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
		jsEvent: MouseEvent;
	}) => void;
	onEventDragStop?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
		jsEvent: MouseEvent;
	}) => void;
	onViewChange?: (view: string) => void;

	// Context menu handlers
	onContextMenu?: (
		event: CalendarEvent,
		position: { x: number; y: number },
	) => void;

	// Resize callback
	onUpdateSize?: () => void;

	// Mouse down handler for events
	onEventMouseDown?: () => void;

	// Drag and drop props for dual calendar mode
	droppable?: boolean;
	onEventReceive?: (info: { event: EventApi; draggedEl: HTMLElement }) => void;
	onEventLeave?: (info: { event?: EventApi; draggedEl: HTMLElement }) => void;
	// eventAllow removed to align with core types and avoid overload mismatch

	// Add to CalendarCoreProps after onViewChange
	onNavDate?: (date: Date) => void;
}

// Export the ref type for parent components
export interface CalendarCoreRef {
	getApi: () => CalendarApi | undefined;
	updateSize: () => void;
}

/**
 * Get CSS class names for container based on current view
 */
const getCalendarClassNames = (currentView: string) => {
	if (currentView?.includes("timeGrid")) {
		return "week-view-container";
	}
	return "";
};

/**
 * Calendar Core Component - Pure FullCalendar rendering
 */
const CalendarCoreComponent = forwardRef<CalendarCoreRef, CalendarCoreProps>(
	(props, ref) => {
		const {
			events,
			currentView,
			currentDate,
			isRTL,
			freeRoam,
			slotTimes,
			slotTimesKey: _slotTimesKey,
			calendarHeight,
			isVacationDate,
			onDateClick,
			onSelect,
			onEventClick,
			onEventChange,
			onViewDidMount,
			onEventDidMount,
			onDatesSet,
			onEventMouseEnter,
			onEventMouseLeave,
			onEventDragStart,
			onEventDragStop,
			onViewChange: _onViewChange,
			onContextMenu,
			onUpdateSize,
			onEventMouseDown,
			onNavDate,
			droppable,
			onEventReceive,
			onEventLeave,
		} = props;

		// Optimize events for multiMonth view - simplified event objects
		const optimizedEvents = useMemo(() => {
			if (currentView === "multiMonthYear") {
				const today = new Date();
				today.setHours(0, 0, 0, 0); // Compare date part only

				// Return simplified events for multiMonth view
				return events.map((event) => {
					const eventStartDate = new Date(event.start);
					const isPastEvent = eventStartDate < today;
					const isReservation = event.extendedProps?.type !== 2;

					// In free roam mode: allow dragging for future reservations only
					// In normal mode: allow dragging for future reservations only
					const allowDrag = !isPastEvent && isReservation;

					return {
						...event,
						// Allow drag/drop for future reservations only
						editable: event.editable !== false ? allowDrag : false,
						eventStartEditable: event.editable !== false ? allowDrag : false,
						eventDurationEditable: false, // Keep duration editing disabled
						// Preserve important identifiers (e.g., waId) while normalizing known fields
						extendedProps: {
							...(event.extendedProps || {}),
							type: event.extendedProps?.type ?? 0,
							cancelled: event.extendedProps?.cancelled ?? false,
							reservationId: event.extendedProps?.reservationId,
						},
					};
				});
			}
			return events;
		}, [events, currentView]);

		// Sanitize events to guard against any with missing/invalid start
		const sanitizedEvents = useMemo(() => {
			try {
				return (optimizedEvents || []).filter((e: CalendarEvent) => {
					const s = e?.start;
					if (!s || typeof s !== "string") return false;
					const d = new Date(s);
					return !Number.isNaN(d.getTime());
				});
			} catch {
				return [] as CalendarEvent[];
			}
		}, [optimizedEvents]);

		// Freeze external event updates while dragging to prevent snap-back
		const frozenEventsRef = useRef<CalendarEvent[]>([]);
		const [renderEvents, setRenderEvents] =
			useState<CalendarEvent[]>(sanitizedEvents);
		useEffect(() => {
			try {
				const isDragging =
					(globalThis as { __isCalendarDragging?: boolean })
						.__isCalendarDragging === true;
				if (isDragging) {
					frozenEventsRef.current = sanitizedEvents;
					setRenderEvents(frozenEventsRef.current);
				} else {
					setRenderEvents(sanitizedEvents);
				}
			} catch {
				setRenderEvents(sanitizedEvents);
			}
		}, [sanitizedEvents]);

		const calendarRef = useRef<FullCalendar>(null);
		const containerRef = useRef<HTMLDivElement>(null);

		// Expose calendar API to parent component
		useImperativeHandle(
			ref,
			() => ({
				getApi: () => calendarRef.current?.getApi(),
				updateSize: () => {
					try {
						const api = calendarRef.current?.getApi?.();
						// Guard: only update when view is available (avoids transient nulls in multimonth transitions)
						if (api?.view) {
							api.updateSize?.();
						}
					} catch {}
				},
			}),
			[],
		);

		// Memoize business hours to prevent unnecessary recalculations
		const businessHours = useMemo(() => getBusinessHours(freeRoam), [freeRoam]);

		/**
		 * Global validRange function for FullCalendar
		 * Applies to all views except where overridden in viewsProp
		 */
		const globalValidRangeFunction = useMemo(() => {
			if (freeRoam) return undefined;
			// Default to today onward
			return getValidRange(freeRoam);
		}, [freeRoam]);

		// Prepare validRange prop for FullCalendar
		// Disable validRange specifically for multiMonthYear to avoid plugin issues
		const validRangeProp =
			currentView === "multiMonthYear" || !globalValidRangeFunction
				? {}
				: { validRange: globalValidRangeFunction };

		// View-specific overrides: disable validRange for multiMonthYear view
		const viewsProp = useMemo(
			() => ({
				multiMonthYear: {
					// Inherit global validRange (today onward) so past drops are blocked
					dayMaxEvents: true,
					dayMaxEventRows: true,
					moreLinkClick: "popover" as const,
				},
				dayGridMonth: {
					dayMaxEvents: true,
					dayMaxEventRows: true,
					moreLinkClick: "popover" as const,
				},
				dayGridWeek: {
					dayMaxEvents: true,
					dayMaxEventRows: true,
					moreLinkClick: "popover" as const,
				},
			}),
			[],
		);

		// Day cell class names (vacation styling now handled by background events)
		const getDayCellClassNames = useCallback(
			(arg: { date: Date }) => {
				const cellDate = arg.date;
				// Use local date string comparison to avoid timezone issues
				const currentDateStr = new Date(
					currentDate.getTime() - currentDate.getTimezoneOffset() * 60000,
				)
					.toISOString()
					.split("T")[0];
				const cellDateStr = new Date(
					cellDate.getTime() - cellDate.getTimezoneOffset() * 60000,
				)
					.toISOString()
					.split("T")[0];

				// Check if this date is in the past
				const isPastDate = cellDate < new Date();

				// Add vacation-day class for cells inside any vacation period
				const vacationClass = isVacationDate?.(cellDateStr)
					? "vacation-day"
					: "";

				// Disable hover for past dates when not in free roam
				if (!freeRoam && isPastDate) {
					return vacationClass;
				}

				if (cellDateStr === currentDateStr) {
					return cn("selected-date-cell", vacationClass);
				}

				return cn(vacationClass, "hover:bg-muted cursor-pointer");
			},
			[currentDate, freeRoam, isVacationDate],
		);

		// Day header class names (vacation styling now handled by background events)
		const getDayHeaderClassNames = useCallback((_arg: unknown) => {
			// Note: Vacation styling is now handled by FullCalendar background events
			// No need to check isVacationDate here
			return "";
		}, []);

		// Prevent selecting ranges that include vacation days
		const handleSelectAllow = useCallback(
			(info: { startStr?: string; endStr?: string }) => {
				try {
					// Some views (daygrid) provide startStr/endStr in date-only or date-time; normalize to date-only
					const startStr: string | undefined = info?.startStr;
					const endStr: string | undefined = info?.endStr;
					if (!startStr || !endStr) return true;
					const start = new Date(startStr);
					const end = new Date(endStr);
					// Iterate from start to (end - 1 day) because FullCalendar selection end is exclusive in daygrid
					const cur = new Date(start);
					while (cur < end) {
						const yyyy = cur.getFullYear();
						const mm = String(cur.getMonth() + 1).padStart(2, "0");
						const dd = String(cur.getDate()).padStart(2, "0");
						const dateOnly = `${yyyy}-${mm}-${dd}`;
						if (isVacationDate?.(dateOnly)) return false;
						cur.setDate(cur.getDate() + 1);
					}
				} catch {}
				return true;
			},
			[isVacationDate],
		);

		// Handle event mounting with context menu support
		const handleEventDidMount = useCallback(
			(info: { event: EventApi; el: HTMLElement; view: { type: string } }) => {
				const event = info.event;
				const el = info.el;
				const view = info.view;

				// Optimize for multiMonth view - skip heavy operations
				const isMultiMonth = view.type === "multiMonthYear";

				// Add data attributes for proper styling
				if (event.extendedProps.cancelled) {
					el.setAttribute("data-cancelled", "true");
				}

				// Add conversation event class
				if (event.extendedProps.type === 2) {
					el.classList.add("conversation-event");
				}

				// Add reservation type class for typed events
				if (event.extendedProps.type === 1) {
					// Follow-up
					el.classList.add("reservation-type-1");
				} else if (event.extendedProps.type === 0) {
					// Check-up
					el.classList.add("reservation-type-0");
				}

				// Add mousedown handler to notify parent when event interaction starts
				if (onEventMouseDown) {
					el.addEventListener("mousedown", onEventMouseDown);
				}

				// Skip context menu for multiMonth view to improve performance
				if (!isMultiMonth) {
					// Add context menu functionality
					const handleContextMenu = (e: MouseEvent) => {
						e.preventDefault();
						e.stopPropagation();

						if (onContextMenu) {
							// Convert FullCalendar event to our CalendarEvent type
							const calendarEvent: CalendarEvent = {
								id: event.id,
								title: event.title,
								start: event.startStr,
								end: event.endStr || event.startStr,
								backgroundColor: event.backgroundColor || "",
								borderColor: event.borderColor || "",
								editable: true,
								extendedProps: {
									type: event.extendedProps?.type || 0,
									cancelled: event.extendedProps?.cancelled || false,
									...event.extendedProps,
								},
							};

							onContextMenu(calendarEvent, { x: e.clientX, y: e.clientY });
						}
					};

					// Add right-click listener
					el.addEventListener("contextmenu", handleContextMenu);
				}

				// Call original handler if provided
				if (onEventDidMount) {
					const safeStart =
						event.start ??
						(event.startStr ? new Date(event.startStr) : new Date());
					onEventDidMount({
						event: {
							id: String(event.id),
							title: String(event.title || ""),
							start: safeStart,
							end: event.end ?? undefined,
							extendedProps: { ...(event.extendedProps || {}) },
						},
						el,
					});
				}
			},
			[onContextMenu, onEventDidMount, onEventMouseDown],
		);

		// Handle view mounting
		const handleViewDidMount = useCallback(
			(info: { view: { type: string; title?: string }; el?: HTMLElement }) => {
				count("fc:viewDidMount");
				// Optimize timing based on view type
				const isMultiMonth = info.view.type === "multiMonthYear";
				const delay = isMultiMonth ? 50 : 250; // Faster for multiMonth

				// Single updateSize call after a short delay for view stabilization
				setTimeout(() => {
					if (onUpdateSize) {
						onUpdateSize();
					}
				}, delay);

				// Call original handler if provided
				if (onViewDidMount && info.el) {
					onViewDidMount({
						view: { type: info.view.type, title: info.view.title || "" },
						el: info.el,
					});
				}
			},
			[onUpdateSize, onViewDidMount],
		);

		// Handle dates set
		const handleDatesSet = useCallback(
			(info: DatesSetArg) => {
				count("fc:datesSet");
				// Single updateSize call after a short delay
				setTimeout(() => {
					if (onUpdateSize) {
						onUpdateSize();
					}
				}, 250);

				// Call original handler if provided
				if (onDatesSet) {
					onDatesSet(info);
				}

				// Only call onNavDate for non-timegrid views to avoid conflicts with dateClick behavior
				// In timegrid views, dateClick handles the date updates directly
				if (onNavDate && !info.view.type.includes("timeGrid")) {
					onNavDate(info.view.currentStart);
				}
			},
			[onUpdateSize, onDatesSet, onNavDate],
		);

		// Update slot times via FullCalendar API instead of remounting
		useEffect(() => {
			const api = calendarRef.current?.getApi();
			if (api) {
				api.setOption("slotMinTime", slotTimes.slotMinTime);
				api.setOption("slotMaxTime", slotTimes.slotMaxTime);
			}
		}, [slotTimes]);

		// Update calendar size when container changes
		useLayoutEffect(() => {
			if (!calendarRef.current || !containerRef.current) return;

			// Debug timezone information - ONLY log once per mount, not on every re-render
			console.log(
				`🕐 Calendar mounted - View: ${props.currentView}, Date: ${props.currentDate?.toISOString()}`,
			);

			// Initial sizing - defer and guard to avoid race conditions
			try {
				const api = calendarRef.current.getApi();
				if (api?.updateSize) {
					requestAnimationFrame(() => {
						try {
							api.updateSize();
						} catch {}
					});
				}
			} catch {}

			// Only observe container resize for views other than multiMonthYear
			const observers: ResizeObserver[] = [];
			if (props.currentView !== "multiMonthYear") {
				const resizeObserver = new ResizeObserver(() => {
					onUpdateSize?.();
				});
				resizeObserver.observe(containerRef.current);
				observers.push(resizeObserver);
			}

			// Always listen to window resize
			const handleWindowResize = () => {
				onUpdateSize?.();
			};
			window.addEventListener("resize", handleWindowResize);

			return () => {
				for (const observer of observers) {
					observer.disconnect();
				}
				window.removeEventListener("resize", handleWindowResize);
			};
		}, [props.currentView, onUpdateSize, props.currentDate?.toISOString]);

		// Callback to determine if an event is allowed to be dragged or resized
		const _handleEventAllow = useCallback(
			(
				dropInfo: { start?: Date; startStr?: string },
				_draggedEvent: EventApi,
			) => {
				// Block drops into the past across all views (unless in free roam)
				try {
					if (!freeRoam) {
						const targetStart: Date | undefined =
							dropInfo?.start ||
							(dropInfo.startStr ? new Date(dropInfo.startStr) : undefined);
						if (targetStart) {
							const today = new Date();
							today.setHours(0, 0, 0, 0);
							const targetDay = new Date(targetStart);
							targetDay.setHours(0, 0, 0, 0);
							if (targetDay < today) return false;
						}
					}
				} catch {}

				// Delegate to external override if provided
				// eventAllow removed to align with core types and avoid overload mismatch
				// Allow UI to perform the drop; backend will validate and we will revert on failure
				return true;
			},
			[freeRoam],
		);

		// Track in-flight and queued changes per event for fluid UX
		const _processingEvents = useRef(new Set<string>());
		const _queuedTargets = useRef(
			new Map<string, { startStr: string; endStr?: string }>(),
		);

		// Enhanced event change handler with coalescing to keep UI fluid under rapid moves
		const handleEventChangeWithProcessing = useCallback(
			async (info: EventChangeArg) => {
				const eventId: string | undefined = info?.event?.id;
				if (!eventId) return;

				// Suppress handler if programmatic updates are in progress
				try {
					const depth = Number(
						(globalThis as { __suppressEventChangeDepth?: number })
							.__suppressEventChangeDepth ?? 0,
					);
					if (depth > 0) return;
				} catch {}

				onEventChange?.(info);
			},
			[onEventChange],
		);

		// // Navigate calendar when currentDate prop changes
		// useEffect(() => {
		//   if (calendarRef.current) {
		//     const api = calendarRef.current.getApi();
		//     const viewStart = api.getDate(); // current anchor date
		//     if (viewStart.getTime() !== currentDate.getTime()) {
		//       api.gotoDate(currentDate);
		//     }
		//   }
		// }, [currentDate]);

		return (
			<div
				ref={containerRef}
				className={`w-full ${currentView === "listMonth" || currentView === "multiMonthYear" ? "" : "min-h-[600px]"} ${getCalendarClassNames(currentView)}`}
				data-free-roam={freeRoam}
			>
				<FullCalendar
					ref={calendarRef}
					plugins={[
						multiMonthPlugin,
						dayGridPlugin,
						timeGridPlugin,
						listPlugin,
						interactionPlugin,
					]}
					initialView={currentView}
					initialDate={currentDate}
					height={calendarHeight}
					contentHeight={calendarHeight}
					events={renderEvents}
					// Header configuration - disable native toolbar since we use dock navbar
					headerToolbar={false}
					// Enhanced calendar options
					editable={true}
					selectable={true}
					unselectAuto={false}
					selectMirror={false}
					selectMinDistance={0}
					eventStartEditable={true}
					eventDurationEditable={false}
					eventOverlap={true}
					expandRows={true}
					navLinks={true}
					weekNumbers={false}
					buttonIcons={{
						prev: "chevron-left",
						next: "chevron-right",
					}}
					nowIndicator={true}
					allDaySlot={false}
					slotDuration={{ hours: SLOT_DURATION_HOURS }}
					// Business hours and constraints
					businessHours={businessHours}
					// Only enforce constraints in timeGrid views so month/week drags are not blocked
					eventConstraint={
						!freeRoam && (currentView || "").toLowerCase().includes("timegrid")
							? "businessHours"
							: undefined
					}
					selectConstraint={
						!freeRoam && (currentView || "").toLowerCase().includes("timegrid")
							? "businessHours"
							: undefined
					}
					selectAllow={handleSelectAllow}
					hiddenDays={freeRoam ? [] : [5]} // Hide Friday unless in free roam
					// Valid range for navigation
					{...validRangeProp}
					// View-specific overrides for multiMonthYear
					views={viewsProp}
					// Dynamic slot times
					slotMinTime={slotTimes.slotMinTime}
					slotMaxTime={slotTimes.slotMaxTime}
					// Localization and Timezone (critical - matches Python implementation)
					locale={isRTL ? arLocale : "en"}
					direction={"ltr"}
					timeZone={TIMEZONE} // ✅ Critical: Set timezone like Python calendar_view.py
					firstDay={6} // Saturday as first day
					aspectRatio={1.4}
					// Multi-month specific options
					multiMonthMaxColumns={3}
					multiMonthMinWidth={280}
					fixedWeekCount={false}
					showNonCurrentDates={false}
					dayMaxEvents={true}
					dayMaxEventRows={true}
					moreLinkClick="popover"
					eventDisplay="block"
					displayEventTime={true}
					eventTimeFormat={{
						hour: "numeric",
						minute: "2-digit",
						meridiem: "short",
						hour12: true,
					}}
					// Interaction control
					// eventAllow intentionally omitted; rely on validRange/selectAllow/businessHours
					// Styling
					eventClassNames={(arg: EventContentArg) => {
						const event = arg?.event;
						const classes = ["text-xs"] as string[];
						const type = event?.extendedProps?.type;
						if (type === 2) {
							classes.push("conversation-event");
						} else {
							// All reservation-like events share unified styling and type tokens
							classes.push("reservation-event");
							if (type === 1) classes.push("reservation-type-1");
							else classes.push("reservation-type-0");
						}
						return classes;
					}}
					dayCellClassNames={getDayCellClassNames}
					dayHeaderClassNames={getDayHeaderClassNames}
					viewClassNames="bg-card rounded-lg shadow-sm"
					// Event callbacks - use enhanced handler for eventChange
					dateClick={onDateClick}
					select={onSelect}
					eventClick={onEventClick}
					eventChange={handleEventChangeWithProcessing}
					viewDidMount={handleViewDidMount}
					eventDidMount={handleEventDidMount}
					datesSet={handleDatesSet}
					eventMouseEnter={onEventMouseEnter}
					eventMouseLeave={onEventMouseLeave}
					eventDragStart={(info) => {
						try {
							(
								globalThis as { __isCalendarDragging?: boolean }
							).__isCalendarDragging = true;
						} catch {}
						if (onEventDragStart) {
							const e = info.event;
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
							onEventDragStart({
								event: {
									id: String(e.id),
									title: String(e.title || ""),
									start: safeStart,
									end: e.end ?? undefined,
									extendedProps: { ...(e.extendedProps || {}) },
								},
								el: info.el as HTMLElement,
								jsEvent: info.jsEvent as MouseEvent,
							});
						}
					}}
					eventDragStop={(info) => {
						try {
							(
								globalThis as { __isCalendarDragging?: boolean }
							).__isCalendarDragging = false;
						} catch {}
						if (onEventDragStop) {
							const e = info.event;
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
							onEventDragStop({
								event: {
									id: String(e.id),
									title: String(e.title || ""),
									start: safeStart,
									end: e.end ?? undefined,
									extendedProps: { ...(e.extendedProps || {}) },
								},
								el: info.el as HTMLElement,
								jsEvent: info.jsEvent as MouseEvent,
							});
						}
					}}
					// Time grid specific options
					slotLabelFormat={{
						hour: "numeric",
						minute: "2-digit",
						omitZeroMinute: true,
						meridiem: "short",
					}}
					slotLabelInterval={{ hours: 1 }}
					// Drag and drop options
					droppable={droppable}
					eventReceive={onEventReceive}
					eventLeave={onEventLeave}
				/>
			</div>
		);
	},
);

CalendarCoreComponent.displayName = "CalendarCore";

export const CalendarCore = CalendarCoreComponent;
