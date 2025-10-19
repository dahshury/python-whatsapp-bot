"use client";

// Interface for websocket message objects
type WebSocketMessage = {
	ts?: string;
	role?: string;
	text?: string;
	message?: string;
	// Optionally present when reducer already normalized messages
	date?: string;
	time?: string;
};

// Interface for websocket reservation objects
type WebSocketReservation = {
	start?: string;
	date?: string;
	time_slot?: string;
	time?: string;
	wa_id?: string;
	id?: string | number;
	customer_name?: string;
	title?: string;
	type?: number;
	cancelled?: boolean;
};

// Constants for ISO timestamp slicing
const ISO_TIME_START = 11;
const ISO_TIME_END = 19;
const ISO_DATE_START = 0;
const ISO_DATE_END = 10;
const ISO_TIME_SLOT_END = 16;
const TIME_FORMAT_LENGTH = 5;

// UI layout constants
const REFRESH_DELAY_MS = 300;
const HEADER_HEIGHT = 64;
const CONTAINER_PADDING = 16;
const MIN_CALENDAR_HEIGHT = 600;

// Helper to normalize a single WebSocket message
function normalizeMessage(
	m: WebSocketMessage
): import("@/entities/conversation").ConversationMessage {
	const ts = m?.ts ? new Date(m.ts) : null;
	const iso = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : undefined;
	const fallbackDate = typeof m?.date === "string" ? m.date : "";
	const rawTime = typeof m?.time === "string" ? m.time : "";
	const fallbackTime =
		rawTime && rawTime.length === TIME_FORMAT_LENGTH
			? `${rawTime}:00`
			: rawTime;
	return {
		role: m?.role || "user",
		message: String(m?.text || m?.message || ""),
		time: iso ? iso.slice(ISO_TIME_START, ISO_TIME_END) : fallbackTime || "",
		date: iso ? iso.slice(ISO_DATE_START, ISO_DATE_END) : fallbackDate || "",
	};
}

// Helper to parse reservation ID from various formats
function parseReservationId(r: WebSocketReservation): number | undefined {
	if (typeof (r as { id?: unknown }).id === "number") {
		return (r as { id?: number }).id as number;
	}
	const n = Number((r as { id?: unknown }).id);
	return Number.isFinite(n) ? (n as number) : undefined;
}

// Helper to parse and normalize reservation date and time slot
function parseReservationDateTime(r: WebSocketReservation): {
	date: string;
	timeSlot: string;
} {
	let date = String((r as { date?: string }).date || "");
	let timeSlot = String(
		(r as { time_slot?: string }).time_slot ||
			(r as { time?: string }).time ||
			""
	);

	// If missing, attempt to derive from ISO start timestamp
	if (!(date && timeSlot) && r?.start) {
		const d = new Date(String(r.start));
		if (!Number.isNaN(d.getTime())) {
			if (!date) {
				date = d.toISOString().slice(0, 10);
			}
			if (!timeSlot) {
				timeSlot = d.toISOString().slice(ISO_TIME_START, ISO_TIME_SLOT_END);
			}
		}
	}

	return { date, timeSlot };
}

// Helper to normalize a single WebSocket reservation
function normalizeReservation(
	r: WebSocketReservation,
	waId: string
): import("@/entities/event").Reservation | null {
	const { date, timeSlot } = parseReservationDateTime(r);
	const computedId = parseReservationId(r);

	const result = {
		customer_id: waId,
		date,
		time_slot: timeSlot,
		customer_name: String(r?.customer_name || r?.title || waId),
		type: typeof r?.type === "number" ? (r.type as number) : 0,
		...(computedId !== undefined ? { id: computedId } : {}),
		...(r?.cancelled === true ? { cancelled: true } : {}),
	} as import("@/entities/event").Reservation;

	// Filter out entries that still lack a date to avoid misleading defaults
	return result.date ? result : null;
}

