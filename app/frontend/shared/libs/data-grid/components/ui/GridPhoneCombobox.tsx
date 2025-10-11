import { useDebouncedValue } from "@shared/libs/hooks/use-debounced-value";
import { useScrollSelectedIntoView } from "@shared/libs/hooks/use-scroll-selected-into-view";
import { DEFAULT_COUNTRY } from "@shared/libs/phone/config";
import { CALLING_CODES_SORTED } from "@shared/libs/phone/countries";
import { useLanguage } from "@shared/libs/state/language-context";
import { cn } from "@shared/libs/utils";
import { convertZeroZeroToPlus, getCountryFromPhone } from "@shared/libs/utils/phone-utils";
import { Button } from "@ui/button";
import { Search } from "lucide-react";
import * as React from "react";
import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode, parsePhoneNumber } from "react-phone-number-input";
import PhoneNumberInput from "react-phone-number-input/input";
import type { PhoneOption } from "@/entities/phone";
import {
	canCreateNewPhone,
	createPhoneFuseIndex,
	filterPhones,
	getAddPreviewDisplay,
	getVisiblePhones,
} from "@/services/phone/phone-search.service";
import { ButtonGroup } from "@/shared/ui/button-group";
import { PhoneCountrySelector } from "@/shared/ui/phone/phone-country-selector";
import { PhoneNumberSelectorContent } from "@/shared/ui/phone/phone-number-selector";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/shared/validation/phone";

