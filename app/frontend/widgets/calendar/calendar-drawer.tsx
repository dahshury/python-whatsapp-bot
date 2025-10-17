"use client";

import { DockNav } from "@features/navigation/dock-nav";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import {
	isValidElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/ui/sheet";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { CalendarContainer } from "@/widgets/calendar/calendar-container";
import { CalendarMainContent } from "@/widgets/calendar/calendar-main-content";
import { useCalendarCore } from "@/widgets/calendar/hooks/use-calendar-core";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

type CalendarDrawerProps = {
	className?: string;
	trigger?: React.ReactNode;
	side?: "left" | "right" | "top" | "bottom";
	initialView?: string;
	title?: string;
	disableDateClick?: boolean;
	/** Persist calendar state under this prefix; defaults to documents drawer */
	storageKeyPrefix?: string;
};

/**
 * CalendarDrawer renders a minimal calendar inside a drawer/sheet.
 * It reuses centralized calendar logic via useCalendarCore and CalendarMainContent.
 * Date click behavior can be disabled via prop and is intentionally modular.
 */
export function CalendarDrawer({
	className,
	trigger,
	side = "right",
	initialView = "listMonth",
	title = "Calendar",
	disableDateClick = true,
	storageKeyPrefix = "documents:calendar-drawer",
}: CalendarDrawerProps) {
	const [open, setOpen] = useState(false);
	const contentId = "documents-calendar-drawer";
	const didInitOnOpenRef = useRef(false);

	// Centralized calendar state/logic
	const {
		calendarRef,
		calendarState,
		eventsState,
		processedEvents,
		calendarHeight,
		isRefreshing,
		isVacationDate,
		contextMenu,
		hoverCardWithDragging,
		dragHandlers,
		eventHandlers,
		callbacks: baseCallbacks,
		handleUpdateSize,
		setCalendarHeight,
		reservations,
		isLocalized,
	} = useCalendarCore({
		freeRoam: true,
		initialView,
		storageKeyPrefix,
		excludeConversations: true,
	});

	// Keep stable ref for setCurrentView to avoid dependency chain
	const setCurrentViewRef = useRef(calendarState.setCurrentView);
	useEffect(() => {
		setCurrentViewRef.current = calendarState.setCurrentView;
	}, [calendarState.setCurrentView]);

	// Direct view change handler to affect this calendar instance even off calendar page
	const handleViewChangeDirect = useCallback(
		(view: string) => {
			try {
				const api = calendarRef?.current?.getApi?.();
				if (api) {
					try {
						api.setOption("validRange", undefined);
						api.setOption("eventConstraint", undefined);
						api.setOption("selectConstraint", undefined);
					} catch {
						// Ignore errors when clearing calendar options
					}
					try {
						api.changeView(view);
					} catch {
						// View change may fail in some contexts
					}
					try {
						requestAnimationFrame(() => {
							try {
								api.updateSize?.();
							} catch {
								// Size update may fail
							}
						});
					} catch {
						// RequestAnimationFrame may fail
					}
				}
			} finally {
				setCurrentViewRef.current?.(view);
			}
		},
		[calendarRef]
	);

	// Keep stable refs for functions used inside open effect
	const setCurrentDateRef = useRef(calendarState.setCurrentDate);
	useEffect(() => {
		setCurrentDateRef.current = calendarState.setCurrentDate;
	}, [calendarState.setCurrentDate]);
	const viewChangeDirectRef = useRef(handleViewChangeDirect);
	useEffect(() => {
		viewChangeDirectRef.current = handleViewChangeDirect;
	}, [handleViewChangeDirect]);

	// Reset to today and force list view only once per drawer open
	useEffect(() => {
		if (!open) {
			didInitOnOpenRef.current = false;
			return;
		}
		if (didInitOnOpenRef.current) {
			return;
		}
		didInitOnOpenRef.current = true;
		try {
			const api = calendarRef?.current?.getApi?.();
			api?.today?.();
		} catch {
			// Calendar API may not be ready
		}
		try {
			setCurrentDateRef.current?.(new Date());
		} catch {
			// Setting date may fail in some contexts
		}
		try {
			viewChangeDirectRef.current?.("listMonth");
		} catch {
			// View change may fail
		}
	}, [open, calendarRef]);

	// Bridge for DockNav/Settings to control this calendar
	const { setState: setDockBridgeState } = useDockBridge();
	useEffect(() => {
		setDockBridgeState({
			calendarRef: (calendarRef ||
				null) as React.RefObject<CalendarCoreRef | null>,
			currentCalendarView: calendarState.currentView,
			onCalendarViewChange: handleViewChangeDirect,
		});
	}, [
		handleViewChangeDirect,
		calendarRef,
		calendarState.currentView,
		setDockBridgeState,
	]);

	// Optionally disable dateClick/select by overriding callbacks
	const callbacks = useMemo(() => {
		if (!disableDateClick) {
			return baseCallbacks;
		}
		return {
			dateClick: () => {
				// Intentionally empty - date clicks disabled in drawer
			},
			select: () => {
				// Intentionally empty - selections disabled in drawer
			},
			// In drawer, allow clicking past reservations (pass through to default)
			eventClick: baseCallbacks.eventClick,
		};
	}, [baseCallbacks, disableDateClick]);

	// Drawer width adapts to calendar view: list* views use 75vw, others expand
	const isListView = useMemo(() => {
		const view = calendarState.currentView || "";
		return view.startsWith("list");
	}, [calendarState.currentView]);

	const drawerWidthClass = useMemo(
		() => (isListView ? "w-[clamp(320px,75vw,840px)]" : "w-[95vw]"),
		[isListView]
	);

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen);
	}, []);

	return (
		<Sheet onOpenChange={handleOpenChange} open={open}>
			{trigger ? (
				isValidElement(trigger) ? (
					<SheetTrigger aria-controls={contentId} asChild>
						{trigger}
					</SheetTrigger>
				) : (
					<SheetTrigger aria-controls={contentId} asChild>
						<Button variant="outline">Open Calendar</Button>
					</SheetTrigger>
				)
			) : (
				<SheetTrigger aria-controls={contentId} asChild>
					<Button variant="outline">Open Calendar</Button>
				</SheetTrigger>
			)}
			<SheetContent
				className={cn(
					`${drawerWidthClass} flex max-w-none flex-col overflow-hidden p-0 sm:max-w-none`,
					className
				)}
				id={contentId}
				side={side}
			>
				<SheetHeader className="border-b px-4 py-3">
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>

				{/* Dock similar to header dock, single-view settings */}
				<div className="px-2 py-1">
					{/* No external arrows; navigation is inside the dock */}
					<DockNav
						calendarRef={calendarRef}
						className="mt-0 w-full max-w-full overflow-x-auto"
						currentCalendarView={calendarState.currentView}
						layout="drawerThreeColumn"
						navigationOnly={true}
						onCalendarViewChange={handleViewChangeDirect}
					/>
				</div>

				<div className="min-h-0 flex-1 px-2 pt-0 pb-2">
					<ThemedScrollbar className="h-full" noScrollX={true}>
						<CalendarContainer
							isHydrated={calendarState.isHydrated}
							isRefreshing={isRefreshing}
							loading={eventsState.loading}
						>
							<div className="rounded-lg border border-border/50 bg-card/50 p-2">
								<CalendarMainContent
									calendarHeight={calendarHeight}
									calendarRef={calendarRef}
									callbacks={callbacks}
									contextMenu={contextMenu}
									conversations={{}}
									currentDate={calendarState.currentDate}
									currentView={calendarState.currentView}
									dataTableEditor={{
										handleEditReservation: () => {
											// No-op: editing not supported in drawer
										},
									}}
									disableHoverCards={true}
									disableNavLinks={true}
									dragHandlers={dragHandlers}
									events={eventsState.events}
									freeRoam={true}
									handleCancelReservation={
										eventHandlers.handleCancelReservation
									}
									handleEventChange={eventHandlers.handleEventChange}
									handleOpenConversation={(waId: string) => {
										try {
											window.dispatchEvent(
												new CustomEvent("doc:user-select", {
													detail: { waId },
												})
											);
										} catch {
											// Event dispatch may fail
										}
										try {
											eventHandlers.handleOpenConversation(waId);
										} catch {
											// Handler may fail
										}
										// Close the drawer after clicking an event
										setOpen(false);
									}}
									handleOpenDocument={(waId: string) => {
										try {
											window.dispatchEvent(
												new CustomEvent("doc:user-select", {
													detail: { waId },
												})
											);
										} catch {
											// Event dispatch may fail
										}
										// Close the drawer after selecting a document
										setOpen(false);
									}}
									handleUpdateSize={handleUpdateSize}
									handleViewDetails={() => {
										// No-op: view details not applicable in drawer context
									}}
									hoverCard={hoverCardWithDragging}
									isHydrated={calendarState.isHydrated}
									isLocalized={isLocalized}
									isVacationDate={isVacationDate}
									processedEvents={processedEvents.filter(
										(e: unknown) =>
											(e as { type?: string }).type !== "conversation"
									)}
									reservations={reservations}
									setCalendarHeight={setCalendarHeight}
									setCurrentDate={calendarState.setCurrentDate}
									setCurrentView={calendarState.setCurrentView}
									slotTimes={calendarState.slotTimes}
									slotTimesKey={calendarState.slotTimesKey}
								/>
							</div>
						</CalendarContainer>
					</ThemedScrollbar>
				</div>
			</SheetContent>
		</Sheet>
	);
}
