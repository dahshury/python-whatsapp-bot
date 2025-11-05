import { format } from "date-fns";
import React from "react";
import type { DateRange } from "react-day-picker";

export type DateRangeFilterType = "messages" | "reservations";

export type DateRangeFilter = {
  type: DateRangeFilterType;
  range: DateRange;
};

export function useDateRangeFilter() {
  const [dateRangeFilters, setDateRangeFilters] = React.useState<
    DateRangeFilter[]
  >([]);

  const formatDateRangeLabel = React.useCallback(
    (filter: DateRangeFilter): string => {
      const { type, range } = filter;
      const typeLabel = type === "messages" ? "Messages" : "Reservations";
      if (range.from && range.to) {
        return `${typeLabel}: ${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd")}`;
      }
      if (range.from) {
        return `${typeLabel}: ${format(range.from, "MMM dd")}`;
      }
      return typeLabel;
    },
    []
  );

  const handleDateRangeFilterSelect = React.useCallback(
    (type: DateRangeFilterType, range?: DateRange | null) => {
      const hasRange = Boolean(range?.from || range?.to);
      if (hasRange && range) {
        setDateRangeFilters((prev) => {
          // Remove any existing filter of the same type
          const filtered = prev.filter((f) => f.type !== type);
          // Add the new filter
          return [...filtered, { type, range }];
        });
      } else {
        // If range is cleared, remove the filter of this type
        setDateRangeFilters((prev) => prev.filter((f) => f.type !== type));
      }
    },
    []
  );

  const handleRemoveDateRangeFilter = React.useCallback(
    (type: DateRangeFilterType) => {
      setDateRangeFilters((prev) => prev.filter((f) => f.type !== type));
    },
    []
  );

  const getFilterByType = React.useCallback(
    (type: DateRangeFilterType): DateRangeFilter | undefined =>
      dateRangeFilters.find((f) => f.type === type),
    [dateRangeFilters]
  );

  return {
    dateRangeFilters,
    setDateRangeFilters,
    formatDateRangeLabel,
    handleDateRangeFilterSelect,
    handleRemoveDateRangeFilter,
    getFilterByType,
  };
}
