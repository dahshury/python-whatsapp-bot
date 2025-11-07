import { useQuery } from "@tanstack/react-query";
import React from "react";
import type { DateRange } from "react-day-picker";
import type * as RPNInput from "react-phone-number-input";
import { parsePhoneNumber } from "react-phone-number-input";
import { callPythonBackend } from "@/shared/libs/backend";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import type { RegistrationStatus } from "./useRegistrationFilter";

type PhoneContactResult = {
  wa_id: string;
  customer_name: string | null;
  last_message_at: string | null;
  last_reservation_at: string | null;
  similarity?: number;
};

type PaginationInfo = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type AllContactsFilters = {
  country?: RPNInput.Country;
  registration?: RegistrationStatus;
  dateRange?: {
    type: "messages" | "reservations";
    range: DateRange;
  };
};

/**
 * Hook to fetch all contacts with pagination.
 * Supports filtering by country, registration status, and date range.
 */
export function useAllContacts(
  page: number,
  pageSize = 100,
  filters?: AllContactsFilters,
  excludePhoneNumbers?: string[]
) {
  const filterKey = React.useMemo(() => {
    if (!filters) {
      return null;
    }
    return JSON.stringify({
      country: filters.country,
      registration: filters.registration,
      dateRange: filters.dateRange
        ? {
            type: filters.dateRange.type,
            from: filters.dateRange.range.from?.toISOString(),
            to: filters.dateRange.range.to?.toISOString(),
          }
        : null,
    });
  }, [filters]);

  const excludeKey = React.useMemo(
    () => (excludePhoneNumbers?.length ? excludePhoneNumbers.join(",") : null),
    [excludePhoneNumbers]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["phone-all", page, pageSize, filterKey, excludeKey],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filters?.country) {
        params.append("country", filters.country);
      }
      if (filters?.registration) {
        params.append("registration", filters.registration);
      }
      if (filters?.dateRange) {
        params.append("date_range_type", filters.dateRange.type);
        if (filters.dateRange.range.from) {
          params.append(
            "date_from",
            filters.dateRange.range.from.toISOString()
          );
        }
        if (filters.dateRange.range.to) {
          params.append("date_to", filters.dateRange.range.to.toISOString());
        }
      }
      if (excludePhoneNumbers && excludePhoneNumbers.length > 0) {
        params.append("exclude", excludePhoneNumbers.join(","));
      }

      const result = await callPythonBackend<{
        success: boolean;
        data: PhoneContactResult[];
        pagination: PaginationInfo;
      }>(`/phone/all?${params.toString()}`);

      if (!result || result.success === false) {
        throw new Error("Failed to fetch contacts");
      }

      return result;
    },
    staleTime: 30_000, // Cache for 30 seconds
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Convert to IndexedPhoneOption format
  const indexedOptions: IndexedPhoneOption[] = React.useMemo(
    () =>
      (data?.data || []).map((result) => {
        const phoneNumber = result.wa_id.startsWith("+")
          ? result.wa_id
          : `+${result.wa_id}`;

        // Parse phone to extract country
        let country: RPNInput.Country = "US";
        try {
          const parsed = parsePhoneNumber(phoneNumber);
          country = (parsed?.country as RPNInput.Country) || "US";
        } catch {
          // Keep default
        }

        const name = result.customer_name || phoneNumber;
        const lastMessageAt = result.last_message_at
          ? new Date(result.last_message_at).getTime()
          : null;
        const lastReservationAt = result.last_reservation_at
          ? new Date(result.last_reservation_at).getTime()
          : null;

        return {
          number: phoneNumber,
          name,
          country,
          label: name,
          id: result.wa_id,
          displayNumber: phoneNumber,
          lastMessageAt,
          lastReservationAt,
          __normalizedNumber: result.wa_id.replace(/[\s\-+]/g, ""),
          __searchName: name.toLowerCase(),
          __searchLabel: name.toLowerCase(),
          __country: country,
        };
      }),
    [data?.data]
  );

  return {
    contacts: indexedOptions,
    pagination: data?.pagination,
    isLoading,
    hasError: Boolean(error),
  };
}
