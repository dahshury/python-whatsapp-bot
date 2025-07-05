"use client";

import dynamic from "next/dynamic";
import React from "react";
import { AnimatedSidebarTrigger } from "@/components/animated-sidebar-trigger";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { CalendarSkeleton } from "@/components/calendar-skeleton";
import { DockNav } from "@/components/dock-nav";
import { DockNavSimple } from "@/components/dock-nav-simple";
import { NotificationsButton } from "@/components/notifications-button";
import { SidebarInset } from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";

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

	// Use refs to capture calendar instances for integration with other components
	const calendarRef = React.useRef<CalendarCoreRef>(null);

	// Track the actual calendar ref that gets exposed by FullCalendarComponent
	const [actualCalendarRef, setActualCalendarRef] =
		React.useState<React.RefObject<CalendarCoreRef> | null>(null);

	// Callback ref to capture the calendar instance when it becomes available
	const calendarCallbackRef = React.useCallback(
		(
			calendarInstance: {
				calendarRef: React.RefObject<CalendarCoreRef>;
				currentView: string;
			} | null,
		) => {
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
	const [leftCalendarView, setLeftCalendarView] = React.useState(() => {
		if (typeof window !== "undefined") {
			return (
				localStorage.getItem("dual-left-calendar-view") || "multiMonthYear"
			);
		}
		return "multiMonthYear";
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
	React.useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("dual-left-calendar-view", leftCalendarView);
		}
	}, [leftCalendarView]);

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
					<div className="flex-1 flex items-center justify-between gap-4">
						{/* Left Calendar DockNav */}
						<div className="flex-1 flex justify-center">
							<DockNav
								className="mt-0"
								calendarRef={leftCalendarRef}
								currentCalendarView={leftCalendarView}
								onCalendarViewChange={setLeftCalendarView}
								navigationOnly={true}
							/>
						</div>

						{/* Middle Simple DockNav */}
						<DockNavSimple
							currentCalendarView={leftCalendarView}
							onCalendarViewChange={(view) => {
								// Apply view change to both calendars
								setLeftCalendarView(view);
								setRightCalendarView(view);
							}}
							leftCalendarView={leftCalendarView}
							rightCalendarView={rightCalendarView}
							onLeftCalendarViewChange={setLeftCalendarView}
							onRightCalendarViewChange={setRightCalendarView}
							leftCalendarRef={leftCalendarRef}
							rightCalendarRef={rightCalendarRef}
							isDualMode={true}
							className="mt-0"
						/>

						{/* Right Calendar DockNav */}
						<div className="flex-1 flex justify-center">
							<DockNav
								className="mt-0"
								calendarRef={rightCalendarRef}
								currentCalendarView={rightCalendarView}
								onCalendarViewChange={setRightCalendarView}
								navigationOnly={true}
							/>
						</div>
					</div>
				) : (
					// Single Calendar Mode Header Layout
					<div className="flex-1 flex justify-center">
						<DockNav
							className="mt-0"
							calendarRef={actualCalendarRef}
							currentCalendarView={leftCalendarView}
							onCalendarViewChange={setLeftCalendarView}
						/>
					</div>
				)}

				<div className="absolute right-4">
					<NotificationsButton />
				</div>
			</header>
			<div className="flex flex-1 flex-col gap-4 p-4 h-[calc(100vh-4rem)]">
				{showDualCalendar ? (
					<DualCalendarComponent
						ref={dualCalendarCallbackRef}
						freeRoam={freeRoam}
						initialLeftView={leftCalendarView}
						initialRightView={rightCalendarView}
						onLeftViewChange={setLeftCalendarView}
						onRightViewChange={setRightCalendarView}
					/>
				) : (
					<FullCalendarComponent
						ref={calendarCallbackRef}
						freeRoam={freeRoam}
						initialView={leftCalendarView}
						onViewChange={setLeftCalendarView}
					/>
				)}
			</div>
		</SidebarInset>
	);
}
