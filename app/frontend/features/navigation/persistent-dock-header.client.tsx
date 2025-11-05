"use client";

import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CalendarRange, FileEdit } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { CalendarDrawer, CalendarLegend } from "@/widgets/calendar";
import { DockNav } from "./dock-nav";

// Dynamically import NotificationInboxPopover with ssr: false to avoid hydration mismatches
// caused by Radix UI's random ID generation in Popover components
const NotificationInboxPopover = dynamic(
  () =>
    import("@/widgets/notifications/notification-inbox-popover").then(
      (mod) => mod.NotificationInboxPopover
    ),
  { ssr: false }
);

export function PersistentDockHeaderClient() {
  const { state } = useDockBridge();
  const { freeRoam, showDualCalendar } = useSettings();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-12 flex-col border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:h-14 sm:px-3 md:h-16 md:px-4">
      {/* Main header row with responsive three-part layout */}
      <div className="flex h-full items-center gap-2 sm:gap-3">
        {/* Left: Sidebar trigger (fixed) */}
        <div className="flex shrink-0 items-center gap-2">
          {pathname !== "/documents" && (
            <SidebarTrigger className="scale-90 sm:scale-100" />
          )}
        </div>

        {/* Middle: Dock - grows but never overlaps left/right on mobile */}
        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <div
            className={cn(
              "w-full",
              // Center the dock on non-calendar pages (documents, dashboard)
              pathname !== "/" && "flex justify-center"
            )}
          >
            <DockNav
              calendarRef={state.calendarRef || null}
              className={cn("mt-0 px-2")}
              currentCalendarView={state.currentCalendarView || "timeGridWeek"}
              dualModeTopDock={pathname === "/" && !!showDualCalendar}
              layout={pathname === "/" ? "headerThreeColumn" : "centered"}
              navigationOnly={!!showDualCalendar}
              {...(typeof state.onCalendarViewChange === "function"
                ? { onCalendarViewChange: state.onCalendarViewChange }
                : {})}
            />
          </div>
        </div>

        {/* Right: Legend/Notifications (fixed) */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {pathname === "/" && (
            <CalendarLegend
              className="h-5 max-w-[28vw] overflow-hidden sm:h-6 sm:max-w-none"
              freeRoam={freeRoam}
            />
          )}
          {pathname === "/documents" ? (
            <div className="flex items-center gap-1.5">
              <Link href={`/documents?waId=${TEMPLATE_USER_WA_ID}`}>
                <Button
                  aria-label="Edit default document template"
                  size="icon"
                  variant="ghost"
                >
                  <FileEdit className="h-5 w-5" />
                </Button>
              </Link>
              <CalendarDrawer
                disableDateClick={true}
                initialView="listMonth"
                lockView="listMonth"
                side="right"
                title="Documents Calendar"
                trigger={
                  <Button
                    aria-label={"Open Calendar"}
                    size="icon"
                    variant="ghost"
                  >
                    <CalendarRange className="h-5 w-5" />
                  </Button>
                }
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
