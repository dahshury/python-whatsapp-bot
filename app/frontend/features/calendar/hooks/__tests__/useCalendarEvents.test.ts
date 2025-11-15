import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/entities/event";
import { useCalendarEvents } from "../useCalendarEvents";

// Mock the new hooks
vi.mock("../useCalendarEventsData", () => ({
  useCalendarEventsData: vi.fn(),
}));

vi.mock("../useCalendarEventStateMachine", () => ({
  useCalendarEventStateMachine: vi.fn(),
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
    const mockEvents: CalendarEvent[] = [
      {
        id: "event-1",
        title: "Test Event",
        start: new Date("2025-11-15T10:00:00"),
        extendedProps: {},
      },
    ];

    const { useCalendarEventsData } = await import("../useCalendarEventsData");
    const { useCalendarEventStateMachine } = await import(
      "../useCalendarEventStateMachine"
    );

    vi.mocked(useCalendarEventsData).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fingerprint: "test-fingerprint",
    });

    vi.mocked(useCalendarEventStateMachine).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      lastUpdated: new Date(),
      refetchEvents: vi.fn(),
      invalidateCache: vi.fn(),
      refreshData: vi.fn(),
      addEvent: vi.fn(),
      updateEvent: vi.fn(),
      removeEvent: vi.fn(),
    });

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
    expect(result.current.events).toEqual(mockEvents);
  });

  it("should handle freeRoam mode correctly", async () => {
    const { useCalendarEventsData } = await import("../useCalendarEventsData");
    const { useCalendarEventStateMachine } = await import(
      "../useCalendarEventStateMachine"
    );

    vi.mocked(useCalendarEventsData).mockReturnValue({
      events: [],
      loading: false,
      error: null,
      fingerprint: "test-fingerprint",
    });

    vi.mocked(useCalendarEventStateMachine).mockReturnValue({
      events: [],
      loading: false,
      error: null,
      lastUpdated: new Date(),
      refetchEvents: vi.fn(),
      invalidateCache: vi.fn(),
      refreshData: vi.fn(),
      addEvent: vi.fn(),
      updateEvent: vi.fn(),
      removeEvent: vi.fn(),
    });

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

    // Should call useCalendarEventsData with freeRoam=true
    expect(useCalendarEventsData).toHaveBeenCalledWith({
      freeRoam: true,
      isLocalized: false,
      currentView: "dayGridMonth",
      currentDate: expect.any(Date),
      excludeConversations: false,
      enabled: true,
    });
  });
});
