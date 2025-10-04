"use client";

import { usePathname } from "next/navigation";
import { CalendarLegend } from "@/components/calendar-legend";
import { DockNav } from "@/components/dock-nav";
import { NotificationInboxPopover } from "@/components/ui/notification-inbox-popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDockBridge } from "@/lib/dock-bridge-context";
import { useSettings } from "@/lib/settings-context";

export function PersistentDockHeader() {
	const { state } = useDockBridge();
	const { freeRoam } = useSettings();
	const pathname = usePathname();
	return (
		<header className="sticky top-0 z-40 grid grid-cols-[auto_1fr_auto] items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 h-12 sm:h-14 md:h-16 px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
			<div className="flex items-center gap-2 min-w-0">
				<SidebarTrigger className="scale-90 sm:scale-100" />
				{pathname === "/" && (
					<CalendarLegend
						freeRoam={freeRoam}
						className="ml-1 h-5 sm:h-6 max-w-[34vw] overflow-hidden"
					/>
				)}
			</div>
			<div className="min-w-0 flex justify-center">
				<DockNav
					className="mt-0 max-w-[98vw] overflow-x-auto"
					calendarRef={state.calendarRef || null}
					currentCalendarView={state.currentCalendarView || "timeGridWeek"}
					{...(typeof state.onCalendarViewChange === "function"
						? { onCalendarViewChange: state.onCalendarViewChange }
						: {})}
				/>
			</div>
			<div className="flex items-center justify-end">
				<NotificationInboxPopover />
			</div>
		</header>
	);
}
