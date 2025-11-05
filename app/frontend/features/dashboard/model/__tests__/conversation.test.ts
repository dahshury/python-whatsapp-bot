import { describe, expect, it } from "vitest";
import {
  computeResponseDurationsMinutes,
  computeResponseTimeStats,
} from "@/features/dashboard/model/calculators/conversation";
import type { DashboardConversationMessage } from "@/features/dashboard/types";

describe("conversation calculators", () => {
  it("computeResponseDurationsMinutes detects assistant reply after customer", () => {
    const entries: [string, DashboardConversationMessage[]][] = [
      [
        "wa1",
        [
          {
            ts: "2024-01-01T10:00:00.000Z",
            role: "user",
          } as DashboardConversationMessage,
          {
            ts: "2024-01-01T10:10:00.000Z",
            role: "assistant",
          } as DashboardConversationMessage,
        ],
      ],
    ];
    const mins = computeResponseDurationsMinutes(entries);
    expect(mins).toEqual([10]);
  });

  it("computeResponseTimeStats caps and reports stats", () => {
    const entries: [string, DashboardConversationMessage[]][] = [
      [
        "wa1",
        [
          {
            ts: "2024-01-01T10:00:00.000Z",
            role: "user",
          } as DashboardConversationMessage,
          {
            ts: "2024-01-01T10:10:00.000Z",
            role: "assistant",
          } as DashboardConversationMessage,
        ],
      ],
    ];
    const stats = computeResponseTimeStats(entries);
    expect(stats.avg).toBe(10);
    expect(stats.median).toBe(10);
    expect(stats.max).toBe(10);
  });
});
