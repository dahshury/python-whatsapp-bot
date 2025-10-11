"use client";

// Interface for websocket message objects
interface WebSocketMessage {
	ts?: string;
	role?: string;
	text?: string;
	message?: string;
	// Optionally present when reducer already normalized messages
	date?: string;
	time?: string;
}

// Interface for websocket reservation objects
interface WebSocketReservation {
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
}

import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { getTimezone, SLOT_DURATION_HOURS } from "@shared/libs/calendar/calendar-config";
import { useConversationsData, useReservationsData } from "@shared/libs/data/websocket-data-provider";
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
import { SidebarInset } from "@/shared/ui/sidebar";
import { CalendarContainer } from "@/widgets/calendar/CalendarContainer";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";
import { CalendarSkeleton } from "@/widgets/calendar/CalendarSkeleton";
import { useCalendarContextMenu } from "@/widgets/calendar/hooks/useCalendarContextMenu";
import { useCalendarDragHandlers } from "@/widgets/calendar/hooks/useCalendarDragHandlers";
import { useCalendarEventHandlers } from "@/widgets/calendar/hooks/useCalendarEventHandlers";
import { useCalendarEvents } from "@/widgets/calendar/hooks/useCalendarEvents";
import { useCalendarHoverCard } from "@/widgets/calendar/hooks/useCalendarHoverCard";
import { useCalendarState } from "@/widgets/calendar/hooks/useCalendarState";
import { useVacationDateChecker } from "@/widgets/calendar/hooks/useVacationDateChecker";

// FullCalendar component is loaded dynamically in DualCalendarComponent when needed

const DualCalendarComponent = dynamic(
	() =>
		import("@/widgets/calendar/DualCalendar").then((mod) => ({
			default: mod.DualCalendarComponent,
		})),
	{
		loading: () => <CalendarSkeleton />,
		ssr: false,
	}
);

const CalendarMainContent = dynamic(
	() => import("@/widgets/calendar/CalendarMainContent").then((m) => m.CalendarMainContent),
	{ ssr: false, loading: () => <CalendarSkeleton /> }
);
const CalendarDataTableEditorWrapper = dynamic(
	() =>
		import("@widgets/data-table-editor/calendar-data-table-editor-wrapper").then(
			(m) => m.CalendarDataTableEditorWrapper
		),
	{ ssr: false }
);

