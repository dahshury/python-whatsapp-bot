/**
 * Dual Calendar Component
 *
 * Renders two calendars side by side with drag and drop functionality between them.
 * Both calendars show all events and allow moving them between calendars with proper
 * date/time changes while preserving event types.
 */

"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
import { VacationEventsService } from "@/lib/vacation-events-service";
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
		leftCalendarRef: React.RefObject<CalendarCoreRef>;
		rightCalendarRef: React.RefObject<CalendarCoreRef>;
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
		const { isRTL } = useLanguage();
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
		const leftCalendarState = useCalendarState({
			freeRoam,
			initialView: initialLeftView || "multiMonthYear",
			initialDate,
		});

		const rightCalendarState = useCalendarState({
			freeRoam,
			initialView: initialRightView || "multiMonthYear",
			initialDate,
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
			isRTL,
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
		const _error = effectiveEventsState.error;
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
			() => leftCalendarRef.current?.getApi?.(),
			[],
		);

		const rightGetCalendarApi = useCallback(
			() => rightCalendarRef.current?.getApi?.(),
			[],
		);

		// No-op updater to avoid re-triggering FullCalendar eventChange loop
		const updateEventNoop = useCallback(
			(_id: string, _updated: Record<string, unknown>) => {},
			[],
		);

		const resolveEventViaApi = useCallback(
			(which: "left" | "right", id: string) => {
				try {
					const api =
						which === "left" ? leftGetCalendarApi() : rightGetCalendarApi();
					const ev = api?.getEventById(String(id));
					return ev ? { extendedProps: ev.extendedProps || {} } : undefined;
				} catch {
					return undefined;
				}
			},
			[leftGetCalendarApi, rightGetCalendarApi],
		);

		const handleLeftEventChange = useCallback(
			async (info: { event?: unknown; revert?: () => void }) => {
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
					const start: Date | undefined = (info as { event?: { start?: Date } })
						?.event?.start;
					if (start && !Number.isNaN(start.getTime?.() || NaN)) {
						const now = new Date();
						if (
							start.getFullYear() === now.getFullYear() &&
							start.getMonth() === now.getMonth() &&
							start.getDate() === now.getDate() &&
							start.getTime() < now.getTime()
						) {
							info?.revert?.();
							return;
						}
					}
				} catch {}

				await handleEventChangeService({
					info,
					isVacationDate,
					isRTL,
					currentView: leftCalendarState.currentView,
					onRefresh: handleRefreshWithBlur,
					getCalendarApi: leftGetCalendarApi,
					updateEvent: updateEventNoop,
					resolveEvent: (id) => resolveEventViaApi("left", String(id)),
				});
			},
			[
				isVacationDate,
				isRTL,
				leftCalendarState.currentView,
				handleRefreshWithBlur,
				leftGetCalendarApi,
				updateEventNoop,
				resolveEventViaApi,
			],
		);

		const handleRightEventChange = useCallback(
			async (info: { event?: unknown; revert?: () => void }) => {
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
					const start: Date | undefined = (info as { event?: { start?: Date } })
						?.event?.start;
					if (start && !Number.isNaN(start.getTime?.() || NaN)) {
						const now = new Date();
						if (
							start.getFullYear() === now.getFullYear() &&
							start.getMonth() === now.getMonth() &&
							start.getDate() === now.getDate() &&
							start.getTime() < now.getTime()
						) {
							info?.revert?.();
							return;
						}
					}
				} catch {}

				await handleEventChangeService({
					info,
					isVacationDate,
					isRTL,
					currentView: rightCalendarState.currentView,
					onRefresh: handleRefreshWithBlur,
					getCalendarApi: rightGetCalendarApi,
					updateEvent: updateEventNoop,
					resolveEvent: (id) => resolveEventViaApi("right", String(id)),
				});
			},
			[
				isVacationDate,
				isRTL,
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
				isChangingHours: false,
				setIsChangingHours: () => {},
				isRTL,
				currentView: leftCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: (
					_eventId: string,
					_updates: Record<string, unknown>,
				) => {},
			}),
			[isRTL, leftCalendarState.currentView, isVacationDate],
		);

		const rightCallbackHandlers: CalendarCallbackHandlers = useMemo(
			() => ({
				isChangingHours: false,
				setIsChangingHours: () => {},
				isRTL,
				currentView: rightCalendarState.currentView,
				isVacationDate,
				openEditor: (_opts: { start: string; end?: string }) => {},
				handleOpenConversation: (_id: string) => {},
				handleEventChange: (
					_eventId: string,
					_updates: Record<string, unknown>,
				) => {},
			}),
			[isRTL, rightCalendarState.currentView, isVacationDate],
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
					leftCalendarState.updateSlotTimes,
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
				leftCalendarState.updateSlotTimes,
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
					rightCalendarState.updateSlotTimes,
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
				rightCalendarState.updateSlotTimes,
				rightCalendarState.currentView,
			],
		);

		// Register vacation events update callback using FullCalendar's native event management
		useEffect(() => {
			const updateVacationEvents = async (
				vacationPeriods: VacationPeriod[],
			) => {
				console.log(
					"🔄 [DUAL-CALENDAR] Updating vacation events using FullCalendar API...",
				);
				// Update vacation events in both calendars using FullCalendar's native event management
				const leftApi = leftCalendarRef.current?.getApi();
				const rightApi = rightCalendarRef.current?.getApi();

				if (leftApi) {
					VacationEventsService.updateVacationEvents(leftApi, vacationPeriods);
					console.log(
						"🔄 [DUAL-CALENDAR] Left calendar vacation events updated",
					);
				}
				if (rightApi) {
					VacationEventsService.updateVacationEvents(rightApi, vacationPeriods);
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
							isRTL={isRTL}
							freeRoam={freeRoam}
							slotTimes={leftCalendarState.slotTimes}
							slotTimesKey={leftCalendarState.slotTimesKey}
							calendarHeight={leftCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={leftCallbacks.dateClick}
							onSelect={leftCallbacks.select}
							onEventClick={leftCallbacks.eventClick}
							onEventChange={handleLeftEventChange}
							onEventReceive={handleLeftEventChange}
							onViewChange={onLeftViewChange}
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
							isRTL={isRTL}
							freeRoam={freeRoam}
							slotTimes={rightCalendarState.slotTimes}
							slotTimesKey={rightCalendarState.slotTimesKey}
							calendarHeight={rightCalendarHeight}
							isVacationDate={isVacationDate}
							droppable={true}
							onDateClick={rightCallbacks.dateClick}
							onSelect={rightCallbacks.select}
							onEventClick={rightCallbacks.eventClick}
							onEventChange={handleRightEventChange}
							onEventReceive={handleRightEventChange}
							onViewChange={onRightViewChange}
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
