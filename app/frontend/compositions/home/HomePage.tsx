"use cache";

import { registerPrefetchModules } from "@/shared/libs/prefetch/registry";
import { HomeCalendar } from "@/widgets/calendar";

export const preloadHomeCalendar = async () =>
  import("@/widgets/calendar/home-calendar/HomeCalendar").then(
    (mod) => mod.HomeCalendar
  );

export const preloadCalendarContainer = async () =>
  import("@/widgets/calendar/CalendarContainer").then(
    (mod) => mod.CalendarContainer
  );

export const preloadCalendarMainContent = async () =>
  import("@/widgets/calendar/CalendarMainContent").then(
    (mod) => mod.CalendarMainContent
  );

export const preloadDualCalendar = async () =>
  import("@/widgets/calendar/DualCalendar").then(
    (mod) => mod.DualCalendarComponent
  );

export const preloadCalendarLegend = async () =>
  import("@/widgets/calendar/CalendarLegend").then((mod) => mod.CalendarLegend);

registerPrefetchModules("/", preloadHomeCalendar);
registerPrefetchModules("/", preloadCalendarContainer);
registerPrefetchModules("/", preloadCalendarMainContent);
registerPrefetchModules("/", preloadDualCalendar);
registerPrefetchModules("/", preloadCalendarLegend);

const ensureCacheBoundary = () => Promise.resolve();

export async function HomePage() {
  await ensureCacheBoundary();
  return <HomeCalendar />;
}
