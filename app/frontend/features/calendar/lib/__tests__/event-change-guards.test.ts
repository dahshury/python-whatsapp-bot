import { describe, expect, it, vi } from "vitest";
import {
  blockPastTimeWithinToday,
  suppressDuplicateEventChange,
} from "@/features/calendar/lib/event-change-guards";

const ONE_MINUTE_MS = 60_000;

describe("event-change-guards", () => {
  it("suppressDuplicateEventChange returns false on first call and true on immediate second call", () => {
    const now = new Date();
    const info = {
      event: {
        id: "1",
        start: now,
        startStr: now.toISOString(),
      },
    };
    const first = suppressDuplicateEventChange(info);
    const second = suppressDuplicateEventChange(info);
    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it("blockPastTimeWithinToday returns true and calls revert for past times today", () => {
    const earlier = new Date(Date.now() - ONE_MINUTE_MS);
    const revert = vi.fn();
    const info = {
      event: {
        id: "2",
        start: earlier,
        startStr: earlier.toISOString(),
      },
      revert,
    };
    const blocked = blockPastTimeWithinToday(
      info as unknown as import("@fullcalendar/core").EventChangeArg
    );
    expect(blocked).toBe(true);
    expect(revert).toHaveBeenCalled();
  });
});
