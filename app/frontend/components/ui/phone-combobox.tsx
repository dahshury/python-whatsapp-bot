import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import type * as RPNInput from "react-phone-number-input";
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from "react-phone-number-input";
// ThemedScrollbar is used inside sub-components
import { Button } from "@/components/ui/button";
import { PhoneCountrySelector } from "@/components/ui/phone/phone-country-selector";
import { PhoneNumberSelectorContent } from "@/components/ui/phone/phone-number-selector";
// (Command UI moved into PhoneCountrySelector/PhoneNumberSelectorContent)
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useScrollSelectedIntoView } from "@/hooks/useScrollSelectedIntoView";
import { useShrinkToFitText } from "@/hooks/useShrinkToFitText";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_COUNTRY } from "@/lib/phone/config";
import { CALLING_CODES_SORTED } from "@/lib/phone/countries";
import { createNewPhoneOption as createNewPhoneOptionSvc } from "@/lib/services/phone/phone-options.service";
import {
	canCreateNewPhone,
	createPhoneFuseIndex,
	filterPhones,
	getAddPreviewDisplay,
	getVisiblePhones,
} from "@/lib/services/phone/phone-search.service";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/lib/services/phone/validation.service";
import { getSizeClasses } from "@/lib/ui/size";
import { cn } from "@/lib/utils";
import {
	formatNumberForDisplay,
	getCountryFromPhone,
} from "@/lib/utils/phone-utils";
import type { PhoneOption } from "@/types/phone";

// (types and helpers moved to shared modules)

interface PhoneComboboxProps {
	value?: string;
	onChange?: (value: string) => void;
	onCustomerSelect?: (phone: string, customerName: string) => void;
	className?: string;
	placeholder?: string;
	phoneOptions: PhoneOption[];
	allowCreateNew?: boolean;
	uncontrolled?: boolean;
	disabled?: boolean;
	showCountrySelector?: boolean;
	showNameAndPhoneWhenClosed?: boolean;

	size?: "sm" | "default" | "lg";
	onMouseEnter?: (e: React.MouseEvent) => void;
	onMouseLeave?: (e: React.MouseEvent) => void;
	/**
	 * When true, the closed combobox text will shrink to fit available width
	 * instead of growing the component width. Default is false.
	 */
	shrinkTextToFit?: boolean;
	/**
	 * When true and there is no selected value, prefer showing the placeholder
	 * instead of a default +<countryCode> ... preview.
	 */
	preferPlaceholderWhenEmpty?: boolean;
}

