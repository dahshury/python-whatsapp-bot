import React from "react";
import type * as RPNInput from "react-phone-number-input";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import type { PhoneGroup } from "@/shared/libs/phone/phone-groups";
import type { DateRangeFilter } from "./useDateRangeFilter";
import type { RegistrationStatus } from "./useRegistrationFilter";

export function usePhoneFiltering(
  groups: PhoneGroup<IndexedPhoneOption>[],
  countryFilter: RPNInput.Country | undefined,
  dateRangeFilters: DateRangeFilter[] = [],
  registrationFilter?: RegistrationStatus
) {
  const filteredGroups = React.useMemo(() => {
    let result = groups;

    // Filter by country
    if (countryFilter) {
      const target = countryFilter as unknown as string;
      result = result
        .map((group) => ({
          ...group,
          items: group.items.filter((option) => {
            const optionCountry =
              (option as unknown as { __country?: string }).__country ||
              (option as unknown as { country?: string }).country;
            return optionCountry === target;
          }),
        }))
        .filter((group) => group.items.length > 0);
    }

    // Filter by date ranges (can have multiple filters)
    if (dateRangeFilters.length > 0) {
      result = result
        .map((group) => ({
          ...group,
          items: group.items.filter((option) => {
            // All active filters must pass (AND logic)
            return dateRangeFilters.every((filter) => {
              const { type, range } = filter;
              const { from, to } = range;

              if (!(from || to)) {
                return true;
              }

              if (type === "messages") {
                const lastMessageAt = option.lastMessageAt;
                if (!lastMessageAt) {
                  return false;
                }
                // Handle both number (timestamp) and Date
                const messageDate =
                  typeof lastMessageAt === "number"
                    ? new Date(lastMessageAt)
                    : new Date(lastMessageAt);

                // Normalize to start of day for comparison
                const messageDateOnly = new Date(
                  messageDate.getFullYear(),
                  messageDate.getMonth(),
                  messageDate.getDate()
                );
                if (Number.isNaN(messageDateOnly.getTime())) {
                  return false;
                }

                if (from) {
                  const fromDateOnly = new Date(
                    from.getFullYear(),
                    from.getMonth(),
                    from.getDate()
                  );
                  if (messageDateOnly < fromDateOnly) {
                    return false;
                  }
                }
                if (to) {
                  const toDateOnly = new Date(
                    to.getFullYear(),
                    to.getMonth(),
                    to.getDate()
                  );
                  if (messageDateOnly > toDateOnly) {
                    return false;
                  }
                }
                return true;
              }
              if (type === "reservations") {
                const lastReservationAt = option.lastReservationAt;
                if (!lastReservationAt) {
                  return false;
                }
                const reservationDate = new Date(lastReservationAt);
                if (Number.isNaN(reservationDate.getTime())) {
                  return false;
                }
                const reservationDateOnly = new Date(
                  reservationDate.getFullYear(),
                  reservationDate.getMonth(),
                  reservationDate.getDate()
                );
                if (from) {
                  const fromDateOnly = new Date(
                    from.getFullYear(),
                    from.getMonth(),
                    from.getDate()
                  );
                  if (reservationDateOnly < fromDateOnly) {
                    return false;
                  }
                }
                if (to) {
                  const toDateOnly = new Date(
                    to.getFullYear(),
                    to.getMonth(),
                    to.getDate()
                  );
                  if (reservationDateOnly > toDateOnly) {
                    return false;
                  }
                }
                return true;
              }
              return true;
            });
          }),
        }))
        .filter((group) => group.items.length > 0);
    }

    // Filter by registration status
    if (registrationFilter) {
      result = result
        .map((group) => ({
          ...group,
          items: group.items.filter((option) => {
            // Check if customer has a name different from their phone number
            const hasCustomName = Boolean(
              option.name &&
                option.name.trim() !== "" &&
                option.name !== option.number &&
                option.name !== option.displayNumber &&
                // Exclude names that are just the phone number without formatting
                !option.number.includes(option.name.replace(/\s/g, ""))
            );
            if (registrationFilter === "registered") {
              return hasCustomName;
            }
            if (registrationFilter === "unknown") {
              return !hasCustomName;
            }
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0);
    }

    return result;
  }, [groups, countryFilter, dateRangeFilters, registrationFilter]);

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
