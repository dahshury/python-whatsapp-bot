"use client";

import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CalendarRange, FileEdit } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationInboxPopover } from "@/shared/ui/notification-inbox-popover";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { CalendarDrawer } from "@/widgets/calendar/CalendarDrawer";
import { CalendarLegend } from "@/widgets/calendar/CalendarLegend";
import { DefaultDocumentDrawer } from "@/widgets/documents/DefaultDocumentDrawer";
import { DockNav } from "./dock-nav";

export function PersistentDockHeader() {
	const { state } = useDockBridge();
	const { freeRoam, showDualCalendar } = useSettings();
	const pathname = usePathname();
	return (
		<header className="sticky top-0 z-40 flex flex-col border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 h-12 sm:h-14 md:h-16 px-2 sm:px-3 md:px-4">
			{/* Main header row with responsive three-part layout */}
			<div className="flex items-center h-full gap-2 sm:gap-3">
				{/* Left: Sidebar trigger (fixed) */}
				<div className="flex items-center gap-2 shrink-0">
					{pathname !== "/documents" && <SidebarTrigger className="scale-90 sm:scale-100" />}
				</div>

				{/* Middle: Dock - grows but never overlaps left/right on mobile */}
				<div className="flex-1 min-w-0 px-1 sm:px-2">
					<div
						className={cn(
							"w-full",
							// Center the dock on non-calendar pages (documents, dashboard)
							pathname !== "/" && "flex justify-center"
						)}
					>
						<DockNav
							className={cn("mt-0 px-2")}
							calendarRef={state.calendarRef || null}
							currentCalendarView={state.currentCalendarView || "timeGridWeek"}
							navigationOnly={!!showDualCalendar}
							dualModeTopDock={pathname === "/" && !!showDualCalendar}
							layout={pathname === "/" ? "headerThreeColumn" : "centered"}
							{...(typeof state.onCalendarViewChange === "function"
								? { onCalendarViewChange: state.onCalendarViewChange }
								: {})}
						/>
					</div>
				</div>

				{/* Right: Legend/Notifications (fixed) */}
				<div className="flex items-center gap-2 ml-auto shrink-0">
					{pathname === "/" && (
						<CalendarLegend freeRoam={freeRoam} className="h-5 sm:h-6 max-w-[28vw] sm:max-w-none overflow-hidden" />
					)}
					{pathname === "/documents" ? (
						<div className="flex items-center gap-1.5">
							<DefaultDocumentDrawer
								trigger={
									<Button variant="ghost" size="icon" aria-label={"Edit default document"}>
										{/* Distinct from calendar icons */}
										<FileEdit className="h-5 w-5" />
									</Button>
								}
								title="Default Document"
							/>
							<CalendarDrawer
								trigger={
									<Button variant="ghost" size="icon" aria-label={"Open Calendar"}>
										<CalendarRange className="h-5 w-5" />
									</Button>
								}
								side="right"
								title="Documents Calendar"
								initialView="listMonth"
								disableDateClick={true}
							/>
						</div>
					) : (
						<NotificationInboxPopover />
					)}
				</div>
			</div>
		</header>
	);
}
