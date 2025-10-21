/**
 * Calendar Core Component
 *
 * Pure FullCalendar rendering component focused solely on display and configuration.
 * Receives all data and handlers as props, contains no business logic.
 * Optimized for performance with proper memoization.
 */

"use client";

import type { EventApi } from "@fullcalendar/core";
import arLocale from "@fullcalendar/core/locales/ar-sa";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
	getBusinessHours,
	SLOT_DURATION_HOURS,
	TIMEZONE,
} from "@shared/libs/calendar/calendar-config";
import {
	profileCount,
	profileMark,
	profileTimeEnd,
	profileTimeStart,
} from "@shared/libs/utils/calendar-profiler";
import type {
	CalendarCoreProps,
	CalendarCoreRef,
} from "@widgets/calendar/types";
import { getCalendarClassNames } from "@widgets/calendar/utils/view-class-names";
import { type RefObject, useMemo, useRef } from "react";
import { buildConstraintsProp } from "./config/constraints";
import { buildValidRangeProp } from "./config/valid-range";
import { buildViewsProp } from "./config/views";
import { createEventAllow } from "./guards/event-allow";
import { createSelectAllow } from "./guards/select-allow";
import { createDatesSet } from "./handlers/on-dates-set";
import { createEventChangeHandler } from "./handlers/on-event-change";
import { createEventDidMount } from "./handlers/on-event-did-mount";
import { createViewDidMount } from "./handlers/on-view-did-mount";
import { useExposeCalendarApi } from "./hooks/use-expose-calendar-api";
import { useModifierKeyClasses } from "./hooks/use-modifier-key-classes";
import { useMountWhenSized } from "./hooks/use-mount-when-sized";
import { useRenderEvents } from "./hooks/use-render-events";
import { useResizeSync } from "./hooks/use-resize-sync";
import { useSlotTimes } from "./hooks/use-slot-times";
import { useValidRangeSync } from "./hooks/use-valid-range-sync";
import { eventContent } from "./renderers/event-content";
import { setIsDragging } from "./state/dragging";
import { createDayCellClassNames } from "./style/day-cell-class-names";
import { createDayHeaderClassNames } from "./style/day-header-class-names";
import { eventClassNames } from "./utils/event-class-names";
import { optimizeEvents, sanitizeEvents } from "./utils/events";

// Constants for magic numbers
const FRIDAY_DAY_INDEX = 5;
const MOBILE_BREAKPOINT = 640;
const ASPECT_RATIO = 1.4;
const MULTIMONTH_MAX_COLUMNS = 3;
const MULTIMONTH_MIN_WIDTH = 280;

// Types moved to @widgets/calendar/types

// view class names helper moved to @widgets/calendar/utils/viewClassNames

/**
 * Calendar Core Component - Pure FullCalendar rendering
 */
