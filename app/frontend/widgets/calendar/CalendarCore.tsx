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
// @ts-expect-error - FullCalendar timegrid module resolution differs between dev and prod
import timeGridPlugin from "@fullcalendar/timegrid";
import { getBusinessHours, getValidRange, SLOT_DURATION_HOURS, TIMEZONE } from "@shared/libs/calendar/calendar-config";
import { count } from "@shared/libs/dev-profiler";
import { cn } from "@shared/libs/utils";
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
import type { CalendarEvent } from "@/entities/event";

export interface CalendarCoreProps {
	// Data props
	events: CalendarEvent[];

	// State props
	currentView: string;
	currentDate: Date;
	isLocalized: boolean;
	freeRoam: boolean;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	calendarHeight: number | "auto" | "parent";
	// Optional: allow past navigation by disabling validRange
	overrideValidRange?: boolean;

	// Vacation checker
	isVacationDate?: (dateStr: string) => boolean;

	// Event handlers
	onDateClick?: (info: { date: Date; dateStr: string; allDay: boolean }) => void;
	onSelect?: (info: { start: Date; end: Date; startStr: string; endStr: string; allDay: boolean }) => void;
	onEventClick?: (info: EventClickArg) => void;
	onEventChange?: (info: EventChangeArg) => void;
	onViewDidMount?: (info: { view: { type: string; title: string }; el: HTMLElement }) => void;
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
	onContextMenu?: (event: CalendarEvent, position: { x: number; y: number }) => void;

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

	// Toggle FullCalendar navLinks (clickable day/week headers)
	navLinks?: boolean;
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
const CalendarCoreComponent = forwardRef<CalendarCoreRef, CalendarCoreProps>((props, ref) => {
	const {
		events,
		currentView,
		currentDate,
		isLocalized,
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
		onEventMouseDown,
		onNavDate,
		droppable,
		onEventReceive,
		onEventLeave,
		navLinks: navLinksEnabled = true,
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
			const isDateOnly = (value: string) => /^(\d{4})-(\d{2})-(\d{2})$/.test(value);
			return (optimizedEvents || []).filter((e: CalendarEvent) => {
				const s = e?.start;
				if (!s || typeof s !== "string") return false;
				// Allow background/allDay events with date-only strings without constructing Date
				if ((e.display === "background" || e.allDay === true) && isDateOnly(s)) return true;
				const d = new Date(s);
				return !Number.isNaN(d.getTime());
			});
		} catch {
			return [] as CalendarEvent[];
		}
	}, [optimizedEvents]);

