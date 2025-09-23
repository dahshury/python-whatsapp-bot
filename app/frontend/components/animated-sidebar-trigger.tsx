"use client";

import { PanelLeft } from "lucide-react";
import { CalendarLegend } from "@/components/calendar-legend";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AnimatedSidebarTriggerProps {
	className?: string;
	freeRoam?: boolean;
}

export function AnimatedSidebarTrigger({
	className,
	freeRoam = false,
}: AnimatedSidebarTriggerProps) {
	const { toggleSidebar, open, isMobile } = useSidebar();

	return (
		<>
			{/* Trigger when sidebar is closed - positioned at left edge */}
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"fixed left-4 top-4 h-7 w-7 transition-all duration-300 ease-in-out animated-sidebar-trigger",
					open
						? "opacity-0 pointer-events-none scale-95"
						: "opacity-100 pointer-events-auto scale-100",
					isMobile && "md:hidden", // Hide on mobile since sheet handles it
					className,
				)}
				onClick={toggleSidebar}
				aria-label="Open Sidebar"
			>
				<PanelLeft className="h-4 w-4" />
			</Button>

			{/* Trigger when sidebar is open - positioned inside sidebar at header level */}
			<div
				className={cn(
					"fixed top-4 transition-all duration-300 ease-in-out animated-sidebar-trigger",
					open
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
					isMobile && "hidden", // Hide on mobile since sheet handles it
				)}
				style={{
					left: "calc(var(--sidebar-width) - 3rem)",
					transform: open ? "translateX(0)" : "translateX(100%)",
				}}
			>
				<Button
					variant="ghost"
					size="icon"
					className={cn("h-7 w-7 animated-sidebar-trigger", className)}
					onClick={toggleSidebar}
					aria-label="Close Sidebar"
				>
					<PanelLeft className="h-4 w-4 rotate-180" />
				</Button>
			</div>

			{/* Legend always stays outside sidebar, positioned beside closed trigger or outside open sidebar */}
			<div
				className={cn(
					"fixed top-4 transition-all duration-300 ease-in-out calendar-legend-trigger",
					isMobile && "md:hidden", // Hide on mobile since sheet handles it
				)}
				style={{
					left: open ? "calc(var(--sidebar-width) + 1rem)" : "4.5rem", // Outside sidebar when open, beside trigger when closed
				}}
			>
				<CalendarLegend freeRoam={freeRoam} className="h-7 w-auto" />
			</div>
		</>
	);
}
