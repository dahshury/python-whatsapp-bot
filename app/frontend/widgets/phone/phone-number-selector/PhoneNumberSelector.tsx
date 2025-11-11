"use client";

import { i18n } from "@shared/libs/i18n";
import { Loader2 } from "lucide-react";
import React from "react";
import type { DateRange } from "react-day-picker";
import type * as RPNInput from "react-phone-number-input";
import {
  type PhoneNumberSelectorBaseProps,
  useAllContacts,
  useBackendPhoneSearch,
  useCountryFilter,
  useDateRangeFilter,
  useDisplayState,
  usePhoneFiltering,
  usePhoneSelectorMessages,
  usePhoneStats,
  useRecentContacts,
  useRegistrationFilter,
} from "@/features/phone-selector";
import {
  CountryFilter,
  CreatePhonePanel,
  CreatePhoneShortcut,
  DateRangeFilter,
  FiltersMenu,
  PhoneGroupsList,
  PhoneSelectorEmptyStates,
  PhoneSelectorError,
  PhoneSelectorPagination,
  RegistrationFilter,
} from "@/features/phone-selector/ui";
import { buildPhoneGroups } from "@/shared/libs/phone/phone-groups";
import {
  Command,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/shared/ui/command";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

export const PhoneNumberSelectorContent: React.FC<
  PhoneNumberSelectorBaseProps
> = ({
  search,
  setSearch,
  groups: _groups = [], // Deprecated - we now use React Query hooks
  selectedPhone,
  onSelect,
  canCreateNew,
  onCreateNew,
  addPreviewDisplay = "",
  isLocalized,
  allowCreateNew,
  hasError = false,
  onRetry,
  selectedRef: _selectedRef,
  isSearching: _isSearching = false, // Will be computed from React Query
}) => {
  // Fetch phone statistics from backend (all customers in database)
  const { stats: phoneStats, isLoading: isLoadingStats } = usePhoneStats();

  // Don't initialize filters until stats are loaded to prevent showing all countries
  const countryFilterHook = useCountryFilter(
    isLoadingStats ? undefined : phoneStats?.countries
  );
  const dateRangeFilterHook = useDateRangeFilter();
  const registrationFilterHook = useRegistrationFilter();
  const [isRegistrationOpen, setIsRegistrationOpen] = React.useState(false);

  // Pagination state for "all" section
  const [allContactsPage, setAllContactsPage] = React.useState(1);
  const PAGE_SIZE = 100;
  const SEARCH_DEBOUNCE_MS = 400;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setAllContactsPage(1);
  }, []);

  // Build filters for all contacts query
  const allContactsFilters = React.useMemo(() => {
    type AllContactsFiltersType = {
      country?: RPNInput.Country;
      registration?: "registered" | "unknown";
      dateRange?: {
        type: "messages" | "reservations";
        range: DateRange;
      };
    };

    const filters: AllContactsFiltersType = {};

    if (countryFilterHook.countryFilter) {
      filters.country = countryFilterHook.countryFilter;
    }

    if (registrationFilterHook.registrationFilter) {
      filters.registration = registrationFilterHook.registrationFilter;
    }

    // Date range filters - support single date selection
    const messagesFilter = dateRangeFilterHook.getFilterByType("messages");
    const reservationsFilter =
      dateRangeFilterHook.getFilterByType("reservations");

    // Check if messages filter has at least one date
    if (
      messagesFilter?.range &&
      (messagesFilter.range.from || messagesFilter.range.to)
    ) {
      filters.dateRange = {
        type: "messages",
        range: messagesFilter.range,
      };
    } else if (
      reservationsFilter?.range &&
      (reservationsFilter.range.from || reservationsFilter.range.to)
    ) {
      // Check if reservations filter has at least one date
      filters.dateRange = {
        type: "reservations",
        range: reservationsFilter.range,
      };
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [
    countryFilterHook.countryFilter,
    registrationFilterHook.registrationFilter,
    dateRangeFilterHook.getFilterByType,
  ]);

  // Fetch recent contacts (50 max) - only when not searching
  const isActiveSearch = search.trim().length > 0;
  const { contacts: recentContacts, isLoading: isLoadingRecent } =
    useRecentContacts();

  // Get recent phone numbers to exclude from "all" contacts query
  const recentPhoneNumbers = React.useMemo(
    () => recentContacts.map((c) => c.number),
    [recentContacts]
  );

  // Fetch paginated all contacts - only when not searching
  const {
    contacts: allContacts,
    pagination,
    isLoading: isLoadingAll,
  } = useAllContacts(
    allContactsPage,
    PAGE_SIZE,
    allContactsFilters,
    recentPhoneNumbers
  );

  // Use backend search when searching
  const backendSearch = useBackendPhoneSearch(
    search,
    selectedPhone,
    SEARCH_DEBOUNCE_MS
  );

  // Determine which data to use
  const isSearching = isActiveSearch && backendSearch.isSearching;
  const isLoadingContacts =
    !isActiveSearch && (isLoadingRecent || isLoadingAll);

  // Build groups from React Query data when not searching
  const phoneGroups = React.useMemo(() => {
    if (isActiveSearch) {
      // Use search results
      return backendSearch.groups;
    }

    // Check if any filter is active
    const hasActiveFilters =
      Boolean(countryFilterHook.countryFilter) ||
      Boolean(registrationFilterHook.registrationFilter) ||
      dateRangeFilterHook.dateRangeFilters.length > 0;

    // Build groups from recent + all contacts
    const allContactsCombined = [...recentContacts, ...allContacts];

    // Deduplicate (recent contacts might overlap with all contacts)
    const contactsMap = new Map<string, (typeof allContactsCombined)[0]>();
    for (const contact of allContactsCombined) {
      if (!contactsMap.has(contact.number)) {
        contactsMap.set(contact.number, contact);
      }
    }
    const uniqueContacts = Array.from(contactsMap.values());

    // Build groups
    const { groups } = buildPhoneGroups(uniqueContacts, {
      selectedPhone: selectedPhone || "",
      recentLimit: 50, // Recent section should have max 50
      totalLimit: 999_999, // High limit since we paginate (avoid Infinity for linter)
    });

    // Separate recent from all
    const recentGroup = groups.find((g) => g.key === "recent");

    // For "all" section, use paginated contacts
    // Backend already excludes recent contacts and sorts alphabetically
    const allSectionContacts = allContacts;

    // Rebuild groups with proper separation
    const finalGroups: typeof groups = [];

    // Selected group (if exists)
    const selectedGroup = groups.find((g) => g.key === "selected");
    if (selectedGroup && selectedGroup.items.length > 0) {
      finalGroups.push(selectedGroup);
    }

    // Recent group - only show on page 1 and when no filters are active
    if (
      !hasActiveFilters &&
      allContactsPage === 1 &&
      recentGroup &&
      recentGroup.items.length > 0
    ) {
      finalGroups.push(recentGroup);
    }

    // All group (paginated)
    if (allSectionContacts.length > 0) {
      finalGroups.push({
        key: "all",
        items: allSectionContacts,
      });
    }

    return finalGroups;
  }, [
    isActiveSearch,
    backendSearch.groups,
    recentContacts,
    allContacts,
    selectedPhone,
    allContactsPage,
    countryFilterHook.countryFilter,
    registrationFilterHook.registrationFilter,
    dateRangeFilterHook.dateRangeFilters,
  ]);

  // Apply filters to groups
  const { filteredGroups, flattenedFilteredOptions } = usePhoneFiltering(
    phoneGroups,
    countryFilterHook.countryFilter,
    dateRangeFilterHook.dateRangeFilters,
    registrationFilterHook.registrationFilter
  );

  const hasFilteredItems = flattenedFilteredOptions.length > 0;
  const displayState = useDisplayState(canCreateNew, hasFilteredItems, search);
  const messages = usePhoneSelectorMessages(
    isLocalized,
    addPreviewDisplay,
    search
  );

  return (
    <Command
      className="flex max-h-[min(600px,80vh)] flex-col"
      shouldFilter={false}
    >
      <CommandInput
        dir="ltr"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (canCreateNew) {
              event.preventDefault();
              event.stopPropagation();
              onCreateNew(search);
              return;
            }

            if (
              search.trim() &&
              flattenedFilteredOptions.length === 0 &&
              allowCreateNew
            ) {
              event.preventDefault();
              event.stopPropagation();
              onCreateNew(search);
              return;
            }

            try {
              const root = (event.currentTarget.closest("[cmdk-root]") ||
                event.currentTarget.parentElement) as HTMLElement | null;
              const active = root?.querySelector(
                "[cmdk-item][data-selected='true']"
              ) as HTMLElement | null;
              const selectedNumber = active?.getAttribute("data-option-number");
              if (selectedNumber) {
                event.preventDefault();
                event.stopPropagation();
                onSelect(selectedNumber);
              }
            } catch {
              // ignore keyboard handling failures
            }
          }
        }}
        onValueChange={setSearch}
        placeholder={i18n.getMessage("phone_search_placeholder", isLocalized)}
        value={search}
      />
      {/* Filters bar */}
      {isLoadingStats ? (
        <div className="flex items-center justify-center border-b p-4">
          <Loader2 className="mr-2 size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">
            {i18n.getMessage("phone_loading_filters", isLocalized) ||
              "Loading filters..."}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 border-b px-1.5 py-[3.072px]">
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {countryFilterHook.countryFilter && (
              <CountryFilter
                countryFilter={countryFilterHook.countryFilter}
                countryFilterRef={countryFilterHook.countryFilterRef}
                countryOptions={countryFilterHook.countryOptions}
                countrySearch={countryFilterHook.countrySearch}
                getCountryName={countryFilterHook.getCountryName}
                handleCountryFilterSelect={
                  countryFilterHook.handleCountryFilterSelect
                }
                handleRemoveCountryFilter={
                  countryFilterHook.handleRemoveCountryFilter
                }
                isCountryOpen={countryFilterHook.isCountryOpen}
                isLocalized={isLocalized}
                setCountrySearch={countryFilterHook.setCountrySearch}
                setIsCountryOpen={countryFilterHook.setIsCountryOpen}
              />
            )}
            {dateRangeFilterHook.dateRangeFilters.map((filter) => (
              <DateRangeFilter
                dateRangeFilter={filter}
                formatDateRangeLabel={dateRangeFilterHook.formatDateRangeLabel}
                key={filter.type}
                onRemove={() =>
                  dateRangeFilterHook.handleRemoveDateRangeFilter(filter.type)
                }
              />
            ))}
            {registrationFilterHook.registrationFilter && (
              <RegistrationFilter
                getRegistrationLabel={
                  registrationFilterHook.getRegistrationLabel
                }
                handleRegistrationFilterSelect={
                  registrationFilterHook.handleRegistrationFilterSelect
                }
                handleRemoveRegistrationFilter={
                  registrationFilterHook.handleRemoveRegistrationFilter
                }
                isLocalized={isLocalized}
                isRegistrationOpen={isRegistrationOpen}
                registrationFilter={registrationFilterHook.registrationFilter}
                {...(phoneStats?.registration
                  ? { registrationStats: phoneStats.registration }
                  : {})}
                setIsRegistrationOpen={setIsRegistrationOpen}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <FiltersMenu
              countryOptions={countryFilterHook.countryOptions}
              countrySearch={countryFilterHook.countrySearch}
              getFilterByType={dateRangeFilterHook.getFilterByType}
              handleCountryFilterSelect={
                countryFilterHook.handleCountryFilterSelect
              }
              handleRegistrationFilterSelect={
                registrationFilterHook.handleRegistrationFilterSelect
              }
              isLocalized={isLocalized}
              onDateRangeSelect={
                dateRangeFilterHook.handleDateRangeFilterSelect
              }
              {...(countryFilterHook.countryFilter
                ? { countryFilter: countryFilterHook.countryFilter }
                : {})}
              {...(registrationFilterHook.registrationFilter
                ? {
                    registrationFilter:
                      registrationFilterHook.registrationFilter,
                  }
                : {})}
              {...(phoneStats?.registration
                ? { registrationStats: phoneStats.registration }
                : {})}
              setCountrySearch={countryFilterHook.setCountrySearch}
            />
          </div>
        </div>
      )}

      <CommandList className="min-h-[200px] flex-1 overflow-y-auto" dir="ltr">
        <ThemedScrollbar className="h-full min-h-[250px]" rtl={false}>
          {(isSearching || isLoadingContacts) && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground text-sm">
                {i18n.getMessage("searching", isLocalized) || "Loading..."}...
              </span>
            </div>
          )}
          {!(isSearching || isLoadingContacts) && hasError && (
            <PhoneSelectorError
              hasError={hasError}
              isLocalized={isLocalized}
              onRetry={onRetry}
            />
          )}
          {!(isSearching || isLoadingContacts || hasError) && (
            <div>
              <CreatePhonePanel
                addButtonLabel={messages.addButtonLabel}
                addNewDescription={messages.addNewDescription}
                addNewTitle={messages.addNewTitle}
                onCreateNew={onCreateNew}
                previewDisplay={messages.previewDisplay}
                previewFallback={messages.previewFallback}
                search={search}
                showCreatePanel={displayState.showCreatePanel}
              />

              <CreatePhoneShortcut
                addInlineHint={messages.addInlineHint}
                addInlineTitle={messages.addInlineTitle}
                onCreateNew={onCreateNew}
                previewDisplay={messages.previewDisplay}
                previewFallback={messages.previewFallback}
                search={search}
                showCreateShortcut={displayState.showCreateShortcut}
              />

              <PhoneSelectorEmptyStates
                isLocalized={isLocalized}
                showNoData={displayState.showNoData}
                showNoResults={displayState.showNoResults}
              />

              {hasFilteredItems && (
                <PhoneGroupsList
                  allHeading={messages.allHeading}
                  {...(pagination?.total
                    ? { allTotalCount: pagination.total }
                    : {})}
                  filteredGroups={filteredGroups}
                  onSelect={onSelect}
                  recentHeading={messages.recentHeading}
                  selectedHeading={messages.selectedHeading}
                  selectedPhone={selectedPhone || ""}
                />
              )}
            </div>
          )}
        </ThemedScrollbar>
      </CommandList>

      {/* Pagination footer - only show when not searching and have pagination */}
      {(() => {
        if (isActiveSearch || isLoadingContacts || !pagination) {
          return null;
        }
        if (pagination.total_pages <= 1) {
          return null;
        }
        return (
          <>
            <CommandSeparator />
            <div className="p-1">
              <PhoneSelectorPagination
                currentPage={allContactsPage}
                onPageChange={setAllContactsPage}
                totalPages={pagination.total_pages}
              />
            </div>
          </>
        );
      })()}
    </Command>
  );
};