import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { SLOT_DURATION_HOURS } from "@shared/libs/calendar/calendar-config";
import {
	useConversationsData,
	useReservationsData,
} from "@shared/libs/data/websocket-data-provider";
import { mark } from "@shared/libs/dev-profiler";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { useCalendarDataTableEditor } from "@widgets/data-table-editor/hooks/use-calendar-data-table-editor";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React from "react";
import { filterEventsForCalendar } from "@/processes/calendar/calendar-events.process";
import {
	CalendarErrorFallback,
	ErrorBoundaryWrapper,
} from "@/shared/ui/error-components";
import { SidebarInset } from "@/shared/ui/sidebar";
import { CalendarContainer } from "@/widgets/calendar/calendar-container";
import { CalendarSkeleton } from "@/widgets/calendar/calendar-skeleton";
import { useCalendarContextMenu } from "@/widgets/calendar/hooks/use-calendar-context-menu";
import { useCalendarDragHandlers } from "@/widgets/calendar/hooks/use-calendar-drag-handlers";
import { useCalendarEventHandlers } from "@/widgets/calendar/hooks/use-calendar-event-handlers";
import { useCalendarEvents } from "@/widgets/calendar/hooks/use-calendar-events";
import { useCalendarHoverCard } from "@/widgets/calendar/hooks/use-calendar-hover-card";
import { useCalendarState } from "@/widgets/calendar/hooks/use-calendar-state";
import { useVacationDateChecker } from "@/widgets/calendar/hooks/use-vacation-date-checker";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

// FullCalendar component is loaded dynamically in DualCalendarComponent when needed

const DualCalendarComponent = dynamic(
	() =>
		import("@/widgets/calendar/dual-calendar").then((mod) => ({
			default: mod.DualCalendarComponent,
		})),
	{
		loading: () => <CalendarSkeleton />,
		ssr: false,
	}
);

const CalendarMainContent = dynamic(
	() =>
		import("@/widgets/calendar/calendar-main-content").then(
			(m) => m.CalendarMainContent
		),
	{ ssr: false, loading: () => <CalendarSkeleton /> }
);
const CalendarDataTableEditorWrapper = dynamic(
	() =>
		import(
			"@widgets/data-table-editor/calendar-data-table-editor-wrapper"
		).then((m) => m.CalendarDataTableEditorWrapper),
	{ ssr: false }
);