	// Freeze external event updates while dragging to prevent snap-back
	const frozenEventsRef = useRef<CalendarEvent[]>([]);
	const [renderEvents, setRenderEvents] = useState<CalendarEvent[]>(sanitizedEvents);
	useEffect(() => {
		try {
			const isDragging = (globalThis as { __isCalendarDragging?: boolean }).__isCalendarDragging === true;

			if (process.env.NODE_ENV !== "production") {
				console.log("📅 [CALENDAR-CORE] Setting render events:", {
					sanitizedEventsCount: sanitizedEvents.length,
					isDragging,
					vacationEventsInSanitized: sanitizedEvents.filter((e) => e.extendedProps?.__vacation).length,
					backgroundEventsInSanitized: sanitizedEvents.filter((e) => e.display === "background").length,
					sampleBackgroundEvents: sanitizedEvents
						.filter((e) => e.display === "background")
						.slice(0, 3)
						.map((e) => ({
							id: e.id,
							start: e.start,
							end: e.end,
							display: e.display,
							className: e.className,
						})),
				});
			}

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
	const [mountReady, setMountReady] = useState(false);

	// Defer mounting FullCalendar until container has measurable size (prevents zoomed-in initial paint on mobile)
	useEffect(() => {
		let raf = 0;
		let tries = 0;
		const tick = () => {
			tries += 1;
			try {
				const rect = containerRef.current?.getBoundingClientRect?.();
				if (rect && rect.width > 2 && rect.height > 2) {
					setMountReady(true);
					return;
				}
			} catch {}
			if (tries < 60) {
				raf = requestAnimationFrame(tick);
			} else {
				setMountReady(true);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);

	// Removed dynamic text resizing and fitting logic for event titles/time

	// Stable callbacks for FullCalendar props to avoid conditional hook calls
	const eventClassNamesMemo = useCallback((arg: EventContentArg) => {
		const event = arg?.event;
		const classes = ["text-xs"] as string[];
		const type = event?.extendedProps?.type;
		// Skip reservation/conversation classes for vacation text overlays
		if (event?.classNames?.includes("vacation-text-event")) {
			classes.push("vacation-text-event");
			return classes;
		}
		if (type === 2) {
			classes.push("conversation-event");
		} else {
			// All reservation-like events share unified styling and type tokens
			classes.push("reservation-event");
			if (type === 1) classes.push("reservation-type-1");
			else classes.push("reservation-type-0");
		}
		return classes;
	}, []);

	const eventContentMemo = useCallback((arg: EventContentArg) => {
		// If this is a vacation text overlay, render large centered title only
		if (arg?.event?.classNames?.includes("vacation-text-event")) {
			const wrapper = document.createElement("div");
			wrapper.style.position = "absolute";
			wrapper.style.inset = "0";
			wrapper.style.display = "flex";
			wrapper.style.alignItems = "center";
			wrapper.style.justifyContent = "center";
			wrapper.style.pointerEvents = "none";
			const title = document.createElement("div");
			title.textContent = arg?.event?.title || "";
			title.style.fontWeight = "800";
			title.style.fontSize = "18px";
			title.style.letterSpacing = "0.3px";
			wrapper.appendChild(title);
			return { domNodes: [wrapper] };
		}
		// On small screens, suppress time completely for compact single-line titles
		const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 640;
		const { timeText } = arg;
		let startText = isSmallScreen ? "" : timeText || "";
		let endText = "";
		let sep = "";
		if (!isSmallScreen && timeText && /[–—-]/.test(timeText)) {
			const parts = timeText.split(/\s*[–—-]\s*/);
			startText = (parts[0] || "").trim();
			endText = (parts[1] || "").trim();
			sep = endText ? " - " : "";
		}

		const container = document.createElement("div");
		container.className = "fc-event-main-frame";

		const timeContainer = document.createElement("div");
		timeContainer.className = "fc-event-time";
		if (!isSmallScreen) {
			const startSpan = document.createElement("span");
			startSpan.className = "fc-event-time-start";
			startSpan.textContent = startText;
			const sepSpan = document.createElement("span");
			sepSpan.className = "fc-event-time-sep";
			sepSpan.textContent = sep;
			const endSpan = document.createElement("span");
			endSpan.className = "fc-event-time-end";
			endSpan.textContent = endText;
			timeContainer.appendChild(startSpan);
			timeContainer.appendChild(sepSpan);
			timeContainer.appendChild(endSpan);
		}

		const titleSpan = document.createElement("div");
		titleSpan.className = "fc-event-title";
		const fullTitle = String(arg?.event?.title || "");
		const parts = fullTitle.replace(/\s+/g, " ").trim().split(" ");
		let shortTitle = fullTitle;
		if (parts.length >= 3) {
			shortTitle = `${parts[0]} ${parts[1]} ${parts[parts.length - 1]}`;
		} else if (parts.length === 2) {
			shortTitle = `${parts[0]} ${parts[1]}`;
		}
		const shortSpan = document.createElement("span");
		shortSpan.className = "name-short";
		shortSpan.textContent = shortTitle;
		const fullSpan = document.createElement("span");
		fullSpan.className = "name-full";
		fullSpan.textContent = fullTitle;
		titleSpan.appendChild(shortSpan);
		titleSpan.appendChild(fullSpan);
		// Enforce single-line ellipsis on small screens
		if (isSmallScreen) {
			titleSpan.style.whiteSpace = "nowrap";
			titleSpan.style.overflow = "hidden";
			titleSpan.style.textOverflow = "ellipsis";
		}

		// Order is managed by CSS for reservation vs conversation
		container.appendChild(titleSpan);
		if (!isSmallScreen) container.appendChild(timeContainer);

		return { domNodes: [container] };
	}, []);

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
		[]
	);

	// Memoize business hours to prevent unnecessary recalculations
	const businessHours = useMemo(() => getBusinessHours(freeRoam), [freeRoam]);

	/**
	 * Global validRange function for FullCalendar
	 * Applies to all views except where overridden in viewsProp
	 */
	const globalValidRangeFunction = useMemo(() => {
		if (freeRoam) return undefined;
		if (props.overrideValidRange) return undefined;
		// Default to today onward
		return getValidRange(freeRoam);
	}, [freeRoam, props.overrideValidRange]);

	// Prepare validRange prop for FullCalendar
	// Disable validRange specifically for multiMonthYear to avoid plugin issues
	const validRangeProp =
		currentView === "multiMonthYear" || !globalValidRangeFunction ? {} : { validRange: globalValidRangeFunction };

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
			timeGridWeek: {
				allDaySlot: false,
			},
		}),
		[]
	);

	// Conditionally apply constraints only for timeGrid views (avoid undefined props)
	const constraintsProp = useMemo(() => {
		const enabled = !freeRoam && (currentView || "").toLowerCase().includes("timegrid");
		return enabled
			? ({
					eventConstraint: "businessHours" as const,
					selectConstraint: "businessHours" as const,
				} as const)
			: ({} as const);
	}, [freeRoam, currentView]);

	// Day cell class names (vacation styling now handled by background events)
	const getDayCellClassNames = useCallback(
		(arg: { date: Date }) => {
			const cellDate = arg.date;
			// Extract local YYYY-MM-DD to align with vacation checker
			const toYMD = (d: Date) => {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, "0");
				const dd = String(d.getDate()).padStart(2, "0");
				return `${y}-${m}-${dd}`;
			};
			const currentDateStr = toYMD(currentDate);
			const cellDateStr = toYMD(cellDate);

			// Check if this date is in the past
			const isPastDate = cellDate < new Date();

			// Add vacation-day class for cells inside any vacation period
			const vacationClass = isVacationDate && cellDateStr ? (isVacationDate(cellDateStr) ? "vacation-day" : "") : "";

			// Disable hover for past dates when not in free roam
			if (!freeRoam && isPastDate) {
				return vacationClass;
			}

			if (cellDateStr === currentDateStr) {
				return cn("selected-date-cell", vacationClass);
			}

			return cn(vacationClass, "hover:bg-muted cursor-pointer");
		},
		[currentDate, freeRoam, isVacationDate]
	);

	// Day header class names - mark vacation headers to disable nav link clicks via CSS
	const getDayHeaderClassNames = useCallback(
		(arg: { date?: Date }) => {
			try {
				const d = arg?.date;
				if (!d || !isVacationDate) return "";
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, "0");
				const dd = String(d.getDate()).padStart(2, "0");
				const ymd = `${y}-${m}-${dd}`;
				return isVacationDate(ymd) ? "vacation-day-header" : "";
			} catch {
				return "";
			}
		},
		[isVacationDate]
	);

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
		[isVacationDate]
	);

	// Block dragging into or within vacation days; allow event clicks
	const handleEventAllow = useCallback(
		(info: { start?: Date; end?: Date }) => {
			try {
				if (!isVacationDate) return true;
				const start = info?.start ? new Date(info.start) : null;
				const end = info?.end ? new Date(info.end) : null;
				if (!start) return true;
				const cursor = new Date(start);
				// FullCalendar may provide end exclusive; iterate until before end
				while (true) {
					const y = cursor.getFullYear();
					const m = String(cursor.getMonth() + 1).padStart(2, "0");
					const d = String(cursor.getDate()).padStart(2, "0");
					const ymd = `${y}-${m}-${d}`;
					if (isVacationDate(ymd)) return false;
					if (!end) break;
					// Stop when we reach the day before end (end is exclusive)
					const next = new Date(cursor);
					next.setDate(next.getDate() + 1);
					if (next >= end) break;
					cursor.setDate(cursor.getDate() + 1);
				}
			} catch {}
			return true;
		},
		[isVacationDate]
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

			// Assign data attribute for waId to allow CSS/JS toggling
			try {
				const waId = String(
					(event.extendedProps as { waId?: string; wa_id?: string })?.waId ||
						(event.extendedProps as { waId?: string; wa_id?: string })?.wa_id ||
						""
				).trim();
				if (waId) el.setAttribute("data-wa-id", waId);
			} catch {}

			// List view: normalize time cell to start-only structure with optional end (Alt+hover reveals)
			try {
				if (
					String(view?.type || "")
						.toLowerCase()
						.includes("list")
				) {
					const row = el.closest(".fc-list-event") as HTMLElement | null;
					const timeCell = row?.querySelector(".fc-list-event-time") as HTMLElement | null;
					if (timeCell) {
						// Helper to remove any stray raw text nodes (e.g., "11:00am - 11:20am")
						const cleanupTextNodes = (cell: HTMLElement) => {
							try {
								for (const node of Array.from(cell.childNodes)) {
									if (node.nodeType === 3) {
										const text = (node.textContent || "").trim();
										if (text) cell.removeChild(node);
									}
								}
							} catch {}
						};

						// Build structured time spans from the raw text (once)
						const normalize = (cell: HTMLElement) => {
							try {
								let raw = (cell.getAttribute("data-raw-time") || "").trim();
								if (!raw) raw = (cell.textContent || "").trim();
								let startText = raw;
								let endText = "";
								let sep = "";
								if (/[–—-]/.test(raw)) {
									const parts = raw.split(/\s*[–—-]\s*/);
									startText = (parts[0] || "").trim();
									endText = (parts[1] || "").trim();
									sep = endText ? " - " : "";
								}

								while (cell.firstChild) cell.removeChild(cell.firstChild);
								const startSpan = document.createElement("span");
								startSpan.className = "fc-event-time-start";
								startSpan.textContent = startText;
								const sepSpan = document.createElement("span");
								sepSpan.className = "fc-event-time-sep";
								sepSpan.textContent = sep;
								const endSpan = document.createElement("span");
								endSpan.className = "fc-event-time-end";
								endSpan.textContent = endText;
								cell.appendChild(startSpan);
								cell.appendChild(sepSpan);
								cell.appendChild(endSpan);

								cell.style.whiteSpace = "nowrap";
								cell.setAttribute("data-structured", "true");
								cell.setAttribute("data-raw-time", raw);
								cleanupTextNodes(cell);
							} catch {}
						};

						// Normalize and schedule robust cleanups to remove any late-added text
						normalize(timeCell);
						queueMicrotask(() => cleanupTextNodes(timeCell));
						requestAnimationFrame(() => cleanupTextNodes(timeCell));
						// Attach a persistent observer to strip any future raw text
						if (!timeCell.hasAttribute("data-watch-text")) {
							const observer = new MutationObserver(() => cleanupTextNodes(timeCell));
							observer.observe(timeCell, {
								childList: true,
								characterData: true,
								subtree: false,
								attributes: false,
							});
							try {
								(timeCell as unknown as { __fcObserver?: MutationObserver }).__fcObserver = observer;
							} catch {}
							timeCell.setAttribute("data-watch-text", "1");
						}

						// As a belt-and-braces, re-clean on hover interactions
						if (row && !row.hasAttribute("data-hover-cleanup")) {
							const reclean = () => cleanupTextNodes(timeCell);
							row.addEventListener("mouseenter", reclean);
							row.addEventListener("mousemove", reclean);
							row.addEventListener("mouseleave", reclean);
							row.setAttribute("data-hover-cleanup", "1");
						}
					}
				}
			} catch {}

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

			// Removed dynamic text fitting on mount

			// Call original handler if provided
			if (onEventDidMount) {
				const safeStart = event.start ?? (event.startStr ? new Date(event.startStr) : new Date());
				onEventDidMount({
					event: {
						id: String(event.id),
						title: String(event.title || ""),
						start: safeStart,
						...(event.end ? { end: event.end } : {}),
						extendedProps: { ...(event.extendedProps || {}) },
					},
					el,
				});
			}
		},
		[onContextMenu, onEventDidMount, onEventMouseDown]
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
				try {
					const api = calendarRef.current?.getApi?.();
					api?.updateSize?.();
				} catch {}
			}, delay);

			// Call original handler if provided
			if (onViewDidMount && info.el) {
				onViewDidMount({
					view: { type: info.view.type, title: info.view.title || "" },
					el: info.el,
				});
			}
		},
		[onViewDidMount]
	);

	// Handle dates set
	const handleDatesSet = useCallback(
		(info: DatesSetArg) => {
			count("fc:datesSet");
			// Single updateSize call after a short delay
			setTimeout(() => {
				try {
					const api = calendarRef.current?.getApi?.();
					api?.updateSize?.();
				} catch {}
			}, 250);

			// Call original handler if provided
			if (onDatesSet) {
				onDatesSet(info);
			}

			// Only notify parent for non-timegrid views to avoid overriding
			// timeGrid dateClick-driven business hour switching
			if (onNavDate && !info.view.type.includes("timeGrid")) {
				onNavDate(info.view.currentStart);
			}
		},
		[onDatesSet, onNavDate]
	);

	// Update slot times via FullCalendar API instead of remounting
	useEffect(() => {
		const api = calendarRef.current?.getApi();
		if (!api) return;
		try {
			// Batch option updates to avoid double layout/reflow
			// FullCalendar's CalendarApi supports batchRendering
			const run = () => {
				api.setOption("slotMinTime", slotTimes.slotMinTime);
				api.setOption("slotMaxTime", slotTimes.slotMaxTime);
			};
			if (typeof (api as unknown as { batchRendering?: (cb: () => void) => void }).batchRendering === "function") {
				(api as unknown as { batchRendering: (cb: () => void) => void }).batchRendering(run);
			} else {
				run();
			}
			// Nudge size after slot change in next frame
			requestAnimationFrame(() => {
				try {
					api.updateSize?.();
				} catch {}
			});
		} catch {}
	}, [slotTimes]);

	// Ensure month view can navigate to the past when freeRoam is enabled (and always clear for multiMonth)
	useEffect(() => {
		const api = calendarRef.current?.getApi?.();
		if (!api) return;
		try {
			const lower = (currentView || "").toLowerCase();
			const isMultiMonth = lower === "multimonthyear";
			if (freeRoam || isMultiMonth) {
				api.setOption("validRange", undefined);
			} else {
				api.setOption("validRange", getValidRange(false));
			}
		} catch {}
	}, [freeRoam, currentView]);

	// Update calendar size when container changes (attach once)
	useLayoutEffect(() => {
		if (!calendarRef.current || !containerRef.current) return;

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

		// Observe container resize (simple and stable across view changes)
		const observers: ResizeObserver[] = [];
		let resizeScheduled = false;
		const scheduleUpdateSize = () => {
			if (resizeScheduled) return;
			resizeScheduled = true;
			requestAnimationFrame(() => {
				try {
					const api = calendarRef.current?.getApi?.();
					api?.updateSize?.();
				} catch {}
				resizeScheduled = false;
			});
		};
		const resizeObserver = new ResizeObserver(() => {
			scheduleUpdateSize();
		});
		resizeObserver.observe(containerRef.current);
		observers.push(resizeObserver);

		// Always listen to window resize and visibility/focus to handle alt-tab reflow
		const handleWindowResize = () => {
			scheduleUpdateSize();
		};
		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				// Double-pass: once now and once next frame to settle scrollbars
				scheduleUpdateSize();
				requestAnimationFrame(() => scheduleUpdateSize());
			}
		};
		const handleFocus = () => {
			requestAnimationFrame(() => scheduleUpdateSize());
		};
		window.addEventListener("resize", handleWindowResize);
		document.addEventListener("visibilitychange", handleVisibility);
		window.addEventListener("focus", handleFocus);

		return () => {
			for (const observer of observers) {
				observer.disconnect();
			}
			window.removeEventListener("resize", handleWindowResize);
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("focus", handleFocus);
		};
	}, []);

	// (removed) _handleEventAllow was unused; relying on other constraints

	// Track in-flight and queued changes per event for fluid UX (reserved for future use)
	// const _processingEvents = useRef(new Set<string>());
	// const _queuedTargets = useRef(
	// 	new Map<string, { startStr: string; endStr?: string }>(),
	// );

	// Enhanced event change handler with coalescing to keep UI fluid under rapid moves
	const handleEventChangeWithProcessing = useCallback(
		async (info: EventChangeArg) => {
			const eventId: string | undefined = info?.event?.id;
			if (!eventId) return;

			// Suppress handler if programmatic updates are in progress
			try {
				const depth = Number((globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth ?? 0);
				if (depth > 0) return;
			} catch {}

			onEventChange?.(info);
		},
		[onEventChange]
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

	// Global modifier (Alt/Shift) key handling to toggle end-time visibility
	useEffect(() => {
		const refresh = (e?: KeyboardEvent | MouseEvent) => {
			const hasAlt = !!(e && "altKey" in e && e.altKey);
			const hasShift = !!(e && "shiftKey" in e && e.shiftKey);
			if (hasAlt) document.body.classList.add("alt-pressed");
			else document.body.classList.remove("alt-pressed");
			if (hasShift) document.body.classList.add("shift-pressed");
			else document.body.classList.remove("shift-pressed");
		};
		const handleKeyDown = (e: KeyboardEvent) => refresh(e);
		const handleKeyUp = (e: KeyboardEvent) => refresh(e);
		const handleBlur = () => {
			document.body.classList.remove("alt-pressed");
			document.body.classList.remove("shift-pressed");
		};
		const handleVisibility = () => {
			if (document.visibilityState !== "visible") handleBlur();
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", handleBlur);
		document.addEventListener("visibilitychange", handleVisibility);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", handleBlur);
			document.removeEventListener("visibilitychange", handleVisibility);
			document.body.classList.remove("alt-pressed");
			document.body.classList.remove("shift-pressed");
		};
	}, []);

	// Pointer-based modifier detection on the calendar container (robust in Chrome/Windows)
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const updateFromMouse = (e: MouseEvent) => {
			if (e.altKey) document.body.classList.add("alt-pressed");
			else document.body.classList.remove("alt-pressed");
			if (e.shiftKey) document.body.classList.add("shift-pressed");
			else document.body.classList.remove("shift-pressed");
		};
		const clear = () => document.body.classList.remove("alt-pressed");
		container.addEventListener("mousemove", updateFromMouse);
		container.addEventListener("mouseenter", updateFromMouse);
		container.addEventListener("mouseleave", () => {
			clear();
			document.body.classList.remove("shift-pressed");
		});
		return () => {
			container.removeEventListener("mousemove", updateFromMouse);
			container.removeEventListener("mouseenter", updateFromMouse);
			container.removeEventListener("mouseleave", clear);
			clear();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={`w-full h-full ${currentView === "listMonth" || currentView === "multiMonthYear" ? "" : "min-h-[37.5rem]"} ${getCalendarClassNames(currentView)}`}
			data-free-roam={freeRoam}
		>
			{mountReady && (
				<FullCalendar
					ref={calendarRef}
					plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
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
					navLinks={navLinksEnabled}
					weekNumbers={false}
					buttonIcons={{
						prev: "chevron-left",
						next: "chevron-right",
					}}
					nowIndicator={true}
					slotDuration={{ hours: SLOT_DURATION_HOURS }}
					// Business hours and constraints
					businessHours={businessHours}
					// Only enforce constraints in timeGrid views so month/week drags are not blocked
					{...constraintsProp}
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
					locale={isLocalized ? arLocale : "en"}
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
					eventTimeFormat={
						typeof window !== "undefined" && window.innerWidth < 640
							? { hour: "2-digit", minute: "2-digit" }
							: {
									hour: "numeric",
									minute: "2-digit",
									meridiem: "short",
									hour12: true,
								}
					}
					// Interaction control
					// Block drag/resizes in vacation periods while allowing event clicks
					{...(isVacationDate
						? {
								// FullCalendar's type expects (dropInfo, draggedEvent) but for resizes it passes (resizeInfo)
								// We only care about the new start/end range to validate against vacations
								eventAllow: (dropInfo: { start?: Date; end?: Date }) => handleEventAllow(dropInfo),
							}
						: {})}
					// Styling
					eventClassNames={eventClassNamesMemo}
					eventContent={eventContentMemo}
					dayCellClassNames={getDayCellClassNames}
					dayHeaderClassNames={getDayHeaderClassNames}
					viewClassNames="bg-card rounded-lg shadow-sm"
					// Event callbacks - use enhanced handler for eventChange
					{...(onDateClick ? { dateClick: onDateClick } : {})}
					{...(onSelect ? { select: onSelect } : {})}
					{...(onEventClick ? { eventClick: onEventClick } : {})}
					eventChange={handleEventChangeWithProcessing}
					viewDidMount={handleViewDidMount}
					eventDidMount={handleEventDidMount}
					datesSet={handleDatesSet}
					{...(onEventMouseEnter ? { eventMouseEnter: onEventMouseEnter } : {})}
					{...(onEventMouseLeave ? { eventMouseLeave: onEventMouseLeave } : {})}
					eventDragStart={(info) => {
						try {
							(globalThis as { __isCalendarDragging?: boolean }).__isCalendarDragging = true;
						} catch {}
						if (onEventDragStart) {
							const e = info.event;
							const safeStart = e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
							onEventDragStart({
								event: {
									id: String(e.id),
									title: String(e.title || ""),
									start: safeStart,
									...(e.end ? { end: e.end } : {}),
									extendedProps: { ...(e.extendedProps || {}) },
								},
								el: info.el as HTMLElement,
								jsEvent: info.jsEvent as MouseEvent,
							});
						}
					}}
					eventDragStop={(info) => {
						try {
							(globalThis as { __isCalendarDragging?: boolean }).__isCalendarDragging = false;
						} catch {}
						if (onEventDragStop) {
							const e = info.event;
							const safeStart = e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
							onEventDragStop({
								event: {
									id: String(e.id),
									title: String(e.title || ""),
									start: safeStart,
									...(e.end ? { end: e.end } : {}),
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
					droppable={Boolean(droppable)}
					{...(onEventReceive
						? {
								eventReceive: (info: unknown) => onEventReceive(info as { event: EventApi; draggedEl: HTMLElement }),
							}
						: {})}
					{...(onEventLeave
						? {
								eventLeave: (info: unknown) => onEventLeave(info as { event?: EventApi; draggedEl: HTMLElement }),
							}
						: {})}
				/>
			)}
		</div>
	);
});

CalendarCoreComponent.displayName = "CalendarCore";

export const CalendarCore = CalendarCoreComponent;
