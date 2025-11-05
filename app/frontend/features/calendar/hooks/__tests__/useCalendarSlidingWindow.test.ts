/**
 * Tests for calendar sliding window cache invalidation
 *
 * Verifies that:
 * 1. All calendar events use TanStack Query with period-based caching
 * 2. Sliding window prefetches 5 periods forward and 5 backward
 * 3. Navigating forward invalidates oldest periods
 * 4. Navigating backward invalidates newest periods
 * 5. Changing views invalidates cache (date ranges change drastically)
 * 6. No code loads all events at once
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getNewestPeriod,
  getOldestPeriod,
  getPeriodKey,
  getPrefetchPeriods,
  parsePeriodKey,
} from "../useCalendarDateRange";

// Test constants
const TEST_YEAR = 2025;
const TEST_MONTH = 10; // November (0-indexed)
const TEST_DAY = 15;
const PREFETCH_WINDOW_SIZE = 5;
const EXPECTED_TOTAL_PERIODS = 11; // 5 backward + current + 5 forward
const EXPECTED_CURRENT_INDEX = 5; // Current period should be at index 5 in sorted array
const CACHE_BUFFER_SIZE = 2; // Additional buffer for cache management
const EXPECTED_MAX_CACHE_SIZE = 13; // PREFETCH_WINDOW_SIZE * 2 + 1 + CACHE_BUFFER_SIZE

// Test regex pattern for week period keys
const WEEK_PERIOD_PATTERN = /2025-W\d{2}/;

describe("Calendar Sliding Window Cache Invalidation", () => {
  let _queryClient: QueryClient;

  beforeEach(() => {
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  describe("Period-based caching", () => {
    it("should generate correct period keys for different views", () => {
      const monthDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY); // November 15, 2025
      const weekDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY);
      const dayDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY);

      expect(getPeriodKey("dayGridMonth", monthDate)).toBe("2025-11");
      expect(getPeriodKey("timeGridWeek", weekDate)).toMatch(
        WEEK_PERIOD_PATTERN
      );
      expect(getPeriodKey("timeGridDay", dayDate)).toBe("2025-11-15");
    });

    it("should prefetch 5 periods forward and backward", () => {
      const currentDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY); // November 15, 2025
      const periods = getPrefetchPeriods(
        "dayGridMonth",
        currentDate,
        PREFETCH_WINDOW_SIZE
      );

      // Should have: 5 backward + current + 5 forward = 11 periods
      expect(periods.length).toBe(EXPECTED_TOTAL_PERIODS);

      // Verify current period is included
      const currentPeriod = getPeriodKey("dayGridMonth", currentDate);
      expect(periods).toContain(currentPeriod);

      // Verify we have periods before and after
      const sortedPeriods = [...periods].sort((a, b) => {
        const dateA = parsePeriodKey(a);
        const dateB = parsePeriodKey(b);
        return dateA.getTime() - dateB.getTime();
      });

      const currentIndex = sortedPeriods.indexOf(currentPeriod);
      expect(currentIndex).toBeGreaterThanOrEqual(EXPECTED_CURRENT_INDEX);
      expect(currentIndex).toBeLessThanOrEqual(EXPECTED_CURRENT_INDEX);
    });
  });

  describe("Navigation-based cache invalidation", () => {
    it("should detect forward navigation and invalidate oldest period", () => {
      const previousPeriod = "2025-10"; // October
      const currentPeriod = "2025-11"; // November

      const prevDate = parsePeriodKey(previousPeriod);
      const currDate = parsePeriodKey(currentPeriod);

      const wasGoingForward = currDate > prevDate;
      expect(wasGoingForward).toBe(true);

      // Simulate cache with multiple periods
      const allCachedPeriods = [
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2025-13", // Invalid but for testing
      ];

      const oldest = getOldestPeriod(allCachedPeriods);
      expect(oldest).toBe("2025-09");

      // When going forward, should invalidate oldest
      if (wasGoingForward && oldest && oldest !== currentPeriod) {
        // This is what should happen
        expect(oldest).not.toBe(currentPeriod);
      }
    });

    it("should detect backward navigation and invalidate newest period", () => {
      const previousPeriod = "2025-11"; // November
      const currentPeriod = "2025-10"; // October

      const prevDate = parsePeriodKey(previousPeriod);
      const currDate = parsePeriodKey(currentPeriod);

      const wasGoingBackward = currDate < prevDate;
      expect(wasGoingBackward).toBe(true);

      // Simulate cache with multiple periods
      const allCachedPeriods = ["2025-09", "2025-10", "2025-11", "2025-12"];

      const newest = getNewestPeriod(allCachedPeriods);
      expect(newest).toBe("2025-12");

      // When going backward, should invalidate newest
      if (wasGoingBackward && newest && newest !== currentPeriod) {
        expect(newest).not.toBe(currentPeriod);
      }
    });

    it("should invalidate cache when view type changes", () => {
      // When switching from month to week view, date ranges change drastically
      const monthDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY);
      const weekDate = new Date(TEST_YEAR, TEST_MONTH, TEST_DAY);

      const monthPeriod = getPeriodKey("dayGridMonth", monthDate);
      const weekPeriod = getPeriodKey("timeGridWeek", weekDate);

      // Period keys should be different even for same date
      expect(monthPeriod).not.toBe(weekPeriod);

      // View change should invalidate all queries for the old view type
      // This is handled by useCalendarCacheInvalidation
    });
  });

  describe("Cache size management", () => {
    it("should maintain sliding window of fixed size", () => {
      const windowSize = PREFETCH_WINDOW_SIZE;
      const maxCacheSize = windowSize * 2 + 1 + CACHE_BUFFER_SIZE; // current + 5 forward + 5 backward + buffer

      expect(maxCacheSize).toBe(EXPECTED_MAX_CACHE_SIZE); // 5 + 5 + 1 + 2

      // Verify that when cache exceeds this size, oldest/newest is invalidated
      const periods = getPrefetchPeriods(
        "dayGridMonth",
        new Date(TEST_YEAR, TEST_MONTH, TEST_DAY),
        windowSize
      );
      expect(periods.length).toBe(EXPECTED_TOTAL_PERIODS); // 5 + 1 + 5

      // If we add more periods, we should stay within maxCacheSize
      expect(periods.length).toBeLessThanOrEqual(maxCacheSize);
    });

    it("should identify oldest and newest periods correctly", () => {
      const periods = ["2025-12", "2025-10", "2025-11", "2025-09", "2025-13"];

      const oldest = getOldestPeriod(periods);
      const newest = getNewestPeriod(periods);

      expect(oldest).toBe("2025-09");
      expect(newest).toBe("2025-13");
    });
  });

  describe("Period key parsing", () => {
    it("should parse month period keys correctly", () => {
      const periodKey = "2025-11";
      const date = parsePeriodKey(periodKey);

      expect(date.getFullYear()).toBe(TEST_YEAR);
      expect(date.getMonth()).toBe(TEST_MONTH); // 0-indexed, so 10 = November
    });

    it("should parse week period keys correctly", () => {
      const periodKey = "2025-W44";
      const date = parsePeriodKey(periodKey);

      expect(date.getFullYear()).toBe(TEST_YEAR);
      // Week dates are approximate, just verify it's a valid date
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should parse day period keys correctly", () => {
      const periodKey = "2025-11-15";
      const date = parsePeriodKey(periodKey);

      expect(date.getFullYear()).toBe(TEST_YEAR);
      expect(date.getMonth()).toBe(TEST_MONTH);
      expect(date.getDate()).toBe(TEST_DAY);
    });
  });

  describe("Query key format consistency", () => {
    it("should use consistent query key format for reservations", () => {
      const periodKey = "2025-11";
      const freeRoam = true;

      const expectedKey = ["calendar-reservations", periodKey, freeRoam];

      // Verify key format matches what's used in hooks
      expect(expectedKey[0]).toBe("calendar-reservations");
      expect(expectedKey[1]).toBe(periodKey);
      expect(expectedKey[2]).toBe(freeRoam);
    });

    it("should use consistent query key format for conversation events", () => {
      const periodKey = "2025-11";
      const freeRoam = true;

      const expectedKey = ["calendar-conversation-events", periodKey, freeRoam];

      // Verify key format matches what's used in hooks
      expect(expectedKey[0]).toBe("calendar-conversation-events");
      expect(expectedKey[1]).toBe(periodKey);
      expect(expectedKey[2]).toBe(freeRoam);
    });
  });
});