export default function HomePage() {
	const { freeRoam, showDualCalendar } = useSettings();
	const { vacationPeriods, handleDateClick: handleVacationDateClick, recordingState } = useVacation();
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
		if (typeof window === "undefined") return;
		const updateCalendarDvh = () => {
			try {
				const vh = Math.max(0, Math.floor(window.visualViewport?.height || window.innerHeight || 0));
				document.documentElement.style.setProperty("--calendar-dvh", `${vh}px`);
			} catch {}
		};
		updateCalendarDvh();
		window.addEventListener("resize", updateCalendarDvh);
		try {
			window.visualViewport?.addEventListener?.("resize", updateCalendarDvh);
		} catch {}
		return () => {
			window.removeEventListener("resize", updateCalendarDvh);
			try {
				window.visualViewport?.removeEventListener?.("resize", updateCalendarDvh);
			} catch {}
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
		const out: Record<string, import("@/entities/conversation").ConversationMessage[]> = {};
		for (const [waId, msgs] of Object.entries(conversations || {})) {
			out[waId] = (Array.isArray(msgs) ? msgs : []).map((m: WebSocketMessage) => {
				const ts = m?.ts ? new Date(m.ts) : null;
				const iso = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : undefined;
				const fallbackDate = typeof m?.date === "string" ? m.date : "";
				const rawTime = typeof m?.time === "string" ? m.time : "";
				const fallbackTime = rawTime && rawTime.length === 5 ? `${rawTime}:00` : rawTime;
				return {
					role: m?.role || "user",
					message: String(m?.text || m?.message || ""),
					time: iso ? iso.slice(11, 19) : fallbackTime || "",
					date: iso ? iso.slice(0, 10) : fallbackDate || "",
				};
			});
		}
		return out;
	}, [conversations]);

	const mappedReservations = React.useMemo(() => {
		const out: Record<string, import("@/entities/event").Reservation[]> = {};
		for (const [waId, items] of Object.entries(reservations || {})) {
			const mapped = (Array.isArray(items) ? items : [])
				.map((r: WebSocketReservation) => {
					// Prefer explicit date/time fields if provided by backend/state
					let date = String((r as { date?: string }).date || "");
					let timeSlot = String((r as { time_slot?: string }).time_slot || (r as { time?: string }).time || "");

					// If missing, attempt to derive from ISO start timestamp
					if ((!date || !timeSlot) && r?.start) {
						const d = new Date(String(r.start));
						if (!Number.isNaN(d.getTime())) {
							if (!date) date = d.toISOString().slice(0, 10);
							if (!timeSlot) timeSlot = d.toISOString().slice(11, 16);
						}
					}

					// Preserve DB reservation id for reliable drag/drop targeting and updates
					const computedId =
						typeof (r as { id?: unknown }).id === "number"
							? ((r as { id?: number }).id as number)
							: (() => {
									const n = Number((r as { id?: unknown }).id);
									return Number.isFinite(n) ? (n as number) : undefined;
								})();

					const result = {
						customer_id: waId,
						date,
						time_slot: timeSlot,
						customer_name: String(r?.customer_name || r?.title || waId),
						type: typeof r?.type === "number" ? (r.type as number) : 0,
						...(computedId !== undefined ? { id: computedId } : {}),
						...(r?.cancelled === true ? { cancelled: true } : {}),
					} as import("@/entities/event").Reservation;
					return result;
				})
				// Optional: filter out entries that still lack a date to avoid misleading defaults
				.filter((r) => Boolean(r.date));
			out[waId] = mapped as import("@/entities/event").Reservation[];
		}
		return out;
	}, [reservations]);

	// Stage C: Load events via existing hook, passing resolved ages for first-paint accuracy
	const eventsState = useCalendarEvents({
		freeRoam,
		isLocalized: isLocalized,
		autoRefresh: false,
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
		const merged = [...filteredEvents, ...vacationEvents];
		return merged;
	}, [filteredEvents, vacationEvents]);

	// Stage G: Add simple height management and updateSize wiring
	const [calendarHeight, setCalendarHeight] = React.useState<number | "auto">("auto");
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const handleRefreshWithBlur = React.useCallback(async () => {
		setIsRefreshing(true);
		try {
			await eventsState.refreshData();
		} finally {
			setTimeout(() => setIsRefreshing(false), 300);
		}
	}, [eventsState]);
	React.useEffect(() => {
		const calc = () => {
			const viewportHeight = window.innerHeight;
			const header = 64; // header height
			const padding = 16; // p-4 container
			const h = Math.max(600, viewportHeight - header - padding);
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
			if (api && (api as { view?: unknown }).view) calendarRef.current?.updateSize?.();
		} catch {}
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
		isLocalized: isLocalized,
		currentView: calendarState.currentView,
		isVacationDate,
		handleRefreshWithBlur: async () => {},
		openConversation: openConversationFromStore,
		addEvent: eventsState.addEvent,
		updateEvent: eventsState.updateEvent,
		removeEvent: eventsState.removeEvent,
		dataTableEditor: {
			handleEditReservation: () => {},
		},
		calendarRef,
	});

	// Build calendar callbacks (dateClick/select/eventClick) using the event handlers
	const callbacks = React.useMemo(
		() =>
			createCalendarCallbacks(
				{
					isLocalized: isLocalized,
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
				getTimezone(),
				calendarState.currentDate,
				recordingState.periodIndex !== null && recordingState.field !== null ? handleVacationDateClick : undefined,
				calendarState.setCurrentDate,
				calendarState.currentView
			),
		[
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
		]
	);

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
			localStorage.setItem("dual-left-calendar-view", calendarState.currentView);
		}
	}, [calendarState.currentView]);

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("dual-right-calendar-view", rightCalendarView);
		}
	}, [rightCalendarView]);

	// Track dual calendar refs directly with guard to avoid re-render loops
	const [leftCalendarRef, setLeftCalendarRef] = React.useState<React.RefObject<CalendarCoreRef | null> | null>(null);
	const [rightCalendarRef, setRightCalendarRef] = React.useState<React.RefObject<CalendarCoreRef | null> | null>(null);

	// Callback ref to capture the dual calendar refs when they become available
	const dualCalendarCallbackRef = React.useCallback(
		(
			dualCalendarInstance: {
				leftCalendarRef: React.RefObject<CalendarCoreRef | null>;
				rightCalendarRef: React.RefObject<CalendarCoreRef | null>;
				leftView: string;
				rightView: string;
			} | null
		) => {
			mark("HomePage:dualCalendarCallbackRef");
			if (dualCalendarInstance) {
				setLeftCalendarRef((prev) =>
					prev !== dualCalendarInstance.leftCalendarRef ? dualCalendarInstance.leftCalendarRef : prev
				);
				setRightCalendarRef((prev) =>
					prev !== dualCalendarInstance.rightCalendarRef ? dualCalendarInstance.rightCalendarRef : prev
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
			{(() => {
				// Stable default during SSR/first client render to avoid mismatch
				let wrapperHeightClass = "h-[calc(100vh-4rem)]";
				if (mounted) {
					const isSingleExpanding =
						calendarState.currentView === "multiMonthYear" || calendarState.currentView === "listMonth";
					const isDualExpanding = isSingleExpanding;

					wrapperHeightClass = showDualCalendar
						? isDualExpanding
							? ""
							: "h-[calc(100vh-4rem)]"
						: isSingleExpanding
							? ""
							: "h-[calc(100vh-4rem)]";
				}

				// Avoid hydration mismatch: don't render the calendar until mounted on client
				if (!mounted) {
					return (
						<div className={"flex flex-1 flex-col gap-3 px-4 pb-4 pt-1 h-[calc(100vh-4rem)]"}>
							<CalendarContainer loading={true} isHydrated={false} isRefreshing={false}>
								<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
									<CalendarSkeleton />
								</div>
							</CalendarContainer>
						</div>
					);
				}

				return (
					<div className={`flex flex-1 flex-col gap-3 px-4 pb-0 pt-1 ${wrapperHeightClass}`}>
						<CalendarContainer loading={false} isHydrated={true} isRefreshing={isRefreshing}>
							<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
								{showDualCalendar ? (
									<DualCalendarComponent
										ref={dualCalendarCallbackRef}
										freeRoam={freeRoam}
										initialLeftView={calendarState.currentView}
										initialRightView={rightCalendarView}
										events={allEvents}
										loading={eventsState.loading}
										onRefreshData={handleRefreshWithBlur}
										onLeftViewChange={calendarState.setCurrentView}
										onRightViewChange={setRightCalendarView}
									/>
								) : (
									<CalendarMainContent
										calendarRef={calendarRef}
										processedEvents={allEvents}
										currentView={calendarState.currentView}
										currentDate={calendarState.currentDate}
										isLocalized={isLocalized}
										freeRoam={freeRoam}
										slotTimes={calendarState.slotTimes}
										slotTimesKey={calendarState.slotTimesKey}
										calendarHeight={calendarHeight}
										isVacationDate={isVacationDate}
										callbacks={callbacks}
										contextMenu={contextMenu}
										hoverCard={hoverCard}
										dragHandlers={dragHandlers}
										conversations={mappedConversations}
										reservations={mappedReservations}
										events={filteredEvents}
										dataTableEditor={{ handleEditReservation: () => {} }}
										handleOpenConversation={(id) => openConversationFromStore(id)}
										handleEventChange={eventHandlers.handleEventChange}
										handleCancelReservation={eventHandlers.handleCancelReservation}
										handleViewDetails={() => {}}
										handleOpenDocument={handleOpenDocument}
										setCurrentView={calendarState.setCurrentView}
										setCalendarHeight={setCalendarHeight}
										handleUpdateSize={handleCalendarUpdateSize}
										onViewChange={calendarState.setCurrentView}
										isHydrated={true}
										setCurrentDate={calendarState.setCurrentDate}
									/>
								)}

								{/* Stage M: enable DataTable editor with real state */}
								<CalendarDataTableEditorWrapper
									editorOpen={dataTableEditor.editorOpen}
									shouldLoadEditor={dataTableEditor.shouldLoadEditor}
									selectedDateRange={dataTableEditor.selectedDateRange}
									events={allEvents}
									freeRoam={freeRoam}
									calendarRef={calendarRef}
									isLocalized={isLocalized}
									slotDurationHours={SLOT_DURATION_HOURS}
									onOpenChange={dataTableEditor.setEditorOpen}
									onEventAdded={eventHandlers.handleEventAdded ?? (() => {})}
									onEventModified={eventHandlers.handleEventModified ?? (() => {})}
									onEventCancelled={eventHandlers.handleEventCancelled ?? (() => {})}
									onSave={handleRefreshWithBlur}
									closeEditor={dataTableEditor.closeEditor}
									setShouldLoadEditor={dataTableEditor.setShouldLoadEditor}
								/>
							</div>
						</CalendarContainer>
					</div>
				);
			})()}
			{/** Toaster is provided globally via ToastRouter in `app/layout.tsx` */}
		</SidebarInset>
	);
}