export default function HomePage() {
	const { freeRoam, showDualCalendar } = useSettings();
	const {
		vacationPeriods,
		handleDateClick: handleVacationDateClick,
		recordingState,
	} = useVacation();
	const isVacationDate = useVacationDateChecker(vacationPeriods);

	// Persist settings popover state across mode switches (used in local header variant)
	// const [settingsOpen, setSettingsOpen] = React.useState(false);

	// Avoid hydration mismatch: compute dynamic layout only after mount
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
		mark("HomePage:mounted");
	}, []);

	React.useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const updateCalendarDvh = () => {
			try {
				const vh = Math.max(
					0,
					Math.floor(window.visualViewport?.height || window.innerHeight || 0)
				);
				document.documentElement.style.setProperty("--calendar-dvh", `${vh}px`);
			} catch {
				// visualViewport may not be available in all environments
			}
		};
		updateCalendarDvh();
		window.addEventListener("resize", updateCalendarDvh);
		try {
			window.visualViewport?.addEventListener?.("resize", updateCalendarDvh);
		} catch {
			// visualViewport may not be available in all environments
		}
		return () => {
			window.removeEventListener("resize", updateCalendarDvh);
			try {
				window.visualViewport?.removeEventListener?.(
					"resize",
					updateCalendarDvh
				);
			} catch {
				// visualViewport may not be available in all environments
			}
		};
	}, []);

	// Use refs to capture calendar instances for integration with other components
	const calendarRef = React.useRef<CalendarCoreRef | null>(null);

	// CalendarCore will populate calendarRef directly through forwardRef
	const { isLocalized } = useLanguage();
	// Pull live conversations/reservations so hover card has real data
	const { conversations } = useConversationsData();
	const { reservations } = useReservationsData();

	// Map websocket shapes to strict calendar types
	const mappedConversations = React.useMemo(() => {
		const out: Record<
			string,
			import("@/entities/conversation").ConversationMessage[]
		> = {};
		for (const [waId, msgs] of Object.entries(conversations || {})) {
			out[waId] = (Array.isArray(msgs) ? msgs : []).map((m: WebSocketMessage) =>
				normalizeMessage(m)
			);
		}
		return out;
	}, [conversations]);

	const mappedReservations = React.useMemo(() => {
		const out: Record<string, import("@/entities/event").Reservation[]> = {};
		for (const [waId, items] of Object.entries(reservations || {})) {
			const mapped = (Array.isArray(items) ? items : [])
				.map((r: WebSocketReservation) => normalizeReservation(r, waId))
				.filter((r) => r !== null);
			out[waId] = mapped as import("@/entities/event").Reservation[];
		}
		return out;
	}, [reservations]);

	// Stage C: Load events via existing hook, passing resolved ages for first-paint accuracy
	const eventsState = useCalendarEvents({
		freeRoam,
		isLocalized,
		...(freeRoam ? {} : { excludeConversations: true }),
	});

	// Get vacation events from context
	const { vacationEvents } = useVacation();

	// Memoize filtered events to avoid triggering FullCalendar eventsSet on every render
	const filteredEvents = React.useMemo(
		() => filterEventsForCalendar(eventsState.events, freeRoam),
		[eventsState.events, freeRoam]
	);

	// Merge vacation events with main events
	const allEvents = React.useMemo(() => {
		// When leaving freeRoam, conversations should not be present; filteredEvents already excludes them
		const merged = [...filteredEvents, ...vacationEvents];
		return merged;
	}, [filteredEvents, vacationEvents]);

	// Force a range refresh when freeRoam changes or view changes
	React.useEffect(() => {
		try {
			const api = calendarRef.current?.getApi?.();
			if (!api) {
				return;
			}
			const current = api.getDate() as unknown as Date;
			// Nudge the calendar to re-run onDatesSet without changing date
			api.gotoDate(current);
		} catch {
			// ignore
		}
		// Only on freeRoam toggle to avoid redundant work on every minor change
	}, []);

	// Stage G: Add simple height management and updateSize wiring
	const [calendarHeight, setCalendarHeight] = React.useState<number | "auto">(
		"auto"
	);
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const handleRefreshWithBlur = React.useCallback(async () => {
		setIsRefreshing(true);
		try {
			await eventsState.refreshData();
		} finally {
			setTimeout(() => setIsRefreshing(false), REFRESH_DELAY_MS);
		}
	}, [eventsState]);
	React.useEffect(() => {
		const calc = () => {
			const viewportHeight = window.innerHeight;
			const h = Math.max(
				MIN_CALENDAR_HEIGHT,
				viewportHeight - HEADER_HEIGHT - CONTAINER_PADDING
			);
			setCalendarHeight(h);
		};
		calc();
		const onResize = () => calc();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	// Stable updateSize handler to avoid re-creating ResizeObservers downstream
	const handleCalendarUpdateSize = React.useCallback(() => {
		try {
			const api = calendarRef.current?.getApi?.();
			if (api && (api as { view?: unknown }).view) {
				calendarRef.current?.updateSize?.();
			}
		} catch {
			// visualViewport may not be available in all environments
		}
	}, []);

	// Stage J: Enable real hover card + drag handlers (others stay inert)
	const closeHoverCardRef = React.useRef<(() => void) | null>(null);
	const dragHandlers = useCalendarDragHandlers({
		closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
	});
	const hoverCard = useCalendarHoverCard({
		isDragging: dragHandlers.isDragging,
	});
	closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;

	// Stage K: Enable real context menu manager
	const contextMenu = useCalendarContextMenu();

	// No need for complex callback ref - CalendarCore will populate calendarRef directly

	// Dual calendar refs and view states (ref is managed by callback ref below)
	// Stage I: adopt useCalendarState for robust view/date/slotTimes
	const calendarState = useCalendarState({
		freeRoam,
		initialView: "timeGridWeek",
		storageKeyPrefix: "calendar:page",
	});

	// Stage M: Enable real data-table editor state
	const dataTableEditor = useCalendarDataTableEditor();

	// Initialize event handlers now that calendarState exists
	const { openConversation: openConversationFromStore } = useSidebarChatStore();
	const router = useRouter();

	const handleOpenDocument = React.useCallback(
		(waId: string) => {
			// Navigate to documents page with waId as query parameter
			router.push(`/documents?waId=${encodeURIComponent(waId)}`);
		},
		[router]
	);

	const eventHandlers = useCalendarEventHandlers({
		events: allEvents,
		conversations: {},
		isLocalized,
		currentView: calendarState.currentView,
		isVacationDate,
		// handleRefreshWithBlur is optional in hook props
		openConversation: openConversationFromStore,
		addEvent: eventsState.addEvent,
		updateEvent: eventsState.updateEvent,
		removeEvent: eventsState.removeEvent,
		dataTableEditor: {
			handleEditReservation: () => {
				// Handler provided by parent component
			},
		},
		calendarRef,
	});

	// Build calendar callbacks (dateClick/select/eventClick) using the event handlers
	const callbacks = React.useMemo(() => {
		const shouldIncludeVacationHandler =
			recordingState.periodIndex !== null &&
			recordingState.field !== null &&
			typeof handleVacationDateClick === "function";

		const baseOpts = {
			handlers: {
				isLocalized,
				currentView: calendarState.currentView,
				isVacationDate,
				openEditor: (opts: { start: string; end?: string }) => {
					const startStr = String(opts.start);
					const endStr = typeof opts.end === "string" ? opts.end : startStr;
					dataTableEditor.openEditor({ start: startStr, end: endStr });
				},
				handleOpenConversation: eventHandlers.handleOpenConversation,
				handleEventChange: eventHandlers.handleEventChange,
			},
			freeRoam,
			currentDate: calendarState.currentDate,
			setCurrentDate: calendarState.setCurrentDate,
			currentView: calendarState.currentView,
			...(shouldIncludeVacationHandler && { handleVacationDateClick }),
		};

		return createCalendarCallbacks(baseOpts);
	}, [
		isLocalized,
		calendarState.currentView,
		isVacationDate,
		dataTableEditor.openEditor,
		eventHandlers.handleOpenConversation,
		eventHandlers.handleEventChange,
		freeRoam,
		calendarState.currentDate,
		recordingState.periodIndex,
		recordingState.field,
		handleVacationDateClick,
		calendarState.setCurrentDate,
		dataTableEditor,
	]);

	// Vacation events are now automatically included in allEvents array - no manual insertion needed

	const [rightCalendarView, setRightCalendarView] = React.useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("dual-right-calendar-view") || "timeGridWeek";
		}
		return "timeGridWeek";
	});

	// Save to localStorage when views change
	// Persist current view (optional)
	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"dual-left-calendar-view",
				calendarState.currentView
			);
		}
	}, [calendarState.currentView]);

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("dual-right-calendar-view", rightCalendarView);
		}
	}, [rightCalendarView]);

	// Track dual calendar refs directly with guard to avoid re-render loops
	const [leftCalendarRef, setLeftCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef | null> | null>(null);
	const [rightCalendarRef, setRightCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef | null> | null>(null);

	// Callback ref to capture the dual calendar refs when they become available
	const dualCalendarRefInstance = React.useRef<{
		leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
		rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
		leftView: string;
		rightView: string;
	} | null>(null);

	const handleDualCalendarRef = React.useCallback(
		(
			dualCalendarInstance: {
				leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
				rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
				leftView: string;
				rightView: string;
			} | null
		) => {
			mark("HomePage:dualCalendarCallbackRef");
			dualCalendarRefInstance.current = dualCalendarInstance;
			if (dualCalendarInstance) {
				setLeftCalendarRef((prev) =>
					prev !== dualCalendarInstance.leftCalendarRef
						? dualCalendarInstance.leftCalendarRef
						: prev
				);
				setRightCalendarRef((prev) =>
					prev !== dualCalendarInstance.rightCalendarRef
						? dualCalendarInstance.rightCalendarRef
						: prev
				);
			}
		},
		[]
	);

	// Bridge calendar control into the persistent dock header
	const { setState: setDockBridgeState } = useDockBridge();
	React.useEffect(() => {
		setDockBridgeState({
			calendarRef: (showDualCalendar
				? leftCalendarRef || null
				: calendarRef) as React.RefObject<CalendarCoreRef | null>,
			currentCalendarView: calendarState.currentView,
			onCalendarViewChange: calendarState.setCurrentView,
			// Dual: provide right-side bridge values as well
			...(showDualCalendar
				? {
						rightCalendarRef: rightCalendarRef || null,
						rightCalendarView,
						onRightCalendarViewChange: setRightCalendarView,
					}
				: {}),
		});
	}, [
		showDualCalendar,
		leftCalendarRef,
		rightCalendarRef,
		rightCalendarView,
		calendarState.currentView,
		calendarState.setCurrentView,
		setDockBridgeState,
	]);

	return (
		<SidebarInset style={{ minHeight: "var(--calendar-dvh, 100vh)" }}>
			{/* Removed duplicate fixed trigger to avoid two sidebar buttons; header SidebarTrigger remains */}
			<ErrorBoundaryWrapper
				component="HomePage"
				fallback={CalendarErrorFallback}
				feature="calendar"
			>
				{(() => {
					// Calculate wrapper height class based on calendar state
					const getWrapperHeightClass = (): string => {
						if (!mounted) {
							return "h-[calc(100vh-4rem)]";
						}

						const isSingleExpanding =
							calendarState.currentView === "multiMonthYear" ||
							calendarState.currentView === "listMonth";
						const isDualExpanding = isSingleExpanding;

						if (showDualCalendar) {
							return isDualExpanding ? "" : "h-[calc(100vh-4rem)]";
						}
						return isSingleExpanding ? "" : "h-[calc(100vh-4rem)]";
					};

					const wrapperHeightClass = getWrapperHeightClass();

					// Avoid hydration mismatch: don't render the calendar until mounted on client
					if (!mounted) {
						return (
							<div
								className={
									"flex h-[calc(100vh-4rem)] flex-1 flex-col gap-3 px-4 pt-1 pb-4"
								}
							>
								<CalendarContainer
									isHydrated={false}
									isRefreshing={false}
									loading={true}
								>
									<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
										<CalendarSkeleton />
									</div>
								</CalendarContainer>
							</div>
						);
					}

					return (
						<div
							className={`flex flex-1 flex-col gap-3 px-4 pt-1 pb-0 ${wrapperHeightClass}`}
						>
							<CalendarContainer
								isHydrated={true}
								isRefreshing={isRefreshing}
								loading={false}
							>
								<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
									{showDualCalendar ? (
										<DualCalendarComponent
											events={allEvents}
											freeRoam={freeRoam}
											initialLeftView={calendarState.currentView}
											initialRightView={rightCalendarView}
											loading={eventsState.loading}
											onLeftViewChange={calendarState.setCurrentView}
											onRefreshData={handleRefreshWithBlur}
											onRightViewChange={setRightCalendarView}
											ref={handleDualCalendarRef}
										/>
									) : (
										<CalendarMainContent
											calendarHeight={calendarHeight}
											calendarRef={calendarRef}
											callbacks={callbacks}
											contextMenu={contextMenu}
											conversations={mappedConversations}
											currentDate={calendarState.currentDate}
											currentView={calendarState.currentView}
											dataTableEditor={{
												handleEditReservation: () => {
													// Handler provided by context
												},
											}}
											dragHandlers={dragHandlers}
											events={filteredEvents}
											freeRoam={freeRoam}
											handleCancelReservation={
												eventHandlers.handleCancelReservation
											}
											handleEventChange={eventHandlers.handleEventChange}
											handleOpenConversation={(id: string) =>
												openConversationFromStore(id)
											}
											handleOpenDocument={handleOpenDocument}
											handleUpdateSize={handleCalendarUpdateSize}
											handleViewDetails={() => {
												// View details handler not implemented yet
											}}
											hoverCard={hoverCard}
											isHydrated={true}
											isLocalized={isLocalized}
											isVacationDate={isVacationDate}
											onViewChange={calendarState.setCurrentView}
											processedEvents={allEvents}
											reservations={mappedReservations}
											setCalendarHeight={setCalendarHeight}
											setCurrentDate={calendarState.setCurrentDate}
											setCurrentView={calendarState.setCurrentView}
											slotTimes={calendarState.slotTimes}
											slotTimesKey={calendarState.slotTimesKey}
										/>
									)}

									{/* Stage M: enable DataTable editor with real state */}
									<CalendarDataTableEditorWrapper
										calendarRef={calendarRef}
										closeEditor={dataTableEditor.closeEditor}
										editorOpen={dataTableEditor.editorOpen}
										events={allEvents}
										freeRoam={freeRoam}
										isLocalized={isLocalized}
										onEventAdded={
											eventHandlers.handleEventAdded ??
											(() => {
												// No-op fallback
											})
										}
										onEventCancelled={
											eventHandlers.handleEventCancelled ??
											(() => {
												// No-op fallback
											})
										}
										onEventModified={
											eventHandlers.handleEventModified ??
											(() => {
												// No-op fallback
											})
										}
										onOpenChange={dataTableEditor.setEditorOpen}
										onSave={handleRefreshWithBlur}
										selectedDateRange={dataTableEditor.selectedDateRange}
										setShouldLoadEditor={dataTableEditor.setShouldLoadEditor}
										shouldLoadEditor={dataTableEditor.shouldLoadEditor}
										slotDurationHours={SLOT_DURATION_HOURS}
									/>
								</div>
							</CalendarContainer>
						</div>
					);
				})()}
			</ErrorBoundaryWrapper>
			{/** Toaster is provided globally via ToastRouter in `app/layout.tsx` */}
		</SidebarInset>
	);
}
