"use client";

import { DockNav } from "@/components/dock-nav";
import { NotificationsButton } from "@/components/notifications-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDockBridge } from "@/lib/dock-bridge-context";

export function PersistentDockHeader() {
	const { state } = useDockBridge();
	return (
		<header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="flex items-center gap-2 min-w-[10rem]">
				<SidebarTrigger />
			</div>
			<div className="flex-1 flex justify-center">
				<DockNav
					className="mt-0"
					calendarRef={state.calendarRef || null}
					currentCalendarView={state.currentCalendarView || "timeGridWeek"}
					{...(typeof state.onCalendarViewChange === "function"
						? { onCalendarViewChange: state.onCalendarViewChange }
						: {})}
				/>
			</div>
			<div className="absolute right-4">
				<NotificationsButton />
			</div>
		</header>
	);
}
