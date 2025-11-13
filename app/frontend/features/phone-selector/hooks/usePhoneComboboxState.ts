import { useMemo } from "react";
import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";
import { useBackendPhoneSearch } from "@/features/phone-selector/hooks/useBackendPhoneSearch";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import { PHONE_SEARCH_DEBOUNCE_MS } from "@/shared/libs/phone/phone-combobox.config";
import {
  buildPhoneGroups,
  type PhoneGroup,
} from "@/shared/libs/phone/phone-groups";
import { buildIndexedOptions } from "@/shared/libs/phone/phone-index";
import {
  canCreateNewPhone,
  getAddPreviewDisplay,
} from "@/shared/libs/phone/search";

export type UsePhoneComboboxStateOptions = {
  phoneOptions: PhoneOption[];
  phoneSearch: string;
  selectedPhone: string;
  country: RPNInput.Country | undefined;
  allowCreateNew: boolean;
  isLocalized: boolean;
};

/**
 * Hook to manage phone combobox state, search, and data transformation
 */
export function usePhoneComboboxState(options: UsePhoneComboboxStateOptions): {
  localIndexedOptions: IndexedPhoneOption[];
  indexedOptions: IndexedPhoneOption[];
  phoneGroups: PhoneGroup<IndexedPhoneOption>[];
  orderedPhones: IndexedPhoneOption[];
  availableCountries: Set<RPNInput.Country>;
  isSearching: boolean;
  searchError: boolean;
  canCreateNew: boolean;
  addPreviewDisplay: string;
} {
  const {
    phoneOptions,
    phoneSearch,
    selectedPhone,
    country,
    allowCreateNew,
    isLocalized: _isLocalized,
  } = options;
  // Build indexed options from provided phoneOptions for initial display
  const localIndexedOptions: IndexedPhoneOption[] = useMemo(
    () => buildIndexedOptions(phoneOptions) as IndexedPhoneOption[],
    [phoneOptions]
  );

  // Use backend search with pg_trgm when user is actively searching
  const backendSearch = useBackendPhoneSearch(
    phoneSearch,
    selectedPhone,
    PHONE_SEARCH_DEBOUNCE_MS
  );

  // Use backend search results when searching, otherwise use local options
  const isActiveSearch = phoneSearch.trim().length > 0;
  const isSearching = isActiveSearch && backendSearch.isSearching;
  const searchError = isActiveSearch && backendSearch.hasError;

  const indexedOptions = isActiveSearch
    ? backendSearch.indexedOptions
    : localIndexedOptions;

  // Extract unique countries from all phone options for country selector filtering
  const availableCountries = useMemo(() => {
    const countries = new Set<RPNInput.Country>();
    // Use both local and backend search results to get all available countries
    for (const option of localIndexedOptions) {
      if (option.country) {
        countries.add(option.country as RPNInput.Country);
      }
    }
    return countries;
  }, [localIndexedOptions]);

  const phoneGroups = useMemo(() => {
    if (isActiveSearch) {
      return backendSearch.groups;
    }
    // Build groups from local options when not searching
    return buildPhoneGroups(localIndexedOptions, {
      selectedPhone,
      recentLimit: 50,
      totalLimit: 400,
    }).groups;
  }, [
    isActiveSearch,
    backendSearch.groups,
    localIndexedOptions,
    selectedPhone,
  ]);

  const orderedPhones = useMemo(() => {
    if (isActiveSearch) {
      return backendSearch.orderedPhones;
    }
    return buildPhoneGroups(localIndexedOptions, {
      selectedPhone,
      recentLimit: 50,
      totalLimit: 400,
    }).ordered;
  }, [
    isActiveSearch,
    backendSearch.orderedPhones,
    localIndexedOptions,
    selectedPhone,
  ]);

  // Preview label for creating a new phone using the currently selected country
  const addPreviewDisplay = useMemo(
    () =>
      getAddPreviewDisplay(phoneSearch, country, (c: string) =>
        String(getCountryCallingCode(c as unknown as RPNInput.Country))
      ),
    [phoneSearch, country]
  );

  // Decide whether to show the create-new option even if there are matches
  const canCreateNew = useMemo(
    () =>
      canCreateNewPhone(
        allowCreateNew,
        phoneSearch,
        indexedOptions as IndexedPhoneOption[]
      ),
    [allowCreateNew, phoneSearch, indexedOptions]
  );

  return {
    localIndexedOptions,
    indexedOptions,
    phoneGroups,
    orderedPhones,
    availableCountries,
    isSearching,
    searchError,
    canCreateNew,
    addPreviewDisplay,
  };
}