interface GridPhoneComboboxProps {
	value: string;
	onChange: (value: string) => void;
	phoneOptions: PhoneOption[];
	allowCreateNew?: boolean;
}

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
	const toE164 = React.useCallback((input: string): string => {
		try {
			let s = String(input || "").trim();
			if (!s) return "";
			s = convertZeroZeroToPlus(s);
			// Keep only + and digits for parsing attempt
			const approx = s.replace(/[^\d+]/g, "");
			try {
				const parsed = parsePhoneNumber(approx);
				if (parsed?.number) return parsed.number; // E.164
			} catch {}
			// Fallback: strip non-digits and prefix +
			const digits = approx.replace(/\D/g, "");
			return digits ? `+${digits}` : "";
		} catch {
			return String(input || "");
		}
	}, []);

	// Keep a local selected phone in E.164, controlled by value
	const [selectedPhone, setSelectedPhone] = React.useState<string>(() => toE164(value || ""));

	React.useEffect(() => {
		setSelectedPhone(toE164(value || ""));
	}, [value, toE164]);

	// Validation (no inline error rendering)
	const validatePhone = React.useCallback(
		(phone: string): { isValid: boolean; error?: string } => validatePhoneNumberSvc(phone),
		[]
	);

	// Country handling
	const [country, setCountry] = React.useState<RPNInput.Country | undefined>(DEFAULT_COUNTRY as RPNInput.Country);

	// Initialize country from the current value once
	const hasInitializedCountryRef = React.useRef(false);
	React.useEffect(() => {
		if (hasInitializedCountryRef.current) return;
		const initial = String(value || selectedPhone || "").trim();
		if (initial) {
			try {
				const inferred = getCountryFromPhone(initial);
				if (inferred) setCountry(inferred);
			} catch {}
		}
		hasInitializedCountryRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPhone, value]);

	// Search state for dropdown popover
	const [phoneSearch, setPhoneSearch] = React.useState("");
	const debouncedPhoneSearch = useDebouncedValue(phoneSearch, 120);

	// Build indexed options + fuse for filtering (names first, numbers also supported)
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
				const display = option.displayNumber ?? option.number;
				const normalizedNumber = option.number.replace(/[\s\-+]/g, "").toLowerCase();
				const searchName = (option.name || "").toLowerCase();
				const searchLabel = (option.label || "").toLowerCase();
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

	const fuse = React.useMemo(() => createPhoneFuseIndex(indexedOptions), [indexedOptions]);

	const [filteredPhones, setFilteredPhones] = React.useState<PhoneOption[]>([]);
	React.useEffect(() => {
		const merged = filterPhones(fuse, indexedOptions, debouncedPhoneSearch) as unknown as IndexedPhoneOption[];
		setFilteredPhones(merged);
	}, [debouncedPhoneSearch, indexedOptions, fuse]);

	const VISIBLE_LIMIT_NO_SEARCH = 120;
	const visiblePhones: IndexedPhoneOption[] = React.useMemo(() => {
		if (!debouncedPhoneSearch) {
			return getVisiblePhones(
				filteredPhones as unknown as IndexedPhoneOption[],
				selectedPhone,
				VISIBLE_LIMIT_NO_SEARCH
			) as IndexedPhoneOption[];
		}
		return filteredPhones as unknown as IndexedPhoneOption[];
	}, [filteredPhones, debouncedPhoneSearch, selectedPhone]);

	const addPreviewDisplay = React.useMemo(
		() =>
			getAddPreviewDisplay(debouncedPhoneSearch, country as unknown as string, (c: string) =>
				String(getCountryCallingCode(c as unknown as RPNInput.Country))
			),
		[debouncedPhoneSearch, country]
	);

	const canCreateNew = React.useMemo(
		() => canCreateNewPhone(allowCreateNew, debouncedPhoneSearch, indexedOptions),
		[allowCreateNew, debouncedPhoneSearch, indexedOptions]
	);

	// Dropdown popover state + refs
	const {
		selectedRef: selectedPhoneRef,
		isOpen: isPhoneOpen,
		setIsOpen: setIsPhoneOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();

	// Trigger ref for popover width sync
	const triggerRef = React.useRef<HTMLButtonElement | null>(null);
	const [dropdownWidth, setDropdownWidth] = React.useState<number | undefined>(undefined);
	React.useLayoutEffect(() => {
		if (!isPhoneOpen) return;
		try {
			// Measure content width similar to PhoneCombobox
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			const bodyStyle = getComputedStyle(document.body);
			const fontFamily = bodyStyle.fontFamily || "ui-sans-serif, system-ui";
			const primaryFont = `600 14px ${fontFamily}`;
			const secondaryFont = `400 14px ${fontFamily}`;
			const measure = (text: string, font: string): number => {
				ctx.font = font;
				return Math.ceil(ctx.measureText(text || "").width);
			};
			let maxContent = 0;
			for (const opt of visiblePhones) {
				const primary = opt.name || opt.displayNumber || opt.number;
				const secondary = opt.displayNumber || opt.number;
				const primaryW = measure(primary, primaryFont);
				const secondaryW = measure(secondary, secondaryFont);
				const line = Math.max(primaryW, secondaryW + 30);
				maxContent = Math.max(maxContent, line);
			}
			const H_PADDING = 24;
			const CHECK_ICON = 28;
			const SCROLLBAR = 16;
			const INPUT_PADDING = 20;
			let computed = maxContent + H_PADDING + CHECK_ICON + SCROLLBAR + INPUT_PADDING;
			const triggerW = triggerRef.current?.offsetWidth || 0;
			computed = Math.max(computed, triggerW);
			const MAX = Math.min(Math.floor(window.innerWidth * 0.9), 560);
			computed = Math.min(computed, MAX);
			setDropdownWidth(computed);
		} catch {}
	}, [isPhoneOpen, visiblePhones]);

	// Handlers
	const handleSelectFromDropdown = (phoneNumber: string) => {
		try {
			const inferred = getCountryFromPhone(phoneNumber);
			if (inferred) setCountry(inferred);
		} catch {}
		const next = toE164(phoneNumber);
		setSelectedPhone(next);
		onChange(next);
		setIsPhoneOpen(false);
	};

	const handleCreateNewPhone = (raw: string) => {
		// Accept raw input (prepend current CC if numeric only)
		let next = String(raw || "").trim();
		// Normalize 00 -> +
		if (next.startsWith("00")) next = `+${next.slice(2)}`;
		// If no + prefix, attach selected country code
		if (next && !next.startsWith("+")) {
			try {
				const cc = getCountryCallingCode((country || DEFAULT_COUNTRY) as RPNInput.Country);
				next = `+${cc}${next.replace(/\D/g, "")}`;
			} catch {}
		}
		// Convert to E.164 for the input component
		const e164 = toE164(next);
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
			let updated = false;
			try {
				const phoneNumber = parsePhoneNumber(current);
				if (phoneNumber) {
					const nationalNumber = String(phoneNumber.nationalNumber || "");
					const newCountryCode = getCountryCallingCode(selectedCountry);
					const newPhoneNumber = nationalNumber ? `+${newCountryCode}${nationalNumber}` : `+${newCountryCode}`;
					updated = true;
					setSelectedPhone(newPhoneNumber);
					onChange(newPhoneNumber);
				}
			} catch {}
			if (!updated) {
				// Fallback: naive replace of calling code prefix
				const digits = current.replace(/\D/g, "");
				let localDigits = digits;
				const matched = CALLING_CODES_SORTED.find((code) => digits.startsWith(code));
				if (matched) localDigits = digits.slice(matched.length);
				try {
					const newCc = getCountryCallingCode(selectedCountry);
					const newPhoneNumber = localDigits ? `+${newCc}${localDigits}` : `+${newCc}`;
					setSelectedPhone(newPhoneNumber);
					onChange(newPhoneNumber);
				} catch {}
			}
		} else {
			try {
				const newCc = getCountryCallingCode(selectedCountry);
				const next = `+${newCc}`;
				setSelectedPhone(next);
				onChange(next);
			} catch {}
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
			<ButtonGroup className="w-full" aria-label="Phone editor button group">
				{/* Left: Country selector */}
				<PhoneCountrySelector
					country={country}
					setCountry={handleCountrySelect}
					search={countrySearch}
					setSearch={setCountrySearch}
					isOpen={isCountryOpen}
					setIsOpen={setIsCountryOpen}
					selectedRef={selectedCountryRef}
					size="default"
					className={cn("h-9 px-2")}
				/>

				{/* Middle: Phone number input from react-phone-number-input (numeric-only behavior) */}
				<PhoneNumberInput
					inputMode="tel"
					dir="ltr"
					value={selectedPhone}
					onChange={(val?: string) => {
						const next = String(val || "");
						// Validate but don't block
						validatePhone(next);
						setSelectedPhone(next);
						onChange(next);
					}}
					{...(country ? { defaultCountry: country } : {})}
					useNationalFormatForDefaultCountryValue={true}
					className={cn(
						"h-9 flex-1 min-w-0 rounded-none border border-input border-l-0 border-r-0",
						"focus-visible:ring-0 focus-visible:ring-offset-0"
					)}
				/>

				{/* Right: Dropdown trigger with existing customers */}
				<Popover open={isPhoneOpen} onOpenChange={setIsPhoneOpen}>
					<PopoverTrigger asChild>
						<Button
							ref={triggerRef}
							type="button"
							variant="outline"
							aria-label="Open phone options"
							className={cn("rounded-s-none border-l-0 h-9 w-9 p-0 justify-center focus:z-10")}
						>
							<Search className="size-4 opacity-70" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className={cn("p-0", "click-outside-ignore")}
						dir="ltr"
						style={{ width: dropdownWidth, maxWidth: "min(90vw, 560px)" }}
					>
						<PhoneNumberSelectorContent
							search={phoneSearch}
							setSearch={setPhoneSearch}
							visiblePhones={visiblePhones}
							selectedPhone={selectedPhone}
							onSelect={handleSelectFromDropdown}
							canCreateNew={canCreateNew}
							onCreateNew={handleCreateNewPhone}
							addPreviewDisplay={addPreviewDisplay}
							isLocalized={isLocalized}
							selectedRef={selectedPhoneRef}
							allowCreateNew={allowCreateNew}
						/>
					</PopoverContent>
				</Popover>
			</ButtonGroup>
		</div>
	);
};

export default GridPhoneCombobox;
