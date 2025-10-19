import { useScrollSelectedIntoView } from "@shared/libs/hooks/use-scroll-selected-into-view";
import { DEFAULT_COUNTRY } from "@shared/libs/phone/config";
import { CALLING_CODES_SORTED } from "@shared/libs/phone/countries";
import { toE164 } from "@shared/libs/phone/normalize";
import { useLanguage } from "@shared/libs/state/language-context";
import { cn } from "@shared/libs/utils";
import { getCountryFromPhone } from "@shared/libs/utils/phone-utils";
import { Button } from "@ui/button";
import { Search } from "lucide-react";
import React from "react";
import type * as RPNInput from "react-phone-number-input";
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from "react-phone-number-input";
import PhoneNumberInput from "react-phone-number-input/input";
import type { PhoneOption } from "@/entities/phone";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { ButtonGroup } from "@/shared/ui/button-group";
import { PhoneCountrySelector } from "@/shared/ui/phone/phone-country-selector";
import { PhoneNumberSelectorContent } from "@/shared/ui/phone/phone-number-selector";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/shared/validation/phone";
import { usePhoneSelectorPopover } from "@/widgets/phone/hooks/use-phone-selector-popover";

/**
 * Attempt to reformat phone number for a new country using parsed phone info
 */
function tryParseAndReformatPhone(
	current: string,
	selectedCountry: RPNInput.Country
): string | null {
	try {
		const phoneNumber = parsePhoneNumber(current);
		if (phoneNumber) {
			const nationalNumber = String(phoneNumber.nationalNumber || "");
			const newCountryCode = getCountryCallingCode(selectedCountry);
			return nationalNumber
				? `+${newCountryCode}${nationalNumber}`
				: `+${newCountryCode}`;
		}
	} catch {
		// Silently ignore errors
	}
	return null;
}

/**
 * Fallback phone reformatting using digit extraction and calling codes
 */
function tryNaivePhoneReformat(
	current: string,
	selectedCountry: RPNInput.Country
): string | null {
	try {
		const digits = current.replace(/\D/g, "");
		let localDigits = digits;
		const matched = CALLING_CODES_SORTED.find((code) =>
			digits.startsWith(code)
		);
		if (matched) {
			localDigits = digits.slice(matched.length);
		}
		const newCc = getCountryCallingCode(selectedCountry);
		return localDigits ? `+${newCc}${localDigits}` : `+${newCc}`;
	} catch {
		// Silently ignore errors
	}
	return null;
}

type GridPhoneComboboxProps = {
	value: string;
	onChange: (value: string) => void;
	phoneOptions: PhoneOption[];
	allowCreateNew?: boolean;
};

/**
 * GridPhoneCombobox - Data Grid only: renders a button group with
 * 1) Country selector (left), 2) Phone input (middle), 3) Dropdown trigger (right)
 * The dropdown lists customers' phone options and selecting fills the input.
 */
