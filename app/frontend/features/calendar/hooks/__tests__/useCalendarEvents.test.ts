import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Reservation } from "@/entities/event";
import { useCalendarEvents } from "../useCalendarEvents";

// Mock all dependencies
vi.mock("@shared/libs/backend", () => ({
  callPythonBackend: vi.fn(),
}));

vi.mock("../useCalendarReservations", () => ({
  useCalendarReservationsForPeriod: vi.fn(),
}));

vi.mock("../useCalendarConversationEvents", () => ({
  useCalendarConversationEventsForPeriod: vi.fn(),
}));

vi.mock("../useCalendarVacations", () => ({
  useCalendarVacations: vi.fn(),
}));

vi.mock("../useCalendarSlidingWindow", () => ({
  useCalendarSlidingWindow: vi.fn(() => ({
    currentPeriodKey: "2025-11",
    prefetchPeriods: ["2025-11"],
  })),
}));

vi.mock("../useCalendarWebSocketInvalidation", () => ({
  useCalendarWebSocketInvalidation: vi.fn(),
}));

vi.mock("@/features/reservations", () => ({
  getReservationEventProcessor: vi.fn(() => ({
    generateCalendarEvents: vi.fn(
      (
        _reservations: Record<string, Reservation[]>,
        _conversations: Record<string, unknown[]>,
        _options: unknown
      ) => {
        // Mock event processor - return empty array for now
        return [];
      }
    ),
  })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

describe("useCalendarEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and process events for current period", async () => {
    const mockReservations: Record<string, Reservation[]> = {
      "1234567890": [
        {
          customer_id: "1234567890",
          date: "2025-11-15",
          time_slot: "10:00",
          customer_name: "Test Customer",
          type: 0,
        },
      ],
    };

    const { useCalendarReservationsForPeriod } = await import(
      "../useCalendarReservations"
    );
    const { useCalendarConversationEventsForPeriod } = await import(
      "../useCalendarConversationEvents"
    );
    const { useCalendarVacations } = await import("../useCalendarVacations");

    vi.mocked(useCalendarReservationsForPeriod).mockReturnValue({
      data: mockReservations,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useCalendarConversationEventsForPeriod).mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useCalendarVacations).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () =>
        useCalendarEvents({
          freeRoam: false,
          isLocalized: false,
          currentView: "dayGridMonth",
          currentDate: new Date("2025-11-15"),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it("should handle freeRoam mode correctly", async () => {
    const { useCalendarReservationsForPeriod } = await import(
      "../useCalendarReservations"
    );
    const { useCalendarConversationEventsForPeriod } = await import(
      "../useCalendarConversationEvents"
    );
    const { useCalendarVacations } = await import("../useCalendarVacations");

    vi.mocked(useCalendarReservationsForPeriod).mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useCalendarConversationEventsForPeriod).mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useCalendarVacations).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(
      () =>
        useCalendarEvents({
          freeRoam: true,
          isLocalized: false,
          currentView: "dayGridMonth",
          currentDate: new Date("2025-11-15"),
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should call with freeRoam=true
    expect(useCalendarReservationsForPeriod).toHaveBeenCalledWith({
      periodKey: expect.any(String),
      fromDate: expect.any(String),
      toDate: expect.any(String),
      freeRoam: true,
    });
  });
});
