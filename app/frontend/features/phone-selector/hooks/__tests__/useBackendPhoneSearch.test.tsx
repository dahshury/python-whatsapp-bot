/**
 * Tests for useBackendPhoneSearch hook
 * Covers searching in Arabic, English, partial matches, and fuzzy matching
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBackendPhoneSearch } from "../useBackendPhoneSearch";

// Mock fetch
global.fetch = vi.fn();

// Test constants
const MOCK_DELAY_MS = 100; // Delay for mock fetch responses in tests

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useBackendPhoneSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty results when search is empty", async () => {
    const { result } = renderHook(() => useBackendPhoneSearch("", undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.indexedOptions).toEqual([]);
      expect(result.current.groups).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });
  });

  it("should search for Arabic names", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966512345678",
          customer_name: "أحمد محمد",
          last_message_at: "2024-01-01T12:00:00",
          last_reservation_at: null,
          similarity: 0.95,
        },
        {
          wa_id: "966523456789",
          customer_name: "محمد علي",
          last_message_at: null,
          last_reservation_at: "2024-01-02T10:00:00",
          similarity: 0.85,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("محمد", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.indexedOptions.length).toBe(2);
        expect(result.current.indexedOptions[0].name).toBe("أحمد محمد");
        expect(result.current.indexedOptions[0].number).toBe("+966512345678");
      },
      { timeout: 1000 }
    );
  });

  it("should search for English names", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966534567890",
          customer_name: "John Smith",
          last_message_at: "2024-01-01T12:00:00",
          last_reservation_at: null,
          similarity: 0.98,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("John", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.indexedOptions.length).toBe(1);
        expect(result.current.indexedOptions[0].name).toBe("John Smith");
      },
      { timeout: 1000 }
    );
  });

  it("should search for partial phone numbers", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966512345678",
          customer_name: "Test User",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 0.9,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("512345", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.indexedOptions.length).toBe(1);
        expect(result.current.indexedOptions[0].number).toContain("512345");
      },
      { timeout: 1000 }
    );
  });

  it("should handle phone numbers with + prefix", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "+966512345678",
          customer_name: "Test User",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 1.0,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("+966512345678", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.indexedOptions[0].number).toBe("+966512345678");
      },
      { timeout: 1000 }
    );
  });

  it("should show loading state while searching", async () => {
    (global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, data: [] }),
              }),
            MOCK_DELAY_MS
          )
        )
    );

    const { result } = renderHook(
      () => useBackendPhoneSearch("test", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    // Initially should be loading
    expect(result.current.isSearching).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isSearching).toBe(false);
      },
      { timeout: 1000 }
    );
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("error", undefined, 0),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(
      () => {
        expect(result.current.hasError).toBe(true);
      },
      { timeout: 1000 }
    );
  });

  it("should debounce search input", async () => {
    const { rerender } = renderHook(
      ({ search }) => useBackendPhoneSearch(search, undefined),
      {
        wrapper: createWrapper(),
        initialProps: { search: "a" },
      }
    );

    // Change search multiple times quickly
    rerender({ search: "ab" });
    rerender({ search: "abc" });
    rerender({ search: "abcd" });

    // Should only call fetch once after debounce period
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 }
    );
  });

  it("should build phone groups from results", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966512345678",
          customer_name: "Recent User",
          last_message_at: new Date().toISOString(),
          last_reservation_at: null,
          similarity: 0.95,
        },
        {
          wa_id: "966523456789",
          customer_name: "Old User",
          last_message_at: "2020-01-01T12:00:00",
          last_reservation_at: null,
          similarity: 0.85,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("test", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.groups.length).toBeGreaterThan(0);
        expect(result.current.orderedPhones.length).toBe(2);
      },
      { timeout: 1000 }
    );
  });

  it("should handle results with null timestamps", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966512345678",
          customer_name: "User Without Activity",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 0.8,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("test", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        expect(result.current.indexedOptions[0].lastMessageAt).toBeNull();
        expect(result.current.indexedOptions[0].lastReservationAt).toBeNull();
      },
      { timeout: 1000 }
    );
  });

  it("should sort results by similarity", async () => {
    const mockResponse = {
      success: true,
      data: [
        {
          wa_id: "966512345678",
          customer_name: "Best Match",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 0.95,
        },
        {
          wa_id: "966523456789",
          customer_name: "Good Match",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 0.75,
        },
        {
          wa_id: "966534567890",
          customer_name: "OK Match",
          last_message_at: null,
          last_reservation_at: null,
          similarity: 0.55,
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () => useBackendPhoneSearch("test", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    await waitFor(
      () => {
        // Backend already sorts, but verify order is maintained
        expect(result.current.indexedOptions[0].name).toBe("Best Match");
        expect(result.current.indexedOptions[2].name).toBe("OK Match");
      },
      { timeout: 1000 }
    );
  });
});
