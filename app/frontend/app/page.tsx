"use client";

import dynamic from "next/dynamic";
import React from "react";
import { AnimatedSidebarTrigger } from "@/components/animated-sidebar-trigger";
import { CalendarCore, type CalendarCoreRef } from "@/components/calendar-core";
import { CalendarMainContent } from "@/components/calendar-main-content";
import { CalendarContainer } from "@/components/calendar-container";
import { CalendarDataTableEditorWrapper } from "@/components/calendar-data-table-editor-wrapper";
import { CalendarSkeleton } from "@/components/calendar-skeleton";
import { DockNav } from "@/components/dock-nav";
import { DockNavSimple } from "@/components/dock-nav-simple";
import { CalendarDock } from "@/components/calendar-dock";
import { NotificationsButton } from "@/components/notifications-button";
import { SidebarInset } from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { SLOT_DURATION_HOURS, getTimezone } from "@/lib/calendar-config";
import { createCalendarCallbacks } from "@/lib/calendar-callbacks";
import { useCalendarState } from "@/hooks/useCalendarState";
import { useCalendarHoverCard } from "@/hooks/useCalendarHoverCard";
import { useCalendarDragHandlers } from "@/hooks/useCalendarDragHandlers";
import { useCalendarContextMenu } from "@/hooks/useCalendarContextMenu";
import { useCalendarEventHandlers } from "@/hooks/useCalendarEventHandlers";
import { filterEventsForCalendar } from "@/lib/calendar-event-processor";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { useCalendarDataTableEditor } from "@/hooks/useCalendarDataTableEditor";
import { mark } from "@/lib/dev-profiler";
import { useConversationsData, useReservationsData } from "@/lib/websocket-data-provider";

