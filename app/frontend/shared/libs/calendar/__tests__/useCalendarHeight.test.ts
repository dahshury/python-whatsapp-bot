import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCalendarHeight } from "@/shared/libs/calendar/useCalendarHeight";

describe("useCalendarHeight", () => {
  const MIN_EXPECTED_HEIGHT = 600;
  it("returns auto for multiMonthYear", () => {
    const { result } = renderHook(() => useCalendarHeight("multiMonthYear"));
    expect(result.current.height).toBe("auto");
  });

  it("returns a numeric height for timeGridWeek", () => {
    const { result } = renderHook(() => useCalendarHeight("timeGridWeek"));
    expect(typeof result.current.height === "number").toBe(true);
    if (typeof result.current.height === "number") {
      expect(result.current.height).toBeGreaterThanOrEqual(MIN_EXPECTED_HEIGHT);
    }
  });
});
