/**
 * Calendar Core Component
 *
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

"use client";

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
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useEffect,
} from "react";
import { count } from "@/lib/dev-profiler";
import {
	getBusinessHours,
	getValidRange,
	SLOT_DURATION_HOURS,
	TIMEZONE,
} from "@/lib/calendar-config";
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
	onDateClick?: (info: any) => void;
	onSelect?: (info: any) => void;
	onEventClick?: (info: any) => void;
	onEventChange?: (info: any) => void;
	onViewDidMount?: (info: any) => void;
	onEventDidMount?: (info: any) => void;
	onDatesSet?: (info: any) => void;
	onEventMouseEnter?: (info: any) => void;
	onEventMouseLeave?: (info: any) => void;
	onEventDragStart?: (info: any) => void;
	onEventDragStop?: (info: any) => void;
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
	onEventReceive?: (info: any) => void;
	onEventLeave?: (info: any) => void;
	eventAllow?: (dropInfo: any, draggedEvent: any) => boolean;

	// Add to CalendarCoreProps after onViewChange
	onNavDate?: (date: Date) => void;
}

// Export the ref type for parent components
export interface CalendarCoreRef {
	getApi: () => any;
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
			slotTimesKey,
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
			onViewChange,
			onContextMenu,
			onUpdateSize,
			onEventMouseDown,
			onNavDate,
			droppable,
			onEventReceive,
			onEventLeave,
			eventAllow,
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

		const calendarRef = useRef<FullCalendar>(null);
		const containerRef = useRef<HTMLDivElement>(null);

		// Expose calendar API to parent component
		useImperativeHandle(
			ref,
			() => ({
				getApi: () => calendarRef.current?.getApi(),
				updateSize: () => {
					if (calendarRef.current) {
						calendarRef.current.getApi().updateSize();
					}
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

		// Prepare validRange prop for FullCalendar (omit if undefined)
		const validRangeProp = globalValidRangeFunction
			? { validRange: globalValidRangeFunction }
			: {};

		// View-specific overrides: disable validRange for multiMonthYear view
		const viewsProp = useMemo(
			() => ({
				multiMonthYear: {
					validRange: undefined,
					displayEventTime: false as const,
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
			(arg: any) => {
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
		const getDayHeaderClassNames = useCallback((_arg: any) => {
			// Note: Vacation styling is now handled by FullCalendar background events
			// No need to check isVacationDate here
			return "";
		}, []);

		// Handle event mounting with context menu support
		const handleEventDidMount = useCallback(
			(info: any) => {
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
					onEventDidMount(info);
				}
			},
			[onContextMenu, onEventDidMount, onEventMouseDown],
		);

		// Handle view mounting
		const handleViewDidMount = useCallback(
			(info: any) => {
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
				if (onViewDidMount) {
					onViewDidMount(info);
				}
			},
			[onUpdateSize, onViewDidMount],
		);

		// Handle dates set
		const handleDatesSet = useCallback(
			(info: any) => {
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

				// Only call onNavDate for non-timegrid views to avoid conflicts with slot time switching
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
				api.setOption('slotMinTime', slotTimes.slotMinTime);
				api.setOption('slotMaxTime', slotTimes.slotMaxTime);
			}
		}, [slotTimes]);

		// Update calendar size when container changes
		useLayoutEffect(() => {
			if (!calendarRef.current || !containerRef.current) return;

			// Debug timezone information - ONLY log once per mount, not on every re-render
			console.log(
				`🕐 Calendar mounted - View: ${props.currentView}, Date: ${props.currentDate?.toISOString()}`,
			);

			// Initial sizing - immediate
			calendarRef.current.getApi().updateSize();

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
				observers.forEach((obs) => obs.disconnect());
				window.removeEventListener("resize", handleWindowResize);
			};
		}, [props.currentView, onUpdateSize]);

		// Callback to determine if an event is allowed to be dragged or resized
		const handleEventAllow = useCallback(
			(dropInfo: any, draggedEvent: any) => {
				// Delegate to external override if provided
				if (eventAllow) return eventAllow(dropInfo, draggedEvent);
				// Allow UI to perform the drop; backend will validate and we will revert on failure
				return true;
			},
			[eventAllow],
		);

		// Track in-flight and queued changes per event for fluid UX
		const processingEvents = useRef(new Set<string>());
		const queuedTargets = useRef(new Map<string, { startStr: string; endStr?: string }>());

		// Enhanced event change handler with coalescing to keep UI fluid under rapid moves
		const handleEventChangeWithProcessing = useCallback(
			async (info: any) => {
				const eventId: string = info?.event?.id;
				if (!eventId) return;

				// If a change is already processing for this event, queue the latest target and exit (latest wins)
				if (processingEvents.current.has(eventId)) {
					queuedTargets.current.set(eventId, {
						startStr: info.event.startStr,
						endStr: info.event.endStr || undefined,
					});
					return;
				}

				// Helper to apply a change (initial and any queued) sequentially
				const applyChangeSequence = async (): Promise<void> => {
					processingEvents.current.add(eventId);
					// Visual indication (best-effort)
					const eventEl = info?.el as HTMLElement | undefined;
					if (eventEl) eventEl.classList.add("processing");
					try {
						if (onEventChange) {
							// Apply the original drop first
							await onEventChange(info);
						}
						// Drain any queued targets for this event (keep only newest at call time)
						while (queuedTargets.current.has(eventId)) {
							const next = queuedTargets.current.get(eventId)!;
							queuedTargets.current.delete(eventId);
							// Update the calendar event to the queued target, then persist via handler
							try {
								const api = calendarRef.current?.getApi?.();
								const ev = api?.getEventById(eventId);
								if (ev && next.startStr) {
									const prevStart = ev.startStr;
									try {
										// Ensure UI reflects newest queued target immediately
										ev.setDates(new Date(next.startStr), null);
									} catch {}
									if (onEventChange) {
										await onEventChange({
											event: ev,
											oldEvent: undefined,
											revert: () => {
												try {
													ev.setDates(new Date(prevStart), null);
												} catch {}
											},
										});
									}
								}
							} catch {}
						}
					} finally {
						processingEvents.current.delete(eventId);
						const eventEl = info?.el as HTMLElement | undefined;
						if (eventEl) eventEl.classList.remove("processing");
					}
				};

				await applyChangeSequence();
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
					events={optimizedEvents}
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
					eventConstraint={freeRoam ? undefined : "businessHours"}
					selectConstraint={freeRoam ? undefined : "businessHours"}
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
					displayEventTime={currentView !== "multiMonthYear"}
					// Interaction control
					eventAllow={handleEventAllow}
					// Styling
					eventClassNames={(arg) => {
						const event = arg?.event as any;
						const classes = ["rounded", "px-1", "text-xs"] as string[];
						const type = event?.extendedProps?.type;
						if (type === 2) {
							classes.push("conversation-event");
						} else if (type === 1) {
							classes.push("reservation-type-1");
						} else if (type === 0) {
							classes.push("reservation-type-0");
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
					eventDragStart={onEventDragStart}
					eventDragStop={onEventDragStop}
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
