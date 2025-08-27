"use client";

// Interface for websocket message objects
interface WebSocketMessage {
	ts?: string;
	role?: string;
	text?: string;
	message?: string;
}

// Interface for websocket reservation objects
interface WebSocketReservation {
	start?: string;
	customer_name?: string;
	title?: string;
	type?: number;
	cancelled?: boolean;
}

import dynamic from "next/dynamic";
import React from "react";
import { AnimatedSidebarTrigger } from "@/components/animated-sidebar-trigger";
import { CalendarContainer } from "@/components/calendar-container";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { CalendarDataTableEditorWrapper } from "@/components/calendar-data-table-editor-wrapper";
import { CalendarDock } from "@/components/calendar-dock";
import { CalendarMainContent } from "@/components/calendar-main-content";
import { CalendarSkeleton } from "@/components/calendar-skeleton";
import { DockNav } from "@/components/dock-nav";
import { DockNavSimple } from "@/components/dock-nav-simple";
import { NotificationsButton } from "@/components/notifications-button";
import { SidebarInset } from "@/components/ui/sidebar";
import { useCalendarContextMenu } from "@/hooks/useCalendarContextMenu";
import { useCalendarDataTableEditor } from "@/hooks/useCalendarDataTableEditor";
import { useCalendarDragHandlers } from "@/hooks/useCalendarDragHandlers";
import { useCalendarEventHandlers } from "@/hooks/useCalendarEventHandlers";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendarHoverCard } from "@/hooks/useCalendarHoverCard";
import { useCalendarState } from "@/hooks/useCalendarState";
import { useVacationDateChecker } from "@/hooks/useVacationDateChecker";
import { createCalendarCallbacks } from "@/lib/calendar-callbacks";
import { getTimezone, SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import { filterEventsForCalendar } from "@/lib/calendar-event-processor";
import { mark } from "@/lib/dev-profiler";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { useVacation } from "@/lib/vacation-context";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";

// Lazy load the calendar components to improve initial load time
const _FullCalendarComponent = dynamic(
	() =>
		import("@/components/fullcalendar").then((mod) => ({
			default: mod.FullCalendarComponent,
		})),
	{
		loading: () => <CalendarSkeleton />,
		ssr: false,
	},
);

const DualCalendarComponent = dynamic(
	() =>
		import("@/components/dual-calendar").then((mod) => ({
			default: mod.DualCalendarComponent,
		})),
	{
		loading: () => <CalendarSkeleton />,
		ssr: false,
	},
);

export default function HomePage() {
	const { freeRoam, showDualCalendar } = useSettings();
	const {
		vacationPeriods,
		handleDateClick: handleVacationDateClick,
		recordingState,
	} = useVacation();
	const isVacationDate = useVacationDateChecker(vacationPeriods);

	// Avoid hydration mismatch: compute dynamic layout only after mount
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
		mark("HomePage:mounted");
	}, []);

	// Use refs to capture calendar instances for integration with other components
	const calendarRef = React.useRef<CalendarCoreRef>(null);

	// CalendarCore will populate calendarRef directly through forwardRef
	// Stage C: Load events via existing hook (no extra UI around it)
	const { isRTL } = useLanguage();
	const eventsState = useCalendarEvents({
		freeRoam,
		isRTL,
		autoRefresh: false,
	});
	// Pull live conversations/reservations so hover card has real data
	const { conversations } = useConversationsData();
	const { reservations } = useReservationsData();

	// Map websocket shapes to strict calendar types
	const mappedConversations = React.useMemo(() => {
		const out: Record<
			string,
			import("@/types/calendar").ConversationMessage[]
		> = {};
		Object.entries(conversations || {}).forEach(([waId, msgs]) => {
			out[waId] = (Array.isArray(msgs) ? msgs : []).map(
				(m: WebSocketMessage) => {
					const ts = m?.ts ? new Date(m.ts) : null;
					const iso =
						ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : undefined;
					return {
						role: m?.role || "user",
						message: String(m?.text || m?.message || ""),
						time: iso ? iso.slice(11, 19) : "00:00:00",
						date: iso
							? iso.slice(0, 10)
							: new Date().toISOString().slice(0, 10),
					};
				},
			);
		});
		return out;
	}, [conversations]);

	const mappedReservations = React.useMemo(() => {
		const out: Record<string, import("@/types/calendar").Reservation[]> = {};
		Object.entries(reservations || {}).forEach(([waId, items]) => {
			out[waId] = (Array.isArray(items) ? items : []).map(
				(r: WebSocketReservation) => {
					const startStr = String(r?.start || "");
					const d = startStr ? new Date(startStr) : null;
					const date =
						d && !Number.isNaN(d.getTime())
							? d.toISOString().slice(0, 10)
							: new Date().toISOString().slice(0, 10);
					const time =
						d && !Number.isNaN(d.getTime())
							? d.toISOString().slice(11, 16)
							: "00:00";
					return {
						customer_id: waId,
						date,
						time_slot: time,
						customer_name: String(r?.customer_name || r?.title || waId),
						type: typeof r?.type === "number" ? (r.type as number) : 0,
						cancelled: r?.cancelled === true ? true : undefined,
					};
				},
			);
		});
		return out;
	}, [reservations]);

	// Memoize filtered events to avoid triggering FullCalendar eventsSet on every render
	const filteredEvents = React.useMemo(
		() => filterEventsForCalendar(eventsState.events, freeRoam),
		[eventsState.events, freeRoam],
	);

	// Stage G: Add simple height management and updateSize wiring
	const [calendarHeight, setCalendarHeight] = React.useState<number | "auto">(
		"auto",
	);
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

	// Dual calendar refs and view states
	const _dualCalendarRef = React.useRef<{
		leftCalendarRef: React.RefObject<CalendarCoreRef>;
		rightCalendarRef: React.RefObject<CalendarCoreRef>;
		leftView: string;
		rightView: string;
	}>(null);
	// Stage I: adopt useCalendarState for robust view/date/slotTimes
	const calendarState = useCalendarState({
		freeRoam,
		initialView: "multiMonthYear",
		initialDate: undefined,
	});

	// Stage M: Enable real data-table editor state
	const dataTableEditor = useCalendarDataTableEditor();

	// Initialize event handlers now that calendarState exists
	const { openConversation: openConversationFromStore } = useSidebarChatStore();
	const eventHandlers = useCalendarEventHandlers({
		events: eventsState.events,
		conversations: {},
		isRTL,
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
					isChangingHours: calendarState.isChangingHours,
					setIsChangingHours: calendarState.setIsChangingHours,
					isRTL,
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
				recordingState.periodIndex !== null && recordingState.field !== null
					? handleVacationDateClick
					: undefined,
				calendarState.setCurrentDate,
				calendarState.updateSlotTimes,
				calendarState.currentView,
			),
		[
			calendarState.isChangingHours,
			calendarState.setIsChangingHours,
			isRTL,
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
			calendarState.updateSlotTimes,
		],
	);

	const [rightCalendarView, setRightCalendarView] = React.useState(() => {
		if (typeof window !== "undefined") {
			return (
				localStorage.getItem("dual-right-calendar-view") || "multiMonthYear"
			);
		}
		return "multiMonthYear";
	});

	// Save to localStorage when views change
	// Persist current view (optional)
	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"dual-left-calendar-view",
				calendarState.currentView,
			);
		}
	}, [calendarState.currentView]);

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("dual-right-calendar-view", rightCalendarView);
		}
	}, [rightCalendarView]);

	// Track dual calendar refs directly
	const [leftCalendarRef, setLeftCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef> | null>(null);
	const [rightCalendarRef, setRightCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef> | null>(null);

	// Callback ref to capture the dual calendar refs when they become available
	const dualCalendarCallbackRef = React.useCallback(
		(
			dualCalendarInstance: {
				leftCalendarRef: React.RefObject<CalendarCoreRef>;
				rightCalendarRef: React.RefObject<CalendarCoreRef>;
				leftView: string;
				rightView: string;
			} | null,
		) => {
			mark("HomePage:dualCalendarCallbackRef");
			if (dualCalendarInstance) {
				setLeftCalendarRef(dualCalendarInstance.leftCalendarRef);
				setRightCalendarRef(dualCalendarInstance.rightCalendarRef);
			}
		},
		[],
	);

	return (
		<SidebarInset>
			{/* Animated Sidebar Trigger with Legend */}
			<AnimatedSidebarTrigger freeRoam={freeRoam} />

			<header className="relative flex h-16 shrink-0 items-center border-b px-4">
				{showDualCalendar ? (
					// Dual Calendar Mode Header Layout
					<div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
						<div className="justify-self-center">
							<CalendarDock
								currentView={calendarState.currentView}
								calendarRef={leftCalendarRef}
								freeRoam={freeRoam}
								isRTL={isRTL}
							/>
						</div>
						<DockNavSimple
							className="mt-0"
							currentCalendarView={calendarState.currentView}
							onCalendarViewChange={calendarState.setCurrentView}
							leftCalendarView={calendarState.currentView}
							rightCalendarView={rightCalendarView}
							onLeftCalendarViewChange={calendarState.setCurrentView}
							onRightCalendarViewChange={setRightCalendarView}
							leftCalendarRef={leftCalendarRef}
							rightCalendarRef={rightCalendarRef}
							isDualMode={true}
						/>
						<div className="justify-self-center">
							<CalendarDock
								currentView={rightCalendarView}
								calendarRef={rightCalendarRef}
								freeRoam={freeRoam}
								isRTL={isRTL}
							/>
						</div>
					</div>
				) : (
					// Single Calendar Mode Header Layout
					<div className="flex-1 flex justify-center">
						<DockNav
							className="mt-0"
							calendarRef={calendarRef}
							currentCalendarView={calendarState.currentView}
							onCalendarViewChange={calendarState.setCurrentView}
						/>
					</div>
				)}

				<div className="absolute right-4">
					<NotificationsButton />
				</div>
			</header>
			{(() => {
				// Stable default during SSR/first client render to avoid mismatch
				let wrapperHeightClass = "h-[calc(100vh-4rem)]";
				if (mounted) {
					const isSingleExpanding =
						calendarState.currentView === "multiMonthYear" ||
						calendarState.currentView === "listMonth";
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
						<div
							className={`flex flex-1 flex-col gap-4 p-4 h-[calc(100vh-4rem)]`}
						>
							<CalendarContainer
								loading={true}
								isHydrated={false}
								isRefreshing={false}
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
						className={`flex flex-1 flex-col gap-4 p-4 ${wrapperHeightClass}`}
					>
						<CalendarContainer
							loading={false}
							isHydrated={true}
							isRefreshing={isRefreshing}
						>
							<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
								{showDualCalendar ? (
									<DualCalendarComponent
										ref={dualCalendarCallbackRef}
										freeRoam={freeRoam}
										initialLeftView={calendarState.currentView}
										initialRightView={rightCalendarView}
										events={eventsState.events}
										loading={eventsState.loading}
										onRefreshData={handleRefreshWithBlur}
										onLeftViewChange={calendarState.setCurrentView}
										onRightViewChange={setRightCalendarView}
									/>
								) : (
									<CalendarMainContent
										calendarRef={calendarRef}
										processedEvents={filteredEvents}
										currentView={calendarState.currentView}
										currentDate={calendarState.currentDate}
										isRTL={isRTL}
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
										handleOpenConversation={(id) =>
											openConversationFromStore(id)
										}
										handleEventChange={eventHandlers.handleEventChange}
										handleCancelReservation={
											eventHandlers.handleCancelReservation
										}
										handleViewDetails={() => {}}
										setCurrentView={calendarState.setCurrentView}
										setCalendarHeight={setCalendarHeight}
										handleUpdateSize={() => {
											try {
												const api = calendarRef.current?.getApi?.();
												if (api && (api as { view?: unknown }).view)
													calendarRef.current?.updateSize?.();
											} catch {}
										}}
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
									events={eventsState.events}
									freeRoam={freeRoam}
									calendarRef={calendarRef}
									isRTL={isRTL}
									slotDurationHours={SLOT_DURATION_HOURS}
									onOpenChange={dataTableEditor.setEditorOpen}
									onEventAdded={eventHandlers.handleEventAdded ?? (() => {})}
									onEventModified={
										eventHandlers.handleEventModified ?? (() => {})
									}
									onEventCancelled={
										eventHandlers.handleEventCancelled ?? (() => {})
									}
									onSave={handleRefreshWithBlur}
									closeEditor={dataTableEditor.closeEditor}
									setShouldLoadEditor={dataTableEditor.setShouldLoadEditor}
								/>
							</div>
						</CalendarContainer>
					</div>
				);
			})()}
		</SidebarInset>
	);
}
