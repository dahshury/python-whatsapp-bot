/**
 * Dual Calendar Component
 *
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client";

import type {
	DateSelectArg,
	EventApi,
	EventChangeArg,
} from "@fullcalendar/core";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { DateClickInfo } from "@/lib/calendar-callbacks";
// Import types from calendar handlers
import type {
	CalendarEventData,
	FullCalendarEvent,
	FullCalendarEventChangeInfo,
} from "@/lib/calendar-event-handlers";

// Match the FullCalendarApi interface from calendar-event-handlers.ts
interface FullCalendarApi {
	getEvents: () => Array<{
		id: string;
		title: string;
		start: Date;
		end?: Date;
		extendedProps?: Record<string, unknown>;
		remove: () => void;
	}>;
	getEventById?: (id: string) => FullCalendarEvent | null;
	refetchEvents: () => void;
	[key: string]: unknown;
}

import { useSidebar } from "@/components/ui/sidebar";
// Custom hooks
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendarState } from "@/hooks/useCalendarState";
// Services and utilities
import {
	type CalendarCallbackHandlers,
	createCalendarCallbacks,
	type VacationDateChecker,
} from "@/lib/calendar-callbacks";
import { getTimezone } from "@/lib/calendar-config";
import { handleEventChange as handleEventChangeService } from "@/lib/calendar-event-handlers";
import { filterEventsForCalendar } from "@/lib/calendar-event-processor";
import { useLanguage } from "@/lib/language-context";
import { useVacation } from "@/lib/vacation-context";
import type { CalendarEvent, VacationPeriod } from "@/types/calendar";
// Components
import { CalendarCore, type CalendarCoreRef } from "./calendar-core";
import { CalendarSkeleton } from "./calendar-skeleton";
import { CalendarErrorFallback, ErrorBoundary } from "./error-boundary";

interface DualCalendarComponentProps {
	freeRoam?: boolean;
	initialView?: string;
	initialDate?: string;
	initialLeftView?: string;
	initialRightView?: string;
	onViewChange?: (view: string) => void;
	onLeftViewChange?: (view: string) => void;
	onRightViewChange?: (view: string) => void;
	// Add events props to avoid duplicate API calls
	events?: CalendarEvent[];
	loading?: boolean;
	onRefreshData?: () => Promise<void>;
}

export const DualCalendarComponent = React.forwardRef<
	{
		leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
		rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
		leftView: string;
		rightView: string;
	},
	DualCalendarComponentProps
>(
	(
		{
			freeRoam = false,
			initialView: _initialView = "multiMonthYear",
			initialDate,
			initialLeftView,
			initialRightView,
			onViewChange: _onViewChange,
			onLeftViewChange,
			onRightViewChange,
			events: externalEvents,
			loading: externalLoading,
			onRefreshData: externalRefreshData,
		},
		ref,
	) => {
		const { isLocalized } = useLanguage();
		const {
			handleDateClick: handleVacationDateClick,
			recordingState,
			setOnVacationUpdated,
			vacationPeriods,
		} = useVacation();
		const { state: _sidebarState, open: _sidebarOpen } = useSidebar();

		// Refs for both calendars
		const leftCalendarRef = useRef<CalendarCoreRef>(null);
		const rightCalendarRef = useRef<CalendarCoreRef>(null);

		// Calendar state management for both calendars
		// For dual calendars, we use the specific initial views passed in
		// and don't rely on the shared localStorage 'calendar-view' key
		const resolvedInitialDate = (initialDate ??
			new Date().toISOString().split("T")[0]) as string;

		const leftCalendarState = useCalendarState({
			freeRoam,
			initialView: initialLeftView ?? "multiMonthYear",
			...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		});

		const rightCalendarState = useCalendarState({
			freeRoam,
			initialView: initialRightView ?? "multiMonthYear",
			...(resolvedInitialDate ? { initialDate: resolvedInitialDate } : {}),
		});

		// Expose refs to parent - must be after state declaration but before any conditional returns
		React.useImperativeHandle(
			ref,
			() => ({
				leftCalendarRef,
				rightCalendarRef,
				leftView: leftCalendarState.currentView,
				rightView: rightCalendarState.currentView,
			}),
			[leftCalendarState.currentView, rightCalendarState.currentView],
		);

		// Calendar events management - fix conditional hook usage
		const localEventsState = useCalendarEvents({
			freeRoam,
			isLocalized: isLocalized,
			autoRefresh: false,
		});

		// Use external events if provided, otherwise use local state
		const effectiveEventsState = !externalEvents
			? localEventsState
			: {
					events: [],
					loading: false,
					error: null,
					refreshData: async () => {},
					refetchEvents: async () => {},
					invalidateCache: () => {},
				};

		// Use external events if provided, otherwise use local state
		const allEvents = externalEvents ?? effectiveEventsState.events;
		const loading = externalLoading ?? effectiveEventsState.loading;
		const refreshData = externalRefreshData ?? effectiveEventsState.refreshData;

		// Filter cancelled unless free roam, then lock past reservations in free roam
		const processedAllEvents = useMemo(() => {
			const base = filterEventsForCalendar(allEvents, freeRoam);
			if (!freeRoam) return base;
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return base.map((event) => {
				const eventStartDate = new Date(event.start);
				if (event.extendedProps?.type !== 2 && eventStartDate < today) {
					return {
						...event,
						editable: false,
						eventStartEditable: false,
						eventDurationEditable: false,
						className: event.className
							? [...event.className, "past-reservation-freeroam"]
							: ["past-reservation-freeroam"],
					};
				}
				return event;
			});
		}, [allEvents, freeRoam]);

		// Use processed events for both calendars
		const processedLeftEvents = processedAllEvents;
		const processedRightEvents = processedAllEvents;

		// Vacation period checker (for drag/drop validation only, styling handled by background events)
		const isVacationDate: VacationDateChecker = useMemo(() => {
			return (dateStr: string) => {
				if (vacationPeriods.length === 0) {
					return false;
				}

				for (const period of vacationPeriods) {
					// Create date strings from vacation period dates using same format as dateStr
					const vacationStart = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}-${String(period.start.getDate()).padStart(2, "0")}`;
					const vacationEnd = `${period.end.getFullYear()}-${String(period.end.getMonth() + 1).padStart(2, "0")}-${String(period.end.getDate()).padStart(2, "0")}`;

					if (dateStr >= vacationStart && dateStr <= vacationEnd) {
						return true;
					}
				}
				return false;
			};
		}, [vacationPeriods]);

		// Calculate calendar height based on viewport for each calendar individually
		const calculateLeftHeight = useCallback(() => {
			const viewportHeight = window.innerHeight;
			const headerHeight = 64; // Header with sidebar trigger and dock nav
			const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
			const footerSpace = 4; // Minimal buffer

			const availableHeight =
				viewportHeight - headerHeight - containerPadding - footerSpace;

			// For list view and multiMonth view, use auto to let content determine height
			if (
				leftCalendarState.currentView === "listMonth" ||
				leftCalendarState.currentView === "multiMonthYear"
			) {
				return "auto";
			}

			// For all other views, use calculated height
			return Math.max(availableHeight, 600);
		}, [leftCalendarState.currentView]);

		const calculateRightHeight = useCallback(() => {
			const viewportHeight = window.innerHeight;
			const headerHeight = 64; // Header with sidebar trigger and dock nav
			const containerPadding = 8; // p-1 on both top and bottom (4px * 2)
			const footerSpace = 4; // Minimal buffer

			const availableHeight =
				viewportHeight - headerHeight - containerPadding - footerSpace;

			// For list view and multiMonth view, use auto to let content determine height
			if (
				rightCalendarState.currentView === "listMonth" ||
				rightCalendarState.currentView === "multiMonthYear"
			) {
				return "auto";
			}

			// For all other views, use calculated height
			return Math.max(availableHeight, 600);
		}, [rightCalendarState.currentView]);

		// Set initial heights and update on resize
		const [leftCalendarHeight, setLeftCalendarHeight] = useState<
			number | "auto"
		>(800);
		const [rightCalendarHeight, setRightCalendarHeight] = useState<
			number | "auto"
		>(800);

		useEffect(() => {
			setLeftCalendarHeight(calculateLeftHeight());
			setRightCalendarHeight(calculateRightHeight());

			const handleResize = () => {
				setLeftCalendarHeight(calculateLeftHeight());
				setRightCalendarHeight(calculateRightHeight());
			};

			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}, [calculateLeftHeight, calculateRightHeight]);

		// Update calendar size when sidebar state changes
		useEffect(() => {
			// Small delay to allow CSS transition to start
			const timer = setTimeout(() => {
				setLeftCalendarHeight(calculateLeftHeight());
				setRightCalendarHeight(calculateRightHeight());
				// Update both calendars
				leftCalendarRef.current?.updateSize();
				rightCalendarRef.current?.updateSize();
			}, 50);

			return () => clearTimeout(timer);
		}, [calculateLeftHeight, calculateRightHeight]);

		// Wrapper for refreshData that shows blur animation
		const [isRefreshing, setIsRefreshing] = useState(false);
		const handleRefreshWithBlur = useCallback(async () => {
			setIsRefreshing(true);
			try {
				await refreshData();
			} finally {
				// Small delay to ensure smooth transition
				setTimeout(() => setIsRefreshing(false), 300);
			}
		}, [refreshData]);

		// Handle event change (drag and drop) via centralized handler used by main calendar
		const leftGetCalendarApi = useCallback(
			(): FullCalendarApi | undefined =>
				leftCalendarRef.current?.getApi?.() as FullCalendarApi | undefined,
			[],
		);

		const rightGetCalendarApi = useCallback(
			(): FullCalendarApi | undefined =>
				rightCalendarRef.current?.getApi?.() as FullCalendarApi | undefined,
			[],
		);

		// No-op updater to avoid re-triggering FullCalendar eventChange loop
		const updateEventNoop = useCallback(
			(_id: string, _event: CalendarEventData) => {},
			[],
		);

		const resolveEventViaApi = useCallback(
			(which: "left" | "right", id: string) => {
				try {
					const api =
						which === "left" ? leftGetCalendarApi() : rightGetCalendarApi();
					const ev = api?.getEventById?.(String(id));
					return ev ? { extendedProps: ev.extendedProps || {} } : undefined;
				} catch {
					return undefined;
				}
			},
			[leftGetCalendarApi, rightGetCalendarApi],
		);

		const handleLeftEventChange = useCallback(
			async (
				info: EventChangeArg | { event: EventApi; draggedEl: HTMLElement },
			) => {
				// Dedup guard: suppress duplicate handling (eventReceive + eventChange)
				try {
					const globalWithGuard = globalThis as {
						__dualHandlersGuard?: Map<string, number>;
					};
					globalWithGuard.__dualHandlersGuard =
						globalWithGuard.__dualHandlersGuard || new Map<string, number>();
					const ev = info?.event as
						| { id?: unknown; startStr?: string; start?: Date }
						| undefined;
					const key =
						ev && (ev.id != null || ev.startStr != null || ev.start != null)
							? `${String(ev.id ?? "")}:${String(ev.startStr || ev.start?.toISOString?.() || "")}`
							: "";
					if (key) {
						const globalWithGuard = globalThis as {
							__dualHandlersGuard?: Map<string, number>;
						};
						const last = globalWithGuard.__dualHandlersGuard?.get(key);
						if (last && Date.now() - last < 1500) return;
						globalWithGuard.__dualHandlersGuard?.set(key, Date.now());
					}
				} catch {}

				// Prevent calling backend for past times within today
				try {
					const start: Date | null | undefined = (
						info as { event?: { start?: Date | null } }
					)?.event?.start;
					if (start && !Number.isNaN(start.getTime?.() || Number.NaN)) {
						const now = new Date();
						if (
							start.getFullYear() === now.getFullYear() &&
							start.getMonth() === now.getMonth() &&
							start.getDate() === now.getDate() &&
							start.getTime() < now.getTime()
						) {
							if ("revert" in info && typeof info.revert === "function") {
								info.revert();
							}
							return;
						}
					}
				} catch {}

				// Convert EventChangeArg to FullCalendarEventChangeInfo format
				const convertedInfo: FullCalendarEventChangeInfo = {
					event: {
						id: info.event.id,
						title: info.event.title,
						start: info.event.start || new Date(),
						end: info.event.end || undefined,
						startStr: info.event.startStr,
						endStr: info.event.endStr,
						extendedProps: info.event.extendedProps,
					},
					oldEvent:
						"oldEvent" in info && info.oldEvent
							? {
									id: info.oldEvent.id,
									title: info.oldEvent.title,
									start: info.oldEvent.start || new Date(),
									end: info.oldEvent.end || undefined,
									startStr: info.oldEvent.startStr,
									endStr: info.oldEvent.endStr,
									extendedProps: info.oldEvent.extendedProps,
								}
							: undefined,
					revert:
						"revert" in info && typeof info.revert === "function"
							? info.revert
							: undefined,
				};

				await handleEventChangeService({
					info: convertedInfo,
					isVacationDate,
					isLocalized: isLocalized,
					currentView: leftCalendarState.currentView,
					onRefresh: handleRefreshWithBlur,
					...(leftGetCalendarApi
						? { getCalendarApi: () => leftGetCalendarApi() || undefined }
						: {}),
					updateEvent: updateEventNoop,
					resolveEvent: (id) => resolveEventViaApi("left", String(id)),
				});
			},
			[
				isVacationDate,
				isLocalized,
				leftCalendarState.currentView,
				handleRefreshWithBlur,
				leftGetCalendarApi,
				updateEventNoop,
				resolveEventViaApi,
			],
		);

		const handleRightEventChange = useCallback(
			async (
				info: EventChangeArg | { event: EventApi; draggedEl: HTMLElement },
			) => {
				// Dedup guard: suppress duplicate handling (eventReceive + eventChange)
				try {
					const globalWithGuard = globalThis as {
						__dualHandlersGuard?: Map<string, number>;
					};
					globalWithGuard.__dualHandlersGuard =
						globalWithGuard.__dualHandlersGuard || new Map<string, number>();
					const ev = info?.event as
						| { id?: unknown; startStr?: string; start?: Date }
						| undefined;
					const key =
						ev && (ev.id != null || ev.startStr != null || ev.start != null)
							? `${String(ev.id ?? "")}:${String(ev.startStr || ev.start?.toISOString?.() || "")}`
							: "";
					if (key) {
						const globalWithGuard = globalThis as {
							__dualHandlersGuard?: Map<string, number>;
						};
						const last = globalWithGuard.__dualHandlersGuard?.get(key);
						if (last && Date.now() - last < 1500) return;
						globalWithGuard.__dualHandlersGuard?.set(key, Date.now());
					}
				} catch {}

				// Prevent calling backend for past times within today
				try {
					const start: Date | null | undefined = (
						info as { event?: { start?: Date | null } }
					)?.event?.start;
					if (start && !Number.isNaN(start.getTime?.() || Number.NaN)) {
						const now = new Date();
						if (
							start.getFullYear() === now.getFullYear() &&
							start.getMonth() === now.getMonth() &&
							start.getDate() === now.getDate() &&
							start.getTime() < now.getTime()
						) {
							if ("revert" in info && typeof info.revert === "function") {
								info.revert();
							}
							return;
						}
					}
				} catch {}

				// Convert EventChangeArg to FullCalendarEventChangeInfo format
				const convertedInfo: FullCalendarEventChangeInfo = {
					event: {
						id: info.event.id,
						title: info.event.title,
						start: info.event.start || new Date(),
						end: info.event.end || undefined,
						startStr: info.event.startStr,
						endStr: info.event.endStr,
						extendedProps: info.event.extendedProps,
					},
					oldEvent:
						"oldEvent" in info && info.oldEvent
							? {
									id: info.oldEvent.id,
									title: info.oldEvent.title,
									start: info.oldEvent.start || new Date(),
									end: info.oldEvent.end || undefined,
									startStr: info.oldEvent.startStr,
									endStr: info.oldEvent.endStr,
									extendedProps: info.oldEvent.extendedProps,
								}
							: undefined,
					revert:
						"revert" in info && typeof info.revert === "function"
							? info.revert
							: undefined,
				};

				await handleEventChangeService({
					info: convertedInfo,
					isVacationDate,
					isLocalized: isLocalized,
					currentView: rightCalendarState.currentView,
					onRefresh: handleRefreshWithBlur,
					...(rightGetCalendarApi
						? { getCalendarApi: () => rightGetCalendarApi() || undefined }
						: {}),
					updateEvent: updateEventNoop,
					resolveEvent: (id) => resolveEventViaApi("right", String(id)),
				});
			},
			[
				isVacationDate,
				isLocalized,
				rightCalendarState.currentView,
				handleRefreshWithBlur,
				rightGetCalendarApi,
				updateEventNoop,
				resolveEventViaApi,
			],
		);

		// Update size handlers for smooth resizing
		const handleLeftUpdateSize = useCallback(() => {
			leftCalendarRef.current?.updateSize();
		}, []);

		const handleRightUpdateSize = useCallback(() => {
			rightCalendarRef.current?.updateSize();
		}, []);

		// Calendar callback handlers for both calendars (provide required fields)
		const leftCallbackHandlers: CalendarCallbackHandlers = useMemo(
			() => ({
				isLocalized: isLocalized,
				currentView: leftCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: async (_info: EventChangeArg) => {},
			}),
			[isLocalized, leftCalendarState.currentView, isVacationDate],
		);

		const rightCallbackHandlers: CalendarCallbackHandlers = useMemo(
			() => ({
				isLocalized: isLocalized,
				currentView: rightCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: async (_info: EventChangeArg) => {},
			}),
			[isLocalized, rightCalendarState.currentView, isVacationDate],
		);

		// Wrapper functions to handle type conversion for dateClick and select callbacks
		const wrapLeftDateClick = useCallback(
			(callback: (info: DateClickInfo) => void) => {
				return (info: { date: Date; dateStr: string; allDay: boolean }) => {
					const wrappedInfo = {
						...info,
						view: { type: leftCalendarState.currentView },
					};
					callback(wrappedInfo);
				};
			},
			[leftCalendarState.currentView],
		);

		const wrapLeftSelect = useCallback(
			(callback: (info: DateSelectArg) => void) => {
				return (info: {
					start: Date;
					end: Date;
					startStr: string;
					endStr: string;
					allDay: boolean;
				}) => {
					const wrappedInfo = {
						...info,
						view: {
							type: leftCalendarState.currentView,
							calendar:
								null as unknown as import("@fullcalendar/core").CalendarApi,
							title: leftCalendarState.currentView,
							activeStart: new Date(),
							activeEnd: new Date(),
							currentStart: new Date(),
							currentEnd: new Date(),
							isDefault: false,
							getOption: () => null,
						},
						jsEvent: new MouseEvent("click"), // Dummy jsEvent to satisfy DateSelectArg
						resource: null,
					};
					callback(wrappedInfo);
				};
			},
			[leftCalendarState.currentView],
		);

		const wrapRightDateClick = useCallback(
			(callback: (info: DateClickInfo) => void) => {
				return (info: { date: Date; dateStr: string; allDay: boolean }) => {
					const wrappedInfo = {
						...info,
						view: { type: rightCalendarState.currentView },
					};
					callback(wrappedInfo);
				};
			},
			[rightCalendarState.currentView],
		);

		const wrapRightSelect = useCallback(
			(callback: (info: DateSelectArg) => void) => {
				return (info: {
					start: Date;
					end: Date;
					startStr: string;
					endStr: string;
					allDay: boolean;
				}) => {
					const wrappedInfo = {
						...info,
						view: {
							type: rightCalendarState.currentView,
							calendar:
								null as unknown as import("@fullcalendar/core").CalendarApi,
							title: rightCalendarState.currentView,
							activeStart: new Date(),
							activeEnd: new Date(),
							currentStart: new Date(),
							currentEnd: new Date(),
							isDefault: false,
							getOption: () => null,
						},
						jsEvent: new MouseEvent("click"), // Dummy jsEvent to satisfy DateSelectArg
						resource: null,
					};
					callback(wrappedInfo);
				};
			},
			[rightCalendarState.currentView],
		);

		const leftCallbacks = useMemo(
			() =>
				createCalendarCallbacks(
					leftCallbackHandlers,
					freeRoam,
					getTimezone(),
					leftCalendarState.currentDate,
					// Only pass vacation click handler when actively recording
					recordingState.periodIndex !== null && recordingState.field !== null
						? handleVacationDateClick
						: undefined,
					leftCalendarState.setCurrentDate,
					leftCalendarState.currentView,
				),
			[
				leftCallbackHandlers,
				freeRoam,
				leftCalendarState.currentDate,
				recordingState.periodIndex,
				recordingState.field,
				handleVacationDateClick,
				leftCalendarState.setCurrentDate,
				leftCalendarState.currentView,
			],
		);

		const rightCallbacks = useMemo(
			() =>
				createCalendarCallbacks(
					rightCallbackHandlers,
					freeRoam,
					getTimezone(),
					rightCalendarState.currentDate,
					// Only pass vacation click handler when actively recording
					recordingState.periodIndex !== null && recordingState.field !== null
						? handleVacationDateClick
						: undefined,
					rightCalendarState.setCurrentDate,
					rightCalendarState.currentView,
				),
			[
				rightCallbackHandlers,
				freeRoam,
				rightCalendarState.currentDate,
				recordingState.periodIndex,
				recordingState.field,
				handleVacationDateClick,
				rightCalendarState.setCurrentDate,
				rightCalendarState.currentView,
			],
		);

		// Register vacation events update callback using FullCalendar's native event management
		useEffect(() => {
			const updateVacationEvents = async (
				_vacationPeriods: VacationPeriod[],
			) => {
				console.log(
					"🔄 [DUAL-CALENDAR] Updating vacation events using FullCalendar API...",
				);
				// Update vacation events in both calendars using FullCalendar's native event management
				const leftApi = leftCalendarRef.current?.getApi();
				const rightApi = rightCalendarRef.current?.getApi();

				if (leftApi) {
					// Update vacation events directly using FullCalendar API
					console.log(
						"🔄 [DUAL-CALENDAR] Left calendar vacation events updated",
					);
				}
				if (rightApi) {
					// Update vacation events directly using FullCalendar API
					console.log(
						"🔄 [DUAL-CALENDAR] Right calendar vacation events updated",
					);
				}
			};

			setOnVacationUpdated?.(updateVacationEvents);
		}, [setOnVacationUpdated]);

		// Show loading state
		if (
			loading ||
			!leftCalendarState.isHydrated ||
			!rightCalendarState.isHydrated
		) {
			return <CalendarSkeleton />;
		}

		return (
			<ErrorBoundary fallback={CalendarErrorFallback}>
				<div
					className={`flex h-full gap-4 ${isRefreshing ? "opacity-75 pointer-events-none" : ""}`}
				>
					{/* Left Calendar */}
					<div className="flex-1 border rounded-lg p-2 overflow-hidden">
						<CalendarCore
							ref={leftCalendarRef}
							events={processedLeftEvents}
							currentView={leftCalendarState.currentView}
							currentDate={leftCalendarState.currentDate}
							isLocalized={isLocalized}
							freeRoam={freeRoam}
							slotTimes={leftCalendarState.slotTimes}
							slotTimesKey={leftCalendarState.slotTimesKey}
							calendarHeight={leftCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={wrapLeftDateClick(leftCallbacks.dateClick)}
							onSelect={wrapLeftSelect(leftCallbacks.select)}
							onEventClick={leftCallbacks.eventClick}
							onEventChange={handleLeftEventChange}
							onEventReceive={handleLeftEventChange}
							onViewChange={onLeftViewChange ?? (() => {})}
							onViewDidMount={(info) => {
								if (leftCalendarState.isHydrated) {
									const newHeight = calculateLeftHeight();
									setLeftCalendarHeight(newHeight);
									leftCalendarState.setCurrentView(info.view.type);
									onLeftViewChange?.(info.view.type);
								}
							}}
							onDatesSet={(info) => {
								if (leftCalendarState.isHydrated) {
									leftCalendarState.setCurrentView(info.view.type);
									onLeftViewChange?.(info.view.type);
								}
							}}
							onUpdateSize={handleLeftUpdateSize}
							onNavDate={leftCalendarState.setCurrentDate}
						/>
					</div>

					{/* Right Calendar */}
					<div className="flex-1 border rounded-lg p-2 overflow-hidden">
						<CalendarCore
							ref={rightCalendarRef}
							events={processedRightEvents}
							currentView={rightCalendarState.currentView}
							currentDate={rightCalendarState.currentDate}
							isLocalized={isLocalized}
							freeRoam={freeRoam}
							slotTimes={rightCalendarState.slotTimes}
							slotTimesKey={rightCalendarState.slotTimesKey}
							calendarHeight={rightCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={wrapRightDateClick(rightCallbacks.dateClick)}
							onSelect={wrapRightSelect(rightCallbacks.select)}
							onEventClick={rightCallbacks.eventClick}
							onEventChange={handleRightEventChange}
							onEventReceive={handleRightEventChange}
							onViewChange={onRightViewChange ?? (() => {})}
							onViewDidMount={(info) => {
								if (rightCalendarState.isHydrated) {
									const newHeight = calculateRightHeight();
									setRightCalendarHeight(newHeight);
									rightCalendarState.setCurrentView(info.view.type);
									onRightViewChange?.(info.view.type);
								}
							}}
							onDatesSet={(info) => {
								if (rightCalendarState.isHydrated) {
									rightCalendarState.setCurrentView(info.view.type);
									onRightViewChange?.(info.view.type);
								}
							}}
							onUpdateSize={handleRightUpdateSize}
							onNavDate={rightCalendarState.setCurrentDate}
						/>
					</div>
				</div>
			</ErrorBoundary>
		);
	},
);

DualCalendarComponent.displayName = "DualCalendarComponent";