const CalendarCoreComponent = ({
	ref,
	...props
}: CalendarCoreProps & {
	ref?: RefObject<CalendarCoreRef | null> | undefined;
}) => {
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
		const t0 = profileTimeStart("optimizeEvents", {
			view: currentView,
			in: Array.isArray(events) ? events.length : 0,
		});
		const out = optimizeEvents(events, currentView);
		profileTimeEnd("optimizeEvents", t0, {
			out: Array.isArray(out) ? out.length : 0,
		});
		return out;
	}, [events, currentView]);

	// Sanitize events to guard against any with missing/invalid start
	const sanitizedEvents = useMemo(() => {
		const t0 = profileTimeStart("sanitizeEvents", {
			in: Array.isArray(optimizedEvents) ? optimizedEvents.length : 0,
		});
		const out = sanitizeEvents(optimizedEvents);
		profileTimeEnd("sanitizeEvents", t0, {
			out: Array.isArray(out) ? out.length : 0,
		});
		profileCount("events.sanitized", Array.isArray(out) ? out.length : 0, {
			view: currentView,
		});
		return out;
	}, [optimizedEvents, currentView]);
	const isMultiMonthYear = currentView === "multiMonthYear";
	const dayGridMaxRows = isMultiMonthYear ? 2 : true;
	const dayGridMaxEvents = isMultiMonthYear ? 2 : true;
	const eventStackLimit = isMultiMonthYear ? 1 : 3;

	// Freeze external event updates while dragging to prevent snap-back
	const renderEvents = useRenderEvents(sanitizedEvents);
	// Log only when renderEvents identity changes
	useMemo(() => {
		profileMark("calendar.renderEvents.updated", {
			count: Array.isArray(renderEvents) ? renderEvents.length : 0,
		});
		return null;
	}, [renderEvents]);

	const calendarRef = useRef<FullCalendar>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const mountReady = useMountWhenSized(containerRef);

	// Removed dynamic text resizing and fitting logic for event titles/time

	// Stable callbacks and renderers moved to utilities

	// Expose calendar API to parent component
	useExposeCalendarApi(ref, calendarRef);

	// Memoize business hours to prevent unnecessary recalculations
	const businessHours = useMemo(() => getBusinessHours(freeRoam), [freeRoam]);

	// Prepare validRange prop for FullCalendar
	const validRangeProp = useMemo(
		() =>
			buildValidRangeProp({
				freeRoam,
				overrideValidRange: props.overrideValidRange,
				currentView,
			}),
		[freeRoam, props.overrideValidRange, currentView]
	);

	// View-specific overrides
	const viewsProp = useMemo(() => buildViewsProp(), []);

	// Conditionally apply constraints only for timeGrid views (avoid undefined props)
	const constraintsProp = useMemo(
		() => buildConstraintsProp({ freeRoam, currentView }),
		[freeRoam, currentView]
	);

	// Day cell class names (vacation styling now handled by background events)
	const dayCellClassNames = useMemo(
		() =>
			createDayCellClassNames({
				currentDate,
				freeRoam,
				...(isVacationDate
					? {
							isVacationDate: (d: Date) =>
								// @ts-expect-error guard in case upstream passes string (older code paths)
								isVacationDate(typeof d === "string" ? new Date(d) : d),
						}
					: {}),
			}),
		[currentDate, freeRoam, isVacationDate]
	);

	// Day header class names - mark vacation headers to disable nav link clicks via CSS
	const dayHeaderClassNames = useMemo(
		() => createDayHeaderClassNames({ isVacationDate }),
		[isVacationDate]
	);

	// Prevent selecting ranges that include vacation days
	const selectAllow = useMemo(
		() => createSelectAllow({ isVacationDate }),
		[isVacationDate]
	);

	// Block dragging into or within vacation days; allow event clicks
	// (moved to guard factory used directly in JSX)

	// Handle event mounting via extracted factory
	const eventDidMount = useMemo(
		() =>
			createEventDidMount({
				...(onContextMenu ? { onContextMenu } : {}),
				...(onEventDidMount ? { onEventDidMount } : {}),
				...(onEventMouseDown ? { onEventMouseDown } : {}),
			}),
		[onContextMenu, onEventDidMount, onEventMouseDown]
	);

	// Handle view mounting (extracted)
	const viewDidMount = useMemo(
		() =>
			createViewDidMount({
				...(onViewDidMount ? { onViewDidMount } : {}),
				getApi: () => calendarRef.current?.getApi?.(),
			}),
		[onViewDidMount]
	);

	// Handle dates set (extracted)
	const datesSet = useMemo(
		() =>
			createDatesSet({
				...(onDatesSet ? { onDatesSet } : {}),
				...(onNavDate ? { onNavDate } : {}),
				getApi: () => calendarRef.current?.getApi?.(),
			}),
		[onDatesSet, onNavDate]
	);

	// Update slot times via FullCalendar API instead of remounting (extracted)
	useSlotTimes(calendarRef, slotTimes);

	// Ensure month view can navigate to the past when freeRoam is enabled (extracted)
	useValidRangeSync(calendarRef, { freeRoam, currentView });

	// Update calendar size when container changes (extracted)
	useResizeSync(calendarRef, containerRef);

	// (removed) _handleEventAllow was unused; relying on other constraints

	// Track in-flight and queued changes per event for fluid UX (reserved for future use)
	// const _processingEvents = useRef(new Set<string>());
	// const _queuedTargets = useRef(
	// 	new Map<string, { startStr: string; endStr?: string }>(),
	// );

	// Enhanced event change handler with coalescing (extracted)
	const eventChange = useMemo(
		() =>
			createEventChangeHandler({
				...(onEventChange ? { onEventChange } : {}),
			}),
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

	// Keyboard/Pointer modifier classes (extracted)
	useModifierKeyClasses(containerRef);

	return (
		<div
			className={`h-full w-full ${
				currentView === "listMonth" || currentView === "multiMonthYear"
					? ""
					: "min-h-[37.5rem]"
			} ${getCalendarClassNames(currentView)}`}
			data-free-roam={freeRoam}
			ref={containerRef}
		>
			{mountReady && (
				<FullCalendar
					businessHours={businessHours}
					buttonIcons={{
						prev: "chevron-left",
						next: "chevron-right",
					}}
					contentHeight={calendarHeight}
					editable={true}
					eventDurationEditable={false}
					eventOverlap={true}
					eventStartEditable={true}
					// Header configuration - disable native toolbar since we use dock navbar
					events={renderEvents}
					// Enhanced calendar options
					expandRows={true}
					headerToolbar={false}
					height={calendarHeight}
					initialDate={currentDate}
					initialView={currentView}
					navLinks={navLinksEnabled}
					nowIndicator={true}
					plugins={[
						multiMonthPlugin,
						dayGridPlugin,
						timeGridPlugin,
						listPlugin,
						interactionPlugin,
					]}
					ref={calendarRef}
					selectable={true}
					selectMinDistance={0}
					selectMirror={false}
					slotDuration={{ hours: SLOT_DURATION_HOURS }}
					unselectAuto={false}
					// Business hours and constraints
					weekNumbers={false}
					{
						// Only enforce constraints in timeGrid views so month/week drags are not blocked
						...constraintsProp
					}
					hiddenDays={freeRoam ? [] : [FRIDAY_DAY_INDEX]}
					selectAllow={selectAllow} // Hide Friday unless in free roam
					{
						// Valid range for navigation
						...validRangeProp
					}
					// View-specific overrides for multiMonthYear
					aspectRatio={ASPECT_RATIO}
					// Dynamic slot times
					dayMaxEventRows={dayGridMaxRows}
					dayMaxEvents={dayGridMaxEvents}
					eventMaxStack={eventStackLimit}
					// Localization and Timezone (critical - matches Python implementation)
					direction={"ltr"}
					displayEventTime={true}
					eventDisplay="block" // ✅ Critical: Set timezone like Python calendar_view.py
					eventTimeFormat={
						typeof window !== "undefined" &&
						window.innerWidth < MOBILE_BREAKPOINT
							? { hour: "2-digit", minute: "2-digit" }
							: {
									hour: "numeric",
									minute: "2-digit",
									meridiem: "short",
									hour12: true,
								}
					} // Saturday as first day
					firstDay={6}
					// Multi-month specific options
					fixedWeekCount={false}
					locale={isLocalized ? arLocale : "en"}
					moreLinkClick="popover"
					multiMonthMaxColumns={MULTIMONTH_MAX_COLUMNS}
					multiMonthMinWidth={MULTIMONTH_MIN_WIDTH}
					showNonCurrentDates={false}
					slotMaxTime={slotTimes.slotMaxTime}
					slotMinTime={slotTimes.slotMinTime}
					timeZone={TIMEZONE}
					views={viewsProp}
					{
						// Interaction control
						// Block drag/resizes in vacation periods while allowing event clicks
						...(isVacationDate
							? {
									// FullCalendar's type expects (dropInfo, draggedEvent) but for resizes it passes (resizeInfo)
									// We only care about the new start/end range to validate against vacations
									eventAllow: createEventAllow({ isVacationDate }),
								}
							: {})
					}
					// Styling
					dayCellClassNames={dayCellClassNames}
					dayHeaderClassNames={dayHeaderClassNames}
					eventClassNames={eventClassNames}
					eventContent={eventContent}
					viewClassNames="bg-card rounded-lg shadow-sm"
					{
						// Event callbacks - use enhanced handler for eventChange
						...(onDateClick ? { dateClick: onDateClick } : {})
					}
					{...(onSelect ? { select: onSelect } : {})}
					{...(onEventClick ? { eventClick: onEventClick } : {})}
					datesSet={datesSet}
					eventChange={eventChange}
					eventDidMount={eventDidMount}
					viewDidMount={viewDidMount}
					{...(onEventMouseEnter ? { eventMouseEnter: onEventMouseEnter } : {})}
					{...(onEventMouseLeave ? { eventMouseLeave: onEventMouseLeave } : {})}
					droppable={Boolean(droppable)}
					eventDragStart={(info) => {
						try {
							setIsDragging(true);
						} catch {
							// Error handling
						}
						if (onEventDragStart) {
							const e = info.event;
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
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
					// Time grid specific options
					eventDragStop={(info) => {
						try {
							setIsDragging(false);
						} catch {
							// Error handling
						}
						if (onEventDragStop) {
							const e = info.event;
							const safeStart =
								e.start ?? (e.startStr ? new Date(e.startStr) : new Date());
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
					slotLabelFormat={{
						hour: "numeric",
						minute: "2-digit",
						omitZeroMinute: true,
						meridiem: "short",
					}}
					// Drag and drop options
					slotLabelInterval={{ hours: 1 }}
					{...(onEventReceive
						? {
								eventReceive: (info: unknown) =>
									onEventReceive(
										info as { event: EventApi; draggedEl: HTMLElement }
									),
							}
						: {})}
					{...(onEventLeave
						? {
								eventLeave: (info: unknown) =>
									onEventLeave(
										info as { event?: EventApi; draggedEl: HTMLElement }
									),
							}
						: {})}
				/>
			)}
		</div>
	);
};

CalendarCoreComponent.displayName = "CalendarCore";

export const CalendarCore = CalendarCoreComponent;
export type { CalendarCoreRef } from "@widgets/calendar/types";
