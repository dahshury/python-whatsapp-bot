"use client";

import { useHomeCalendarController } from "./controller/useHomeCalendarController";
import { HomeCalendarView } from "./ui/HomeCalendarView";

export function HomeCalendar() {
  const controller = useHomeCalendarController();
  return <HomeCalendarView controller={controller} />;
}