const PhoneCombobox: React.FC<PhoneComboboxProps> = ({
	value = "",
	onChange,
	onCustomerSelect,
	className,
	placeholder = "Select a phone number",
	phoneOptions,
	allowCreateNew = false,
	uncontrolled = false,
	disabled = false,
	showCountrySelector = true,
	showNameAndPhoneWhenClosed = false,
	size: _size = "default",
	onMouseEnter,
	onMouseLeave,
	shrinkTextToFit = false,
	preferPlaceholderWhenEmpty = false,
}) => {
	const { isLocalized } = useLanguage();
	const [selectedPhone, setSelectedPhone] = React.useState<string>(value || "");
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Use centralized validation service
	const validatePhone = React.useCallback(
		(phone: string): { isValid: boolean; error?: string } => {
			return validatePhoneNumberSvc(phone);
		},
		[],
	);

	const [country, setCountry] = React.useState<RPNInput.Country | undefined>(
		DEFAULT_COUNTRY as RPNInput.Country,
	);

	const [countrySearch, setCountrySearch] = React.useState("");
	const [phoneSearch, setPhoneSearch] = React.useState("");
	const [filteredPhones, setFilteredPhones] = React.useState<PhoneOption[]>([]);

	// Build a memoized index of phone options for fast rendering and filtering
	type IndexedPhoneOption = PhoneOption & {
		displayNumber: string;
		__normalizedNumber: string;
		__searchName: string;
		__searchLabel: string;
		__country: RPNInput.Country;
	};

	const indexedOptions: IndexedPhoneOption[] = React.useMemo(() => {
		try {
			return phoneOptions.map((option) => {
				const display =
					option.displayNumber ?? formatNumberForDisplay(option.number);
				const normalizedNumber = option.number
					.replace(/[\s\-+]/g, "")
					.toLowerCase();
				const searchName = (option.name || "").toLowerCase();
				const searchLabel = (option.label || "").toLowerCase();
				// Always derive country from the phone number itself to avoid stale/mis-set option.country
				const optionCountry = getCountryFromPhone(option.number);
				return {
					...option,
					displayNumber: display,
					__normalizedNumber: normalizedNumber,
					__searchName: searchName,
					__searchLabel: searchLabel,
					__country: optionCountry,
				} as IndexedPhoneOption;
			});
		} catch {
			return phoneOptions.map((option) => ({
				...option,
				displayNumber: option.displayNumber ?? option.number,
				__normalizedNumber: option.number.replace(/[\s\-+]/g, "").toLowerCase(),
				__searchName: (option.name || "").toLowerCase(),
				__searchLabel: (option.label || "").toLowerCase(),
				__country: getCountryFromPhone(option.number),
			})) as IndexedPhoneOption[];
		}
	}, [phoneOptions]);

	// Create a fuzzy index for name/label/number display matching (language-agnostic)
	const fuse = React.useMemo(
		() => createPhoneFuseIndex(indexedOptions),
		[indexedOptions],
	);

	// Debounce search input to avoid filtering on each keystroke
	// Debounce search input
	const debouncedPhoneSearch = useDebouncedValue(phoneSearch, 120);

	// Country options are handled inside PhoneCountrySelector

	// Handle controlled vs uncontrolled behavior
	React.useEffect(() => {
		if (!uncontrolled && value !== undefined) {
			setSelectedPhone(value);
		} else if ((value === undefined || value === "") && selectedPhone === "") {
			// When uncontrolled/new usage, initialize to +<DEFAULT_COUNTRY CC> on first mount if empty
			try {
				const cc = getCountryCallingCode(DEFAULT_COUNTRY as RPNInput.Country);
				setSelectedPhone(`+${cc} `);
			} catch {
				setSelectedPhone("+");
			}
		}
	}, [value, uncontrolled, selectedPhone]);

	// Initialize country from the initial value ONCE (e.g., when editing an existing number)
	const hasInitializedCountryRef = React.useRef(false);
	React.useEffect(() => {
		if (hasInitializedCountryRef.current) return;
		const initial = (value ?? selectedPhone ?? "").trim();
		if (initial) {
			try {
				const inferred = getCountryFromPhone(initial);
				if (inferred) setCountry(inferred);
			} catch {}
		}
		hasInitializedCountryRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPhone, value]);

	// Do not auto-change country based on the typed phone value after initialization

	// Update filtered phones when search changes (fuzzy names + numeric prefix only)
	React.useEffect(() => {
		const merged = filterPhones(fuse, indexedOptions, debouncedPhoneSearch);
		setFilteredPhones(merged);
	}, [debouncedPhoneSearch, indexedOptions, fuse]);

	// Do not infer country while typing; keep the selected flag as the source of truth.

	// Limit initial render count when there is no search to speed up popover opening
	const VISIBLE_LIMIT_NO_SEARCH = 120;
	const visiblePhones: IndexedPhoneOption[] = React.useMemo(() => {
		if (!debouncedPhoneSearch) {
			return getVisiblePhones(
				filteredPhones as IndexedPhoneOption[],
				selectedPhone,
				VISIBLE_LIMIT_NO_SEARCH,
			) as IndexedPhoneOption[];
		}
		return filteredPhones as IndexedPhoneOption[];
	}, [filteredPhones, debouncedPhoneSearch, selectedPhone]);

	// Preview label for creating a new phone using the currently selected country
	const addPreviewDisplay = React.useMemo(
		() =>
			getAddPreviewDisplay(debouncedPhoneSearch, country, (c: string) =>
				String(getCountryCallingCode(c as unknown as RPNInput.Country)),
			),
		[debouncedPhoneSearch, country],
	);

	// Decide whether to show the create-new option even if there are matches
	const canCreateNew = React.useMemo(
		() =>
			canCreateNewPhone(
				allowCreateNew,
				debouncedPhoneSearch,
				indexedOptions as IndexedPhoneOption[],
			),
		[allowCreateNew, debouncedPhoneSearch, indexedOptions],
	);

	// Create a new phone number option via service
	const createNewPhoneOption = (phoneNumber: string): PhoneOption => {
		// Validate but do not block creation in UI
		validatePhone(phoneNumber);
		return createNewPhoneOptionSvc(phoneNumber, country, isLocalized);
	};

	// Handle phone selection with different behavior for controlled vs uncontrolled
	const handlePhoneSelectInternal = (phoneNumber: string) => {
		// Validate the phone number (suppress inline errors)
		validatePhone(phoneNumber);

		setSelectedPhone(phoneNumber);
		if (!uncontrolled && onChange) {
			onChange(phoneNumber);
		}
		setPhoneSearch("");
		setIsPhoneOpen(false);
	};

	// Handle creating and selecting a new phone number
	const handleCreateNewPhone = (phoneNumber: string) => {
		const newOption = createNewPhoneOption(phoneNumber);
		if (newOption) {
			// Add to filtered phones temporarily for this session
			setFilteredPhones((prev) => [newOption, ...prev]);
			handlePhoneSelectInternal(newOption.number);
		}
	};

	// For controlled mode, call onChange immediately when user selects
	const handlePhoneSelectControlled = (phoneNumber: string) => {
		// Find the customer data for auto-fill
		const selectedCustomer = phoneOptions.find(
			(option) => option.number === phoneNumber,
		);

		// When selecting an existing option, adapt country to the selected number
		try {
			const inferred = getCountryFromPhone(phoneNumber);
			if (inferred) setCountry(inferred);
		} catch {}
		if (
			selectedCustomer &&
			selectedCustomer.name !== "New Phone Number" &&
			selectedCustomer.name !== "Unknown Customer"
		) {
			// Trigger customer auto-fill if we have a real customer name
			if (onCustomerSelect) {
				onCustomerSelect(phoneNumber, selectedCustomer.name);
			}
		}

		if (!uncontrolled && onChange) {
			onChange(phoneNumber);
			setIsPhoneOpen(false);
		} else {
			handlePhoneSelectInternal(phoneNumber);
		}
	};

	const handleCountrySelect = (selectedCountry: RPNInput.Country) => {
		setCountry(selectedCountry);
		setCountrySearch("");
		setIsCountryOpen(false);

		// Re-validate current phone number when country changes (no inline errors)
		if (selectedPhone) validatePhone(selectedPhone);

		// If there's a selected phone number, convert it to the new country's format
		if (selectedPhone?.trim()) {
			let updated = false;
			try {
				// Parse the current phone number
				const phoneNumber = parsePhoneNumber(selectedPhone);
				if (phoneNumber) {
					// Get the national (local) number without country code
					const nationalNumber = String(phoneNumber.nationalNumber || "");
					// Format with the new country's calling code
					const newCountryCode = getCountryCallingCode(selectedCountry);
					if (newCountryCode) {
						const newPhoneNumber = nationalNumber
							? `+${newCountryCode}${nationalNumber}`
							: `+${newCountryCode} `;
						setSelectedPhone(newPhoneNumber);
						if (!uncontrolled && onChange) onChange(newPhoneNumber);
						updated = true;
					}
				}
			} catch {}

			if (!updated) {
				// Fallback: derive local digits by stripping existing calling code prefix
				const digits = String(selectedPhone).replace(/\D/g, "");
				let localDigits = digits;
				const matched = CALLING_CODES_SORTED.find((code) =>
					digits.startsWith(code),
				);
				if (matched) localDigits = digits.slice(matched.length);
				try {
					const newCc = getCountryCallingCode(selectedCountry);
					if (newCc) {
						const newPhoneNumber = localDigits
							? `+${newCc}${localDigits}`
							: `+${newCc} `;
						setSelectedPhone(newPhoneNumber);
						if (!uncontrolled && onChange) onChange(newPhoneNumber);
					}
				} catch {}
			}
		} else {
			// No phone yet: initialize to +[country code] to keep field non-empty
			try {
				const newCountryCode = getCountryCallingCode(selectedCountry);
				if (newCountryCode) {
					const newPhoneNumber = `+${newCountryCode} `;
					setSelectedPhone(newPhoneNumber);
					if (!uncontrolled && onChange) {
						onChange(newPhoneNumber);
					}
				}
			} catch {}
		}
	};

	// Track popover states and selected refs via hooks
	const {
		selectedRef: selectedCountryRef,
		isOpen: isCountryOpen,
		setIsOpen: setIsCountryOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();
	const {
		selectedRef: selectedPhoneRef,
		isOpen: isPhoneOpen,
		setIsOpen: setIsPhoneOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();

	// Size utilities moved to lib/ui/size

	// Shrink-to-fit measurement for closed state text
	const {
		containerRef: textContainerRef,
		textRef,
		scale: textScale,
	} = useShrinkToFitText(shrinkTextToFit);

	// Prevent hydration mismatch and show loading state
	if (!mounted) {
		return (
			<div
				className={cn(
					"flex w-full items-center rounded-md border border-input bg-background ring-offset-background",
					getSizeClasses(_size),
					className,
				)}
			>
				<span className="text-muted-foreground">Loading...</span>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col", className)} dir="ltr">
			<div className="flex">
				{/* Country Selector - only show if enabled */}
				{showCountrySelector && (
					<PhoneCountrySelector
						country={country}
						setCountry={handleCountrySelect}
						search={countrySearch}
						setSearch={setCountrySearch}
						isOpen={isCountryOpen}
						setIsOpen={setIsCountryOpen}
						selectedRef={selectedCountryRef}
						disabled={disabled}
						size={_size}
					/>
				)}

				{/* Phone Number Selector */}
				<Popover open={isPhoneOpen} onOpenChange={setIsPhoneOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							disabled={disabled}
							className={cn(
								"flex-1 w-full max-w-full overflow-hidden justify-between text-left",
								showCountrySelector
									? "rounded-s-none rounded-e-lg border-l-0"
									: "rounded-lg",
								getSizeClasses(_size),
							)}
							onMouseEnter={onMouseEnter}
							onMouseLeave={onMouseLeave}
						>
							<div
								className="flex-1 min-w-0 mr-2 overflow-hidden text-left"
								ref={textContainerRef}
							>
								<div
									ref={textRef}
									className={cn(
										"inline-flex items-center",
										shrinkTextToFit
											? "whitespace-nowrap overflow-hidden"
											: "truncate",
										!selectedPhone && "text-muted-foreground",
									)}
									style={
										shrinkTextToFit
											? {
													transform: `scale(${textScale})`,
													transformOrigin: "left center",
													willChange: "transform",
													direction: "ltr",
												}
											: { direction: "ltr" }
									}
								>
									{showNameAndPhoneWhenClosed && selectedPhone ? (
										<>
											<span
												className="text-sm text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded"
												style={{ direction: "ltr" }}
											>
												[{selectedPhone}]
											</span>
											<span className="text-sm font-medium text-foreground">
												{(() => {
													const selectedOption = phoneOptions.find(
														(option) => option.number === selectedPhone,
													);
													return (
														selectedOption?.name ||
														i18n.getMessage("phone_unknown_label", isLocalized)
													);
												})()}
											</span>
										</>
									) : (
										<span className="block w-full text-left" dir="ltr">
											{selectedPhone ||
												(preferPlaceholderWhenEmpty
													? placeholder
													: country
														? `+${getCountryCallingCode(country) || ""} ...`
														: placeholder)}
										</span>
									)}
								</div>
							</div>
							<ChevronsUpDown className="-mr-2 size-4 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className={cn("w-[25rem] p-0", "click-outside-ignore")}
						dir="ltr"
					>
						<PhoneNumberSelectorContent
							search={phoneSearch}
							setSearch={setPhoneSearch}
							visiblePhones={visiblePhones}
							selectedPhone={selectedPhone}
							onSelect={handlePhoneSelectControlled}
							canCreateNew={canCreateNew}
							onCreateNew={handleCreateNewPhone}
							addPreviewDisplay={addPreviewDisplay}
							isLocalized={isLocalized}
							selectedRef={selectedPhoneRef}
							allowCreateNew={allowCreateNew}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Inline validation is suppressed; cell-level validation will handle errors */}
		</div>
	);
};

// Flag rendering moved into sub-components

export { PhoneCombobox };