// Lazy load the calendar components to improve initial load time
const FullCalendarComponent = dynamic(
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

	// Avoid hydration mismatch: compute dynamic layout only after mount
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
		mark("HomePage:mounted");
	}, []);

	// Use refs to capture calendar instances for integration with other components
	const calendarRef = React.useRef<CalendarCoreRef>(null);

	// Track the actual calendar ref that gets exposed by FullCalendarComponent
	const [actualCalendarRef, setActualCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef> | null>(null);
	// Stage C: Load events via existing hook (no extra UI around it)
	const { isRTL } = useLanguage();
	const eventsState = useCalendarEvents({ freeRoam, isRTL, autoRefresh: false });
	// Pull live conversations/reservations so hover card has real data
	const { conversations } = useConversationsData();
	const { reservations } = useReservationsData();

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

	// Stage J: Enable real hover card + drag handlers (others stay inert)
	const closeHoverCardRef = React.useRef<(() => void) | null>(null);
	const dragHandlers = useCalendarDragHandlers({
		closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
	});
	const hoverCard = useCalendarHoverCard({ isDragging: dragHandlers.isDragging });
	closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;

	// Stage K: Enable real context menu manager
	const contextMenu = useCalendarContextMenu();

	// Stage L: (placeholder) event handlers will be initialized after calendarState
	let eventHandlers: any = { handleEventChange: () => {} };

	// Callback ref to capture the calendar instance when it becomes available
	const calendarCallbackRef = React.useCallback(
		(
			calendarInstance: {
				calendarRef: React.RefObject<CalendarCoreRef>;
				currentView: string;
			} | null,
		) => {
			mark("HomePage:calendarCallbackRef");
			// Store the full calendar instance in the ref
			if (
				calendarInstance?.calendarRef.current &&
				calendarRef.current !== calendarInstance.calendarRef.current
			) {
				(calendarRef as React.MutableRefObject<CalendarCoreRef>).current =
					calendarInstance.calendarRef.current;
			}

			// Update state to trigger re-renders of dependent components
			if (calendarInstance?.calendarRef) {
				setActualCalendarRef(calendarInstance.calendarRef);
			} else {
				setActualCalendarRef(null);
			}
		},
		[],
	);

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

	// Build calendar callbacks (dateClick/select/eventClick) using the same factory
	const callbackHandlers = React.useMemo(
		() => ({
			isChangingHours: calendarState.isChangingHours,
			setIsChangingHours: calendarState.setIsChangingHours,
			isRTL,
			currentView: calendarState.currentView,
			isVacationDate: () => false,
			openEditor: (opts: { start: string; end?: string }) => {
				const startStr = String(opts.start);
				const endStr = typeof opts.end === "string" ? opts.end : undefined;
				dataTableEditor.openEditor({ start: startStr, end: endStr as any });
			},
			handleOpenConversation: () => {},
			handleEventChange: eventHandlers.handleEventChange,
		}),
		[
			calendarState.isChangingHours,
			calendarState.setIsChangingHours,
			isRTL,
			calendarState.currentView,
			dataTableEditor.openEditor,
			eventHandlers.handleEventChange,
		],
	);

	const callbacks = React.useMemo(
		() =>
			createCalendarCallbacks(
				callbackHandlers,
				freeRoam,
				getTimezone(),
				calendarState.currentDate,
				undefined,
				calendarState.setCurrentDate,
				calendarState.updateSlotTimes,
				calendarState.currentView,
			),
		[
			callbackHandlers,
			freeRoam,
			calendarState.currentDate,
			calendarState.setCurrentDate,
			calendarState.updateSlotTimes,
			calendarState.currentView,
		],
	);

	// Initialize event handlers now that calendarState exists
	const { openConversation: openConversationFromStore } = useSidebarChatStore();
	eventHandlers = useCalendarEventHandlers({
		events: eventsState.events,
		conversations: {},
		isRTL,
		currentView: calendarState.currentView,
		isVacationDate: () => false,
		handleRefreshWithBlur: async () => {},
		openConversation: openConversationFromStore,
		addEvent: eventsState.addEvent,
		updateEvent: eventsState.updateEvent,
		removeEvent: eventsState.removeEvent,
		dataTableEditor: { openEditor: () => {}, handleEditReservation: () => {} } as any,
		calendarRef,
	});
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
			localStorage.setItem("dual-left-calendar-view", calendarState.currentView);
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
						<div className={`flex flex-1 flex-col gap-4 p-4 h-[calc(100vh-4rem)]`}>
							<CalendarContainer loading={true} isHydrated={false} isRefreshing={false}>
								<div className="flex-1 rounded-lg border border-border/50 bg-card/50 p-2">
									<CalendarSkeleton />
								</div>
							</CalendarContainer>
						</div>
					);
				}

				return (
					<div className={`flex flex-1 flex-col gap-4 p-4 ${wrapperHeightClass}`}>
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
										processedEvents={filterEventsForCalendar(eventsState.events, freeRoam)}
										currentView={calendarState.currentView}
										currentDate={calendarState.currentDate}
										isRTL={isRTL}
										freeRoam={freeRoam}
										slotTimes={calendarState.slotTimes}
										slotTimesKey={calendarState.slotTimesKey}
										calendarHeight={calendarHeight}
										isVacationDate={() => false}
										callbacks={callbacks}
										contextMenu={contextMenu}
										hoverCard={hoverCard as any}
										dragHandlers={dragHandlers as any}
										conversations={conversations}
										reservations={reservations}
										events={filterEventsForCalendar(eventsState.events, freeRoam)}
										dataTableEditor={{ handleEditReservation: () => {} }}
										handleOpenConversation={(id) => openConversationFromStore(id)}
										handleEventChange={eventHandlers.handleEventChange}
										handleCancelReservation={eventHandlers.handleCancelReservation}
										handleViewDetails={() => {}}
										setCurrentView={calendarState.setCurrentView}
										setCalendarHeight={setCalendarHeight}
										handleUpdateSize={() => calendarRef.current?.updateSize?.()}
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
		</SidebarInset>
	);
}
