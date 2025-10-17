import { PHONE_VISIBLE_LIMIT_NO_SEARCH } from "@shared/config/phone";
import { useDebouncedValue } from "@shared/libs/hooks/use-debounced-value";
import { usePhonePopoverWidth } from "@shared/libs/hooks/use-phone-popover-width";
import { useScrollSelectedIntoView } from "@shared/libs/hooks/use-scroll-selected-into-view";
import { useRef, useState } from "react";
import type * as RPNInput from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { usePhoneCreateNew } from "./use-phone-create-new";
import { usePhoneFiltering } from "./use-phone-filtering";
import { usePhoneIndex } from "./use-phone-index";
import { useVisiblePhones } from "./use-visible-phones";

type UsePhoneSelectorPopoverProps = {
	phoneOptions: PhoneOption[];
	selectedPhone: string;
	country: RPNInput.Country | undefined;
	allowCreateNew?: boolean;
};

// Debounce delay for phone search input (milliseconds)
const PHONE_SEARCH_DEBOUNCE_MS = 120;

/**
 * Centralized hook for phone selector popover logic.
 * Used by both GridPhoneCombobox and phone-combobox to avoid duplication.
 */
export function usePhoneSelectorPopover({
	phoneOptions,
	selectedPhone,
	country,
	allowCreateNew = false,
}: UsePhoneSelectorPopoverProps) {
	// Search state for dropdown popover
	const [phoneSearch, setPhoneSearch] = useState("");
	const debouncedPhoneSearch = useDebouncedValue(
		phoneSearch,
		PHONE_SEARCH_DEBOUNCE_MS
	);

	// Build indexed options + fuse for filtering (names first, numbers also supported)
	const { indexedOptions } = usePhoneIndex(phoneOptions);

	const { filteredPhones, isSearching, hasError, retry, addEphemeralOption } =
		usePhoneFiltering({
			search: debouncedPhoneSearch,
			indexedOptions,
		});

	const VISIBLE_LIMIT_NO_SEARCH = PHONE_VISIBLE_LIMIT_NO_SEARCH;
	const { visiblePhones, visiblePhonesWithSelectedFirst } = useVisiblePhones({
		filteredPhones: filteredPhones as unknown as IndexedPhoneOption[],
		selectedPhone,
		search: debouncedPhoneSearch,
		limit: VISIBLE_LIMIT_NO_SEARCH,
	});

	const { addPreviewDisplay, canCreateNew } = usePhoneCreateNew({
		search: debouncedPhoneSearch,
		country: country as unknown as RPNInput.Country,
		allowCreateNew,
		indexedOptions,
	});

	// Dropdown popover state + refs
	const {
		selectedRef: selectedPhoneRef,
		isOpen: isPhoneOpen,
		setIsOpen: setIsPhoneOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();

	// Trigger ref and width via shared hook
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const dropdownWidth = usePhonePopoverWidth({
		isOpen: isPhoneOpen,
		triggerRef,
		visiblePhones,
	});

	return {
		// Search state
		phoneSearch,
		setPhoneSearch,
		debouncedPhoneSearch,

		// Indexed and filtered options
		indexedOptions,
		filteredPhones,
		visiblePhones,
		visiblePhonesWithSelectedFirst,

		// Search/loading states
		isSearching,
		hasError,
		retry,

		// Create new
		addPreviewDisplay,
		canCreateNew,
		addEphemeralOption,

		// Popover state
		selectedPhoneRef,
		isPhoneOpen,
		setIsPhoneOpen,
		triggerRef,
		dropdownWidth,
	};
}
