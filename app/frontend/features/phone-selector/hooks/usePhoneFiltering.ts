import React from "react";
import type * as RPNInput from "react-phone-number-input";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import type { PhoneGroup } from "@/shared/libs/phone/phone-groups";
import type { DateRangeFilter } from "./useDateRangeFilter";
import type { RegistrationStatus } from "./useRegistrationFilter";

export function usePhoneFiltering(
  groups: PhoneGroup<IndexedPhoneOption>[],
  _countryFilter: RPNInput.Country | undefined,
  _dateRangeFilters: DateRangeFilter[] = [],
  _registrationFilter?: RegistrationStatus
) {
  const filteredGroups = React.useMemo(() => {
    const result = groups;

    // NOTE: Country, registration, and date range filters are now handled by the backend
    // via useAllContacts hook. This hook is kept for backward compatibility and
    // potential client-side filtering of search results, but filters are no longer
    // applied here to avoid double-filtering already-filtered backend results.

    // The backend query (useAllContacts) already filters by:
    // - country
    // - registration status
    // - date ranges (messages/reservations)
    //
    // Applying filters here would be redundant and incorrect since:
    // 1. lastMessageAt/lastReservationAt are LATEST timestamps, not necessarily in range
    // 2. Double-filtering would exclude valid results

    // If filters are needed for non-paginated data (e.g., search results),
    // they should be handled by the backend search endpoint instead.

    return result;
  }, [groups]);

  const flattenedFilteredOptions = React.useMemo(
    () =>
      filteredGroups.reduce<IndexedPhoneOption[]>(
        (acc, group) => acc.concat(group.items),
        []
      ),
    [filteredGroups]
  );

  return {
    filteredGroups,
    flattenedFilteredOptions,
  };
}
