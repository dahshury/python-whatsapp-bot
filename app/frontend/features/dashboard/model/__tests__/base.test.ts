import { describe, expect, it } from "vitest";
import {
  computeAvgFollowups,
  computeConversionRate,
} from "@/features/dashboard/model/calculators/base";
import type {
  DashboardConversationMessage,
  DashboardReservation,
} from "@/features/dashboard/types";

describe("base calculators", () => {
  it("computeConversionRate returns 100 when all chatted ids reserved", () => {
    const PERCENT = 100;
    const reservations: [string, DashboardReservation[]][] = [
      ["wa1", [{} as DashboardReservation, {} as DashboardReservation]],
      ["wa2", [{} as DashboardReservation]],
    ];
    const messages: [string, DashboardConversationMessage[]][] = [
      ["wa1", [{} as DashboardConversationMessage]],
      ["wa2", [{} as DashboardConversationMessage]],
    ];
    const rate = computeConversionRate(reservations, messages);
    expect(rate).toBe(PERCENT);
  });

  it("computeAvgFollowups averages follow-ups among returning customers", () => {
    const reservations: [string, DashboardReservation[]][] = [
      ["wa1", [{} as DashboardReservation, {} as DashboardReservation]], // 1 follow-up
      ["wa2", [{} as DashboardReservation]],
    ];
    const avg = computeAvgFollowups(reservations);
    expect(avg).toBe(1);
  });
});