const GridPhoneCombobox: React.FC<GridPhoneComboboxProps> = ({
	value,
	onChange,
	phoneOptions,
	allowCreateNew = false,
}) => {
	const { isLocalized } = useLanguage();
	// Convert any incoming string to E.164 (+digits) required by react-phone-number-input
	const toE164Local = React.useCallback(
		(input: string): string => toE164(input),
		[]
	);

	// Keep a local selected phone in E.164, controlled by value
	const [selectedPhone, setSelectedPhone] = React.useState<string>(() =>
		toE164Local(value || "")
	);

	React.useEffect(() => {
		setSelectedPhone(toE164Local(value || ""));
	}, [value, toE164Local]);

	// Validation (no inline error rendering)
	const validatePhone = React.useCallback(
		(phone: string): { isValid: boolean; error?: string } =>
			validatePhoneNumberSvc(phone),
		[]
	);

	// Country handling
	const [country, setCountry] = React.useState<RPNInput.Country | undefined>(
		DEFAULT_COUNTRY as RPNInput.Country
	);

	// Initialize country from the current value once
	const hasInitializedCountryRef = React.useRef(false);
	React.useEffect(() => {
		if (hasInitializedCountryRef.current) {
			return;
		}
		const initial = String(value || selectedPhone || "").trim();
		if (initial) {
			try {
				const inferred = getCountryFromPhone(initial);
				if (inferred) {
					setCountry(inferred);
				}
			} catch {
				// Silently ignore errors
			}
		}
		hasInitializedCountryRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPhone, value]);

	// Use centralized phone selector popover logic
	const {
		phoneSearch,
		setPhoneSearch,
		indexedOptions,
		visiblePhonesWithSelectedFirst,
		isSearching,
		addPreviewDisplay,
		canCreateNew,
		selectedPhoneRef,
		isPhoneOpen,
		setIsPhoneOpen,
		triggerRef,
		dropdownWidth,
	} = usePhoneSelectorPopover({
		phoneOptions,
		selectedPhone,
		country,
		allowCreateNew,
	});

	// Handlers
	const handleSelectFromDropdown = (phoneNumber: string) => {
		try {
			const inferred = getCountryFromPhone(phoneNumber);
			if (inferred) {
				setCountry(inferred);
			}
		} catch {
			// Silently ignore errors
		}
		const next = toE164Local(phoneNumber);
		setSelectedPhone(next);
		onChange(next);
		setIsPhoneOpen(false);
	};

	const handleCreateNewPhone = (raw: string) => {
		// Accept raw input (prepend current CC if numeric only)
		let next = String(raw || "").trim();
		// Normalize 00 -> +
		if (next.startsWith("00")) {
			next = `+${next.slice(2)}`;
		}
		// If no + prefix, attach selected country code
		if (next && !next.startsWith("+")) {
			try {
				const cc = getCountryCallingCode(
					(country || DEFAULT_COUNTRY) as RPNInput.Country
				);
				next = `+${cc}${next.replace(/\D/g, "")}`;
			} catch {
				// Silently ignore errors
			}
		}
		// Convert to E.164 for the input component
		const e164 = toE164Local(next);
		validatePhone(e164);
		setSelectedPhone(e164);
		onChange(e164);
		setIsPhoneOpen(false);
		setPhoneSearch("");
	};

	const handleCountrySelect = (selectedCountry: RPNInput.Country) => {
		setCountry(selectedCountry);
		// Reformat/initialize number for new country
		const current = String(selectedPhone || "").trim();
		if (current) {
			const reformatted = tryParseAndReformatPhone(current, selectedCountry);
			if (reformatted) {
				setSelectedPhone(reformatted);
				onChange(reformatted);
			} else {
				const naiveReformatted = tryNaivePhoneReformat(
					current,
					selectedCountry
				);
				if (naiveReformatted) {
					setSelectedPhone(naiveReformatted);
					onChange(naiveReformatted);
				}
			}
		} else {
			try {
				const newCc = getCountryCallingCode(selectedCountry);
				const next = `+${newCc}`;
				setSelectedPhone(next);
				onChange(next);
			} catch {
				// Silently ignore errors
			}
		}
	};

	// Input typing is handled by react-phone-number-input/input via onChange

	// Placeholder not used when using national format input

	// Country selector search state and popover
	const [countrySearch, setCountrySearch] = React.useState("");
	const {
		selectedRef: selectedCountryRef,
		isOpen: isCountryOpen,
		setIsOpen: setIsCountryOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();

	return (
		<div className="w-full" dir="ltr">
			<ButtonGroup aria-label="Phone editor button group" className="w-full">
				{/* Left: Country selector */}
				<PhoneCountrySelector
					className={cn("h-9 px-2")}
					country={country}
					isOpen={isCountryOpen}
					search={countrySearch}
					selectedRef={selectedCountryRef}
					setCountry={handleCountrySelect}
					setIsOpen={setIsCountryOpen}
					setSearch={setCountrySearch}
					size="default"
				/>

				{/* Middle: Phone number input from react-phone-number-input (numeric-only behavior) */}
				<PhoneNumberInput
					dir="ltr"
					inputMode="tel"
					onChange={(val?: string) => {
						const next = String(val || "");
						// Validate but don't block
						validatePhone(next);
						setSelectedPhone(next);
						onChange(next);
					}}
					value={selectedPhone}
					{...(country ? { defaultCountry: country } : {})}
					className={cn(
						"h-9 min-w-0 flex-1 rounded-none border border-input border-r-0 border-l-0",
						"focus-visible:ring-0 focus-visible:ring-offset-0"
					)}
					useNationalFormatForDefaultCountryValue={true}
				/>

				{/* Right: Dropdown trigger with existing customers */}
				<Popover
					modal={false}
					onOpenChange={(open) => {
						// Defer close to avoid unmount during active pointer/drag events
						if (open) {
							setIsPhoneOpen(true);
							return;
						}
						requestAnimationFrame(() => setIsPhoneOpen(false));
					}}
					open={isPhoneOpen}
				>
					<PopoverTrigger asChild>
						<Button
							aria-label="Open phone options"
							className={cn(
								"h-9 w-9 justify-center rounded-s-none border-l-0 p-0 focus:z-10"
							)}
							ref={triggerRef}
							type="button"
							variant="outline"
						>
							<Search className="size-4 opacity-70" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className={cn("p-0", "click-outside-ignore")}
						dir="ltr"
						onInteractOutside={(e) => {
							// Don't close when clicking on dropdown menu items
							const target = e.target as HTMLElement;
							if (
								target.closest('[role="menuitem"]') ||
								target.closest('[role="menu"]') ||
								target.closest("[data-phone-selector-menu]")
							) {
								e.preventDefault();
							}
						}}
						style={{ width: dropdownWidth, maxWidth: "min(90vw, 560px)" }}
					>
						<PhoneNumberSelectorContent
							addPreviewDisplay={addPreviewDisplay}
							allIndexedPhones={
								indexedOptions as unknown as IndexedPhoneOption[]
							}
							allowCreateNew={allowCreateNew}
							canCreateNew={canCreateNew}
							currentCandidate={(() => {
								const raw = String(selectedPhone || "").trim();
								if (!raw) {
									return;
								}
								try {
									const cc = getCountryCallingCode(
										(country || DEFAULT_COUNTRY) as RPNInput.Country
									);
									const digits = raw.replace(/\D/g, "");
									if (digits === String(cc)) {
										return;
									}
								} catch {
									// Silently ignore errors
								}
								return raw;
							})()}
							isLocalized={isLocalized}
							isSearching={isSearching}
							onCreateNew={handleCreateNewPhone}
							onSelect={handleSelectFromDropdown}
							search={phoneSearch}
							selectedPhone={selectedPhone}
							selectedRef={selectedPhoneRef}
							setSearch={setPhoneSearch}
							visiblePhones={visiblePhonesWithSelectedFirst}
						/>
					</PopoverContent>
				</Popover>
			</ButtonGroup>
		</div>
	);
};

export default GridPhoneCombobox;
