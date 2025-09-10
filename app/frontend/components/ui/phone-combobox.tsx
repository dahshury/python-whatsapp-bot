import { CheckCircle2, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
import type * as RPNInput from "react-phone-number-input";
import {
	getCountryCallingCode,
	isPossiblePhoneNumber,
	isValidPhoneNumber,
	parsePhoneNumber,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import countryLabelsAr from "react-phone-number-input/locale/ar.json";
import countryLabelsEn from "react-phone-number-input/locale/en.json";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

// Utility function to convert 00 prefix to + prefix
const convertZeroZeroToPlus = (phoneNumber: string): string => {
	if (phoneNumber.startsWith("00")) {
		return `+${phoneNumber.substring(2)}`;
	}
	return phoneNumber;
};

// Get country from phone number (robust: supports plain digits and 00 prefix)
const getCountryFromPhone = (phoneNumber: string): RPNInput.Country => {
	try {
		if (!phoneNumber) return "US";
		// Normalize input for parsing
		let normalized = convertZeroZeroToPlus(String(phoneNumber).trim());
		const digitsOnly = normalized.replace(/[\s-]/g, "");
		if (!normalized.startsWith("+") && /^\d+$/.test(digitsOnly)) {
			normalized = `+${digitsOnly}`;
		}

		const parsed = parsePhoneNumber(normalized);
		if (parsed?.country) return parsed.country as RPNInput.Country;
	} catch {}

	// Fallback: infer by calling code prefix if parsing failed
	try {
		let s = String(phoneNumber || "");
		s = convertZeroZeroToPlus(s);
		if (s.startsWith("+")) s = s.slice(1);
		const digits = s.replace(/\D/g, "");
		if (digits) {
			const match = CALLING_CODES_SORTED.find((code) =>
				digits.startsWith(code),
			);
			if (match) return CALLING_CODE_TO_COUNTRY[match] as RPNInput.Country;
		}
	} catch {}
	return "US";
};

// Comprehensive country list with calling codes
const COUNTRY_OPTIONS = [
	{ code: "US", name: "United States", callingCode: "1" },
	{ code: "GB", name: "United Kingdom", callingCode: "44" },
	{ code: "DE", name: "Germany", callingCode: "49" },
	{ code: "FR", name: "France", callingCode: "33" },
	{ code: "JP", name: "Japan", callingCode: "81" },
	{ code: "AU", name: "Australia", callingCode: "61" },
	{ code: "BR", name: "Brazil", callingCode: "55" },
	{ code: "IN", name: "India", callingCode: "91" },
	{ code: "CN", name: "China", callingCode: "86" },
	{ code: "RU", name: "Russia", callingCode: "7" },
	{ code: "CA", name: "Canada", callingCode: "1" },
	{ code: "MX", name: "Mexico", callingCode: "52" },
	{ code: "ES", name: "Spain", callingCode: "34" },
	{ code: "IT", name: "Italy", callingCode: "39" },
	{ code: "NL", name: "Netherlands", callingCode: "31" },
	{ code: "SE", name: "Sweden", callingCode: "46" },
	{ code: "NO", name: "Norway", callingCode: "47" },
	{ code: "DK", name: "Denmark", callingCode: "45" },
	{ code: "FI", name: "Finland", callingCode: "358" },
	{ code: "PL", name: "Poland", callingCode: "48" },
	{ code: "CZ", name: "Czech Republic", callingCode: "420" },
	{ code: "AT", name: "Austria", callingCode: "43" },
	{ code: "CH", name: "Switzerland", callingCode: "41" },
	{ code: "BE", name: "Belgium", callingCode: "32" },
	{ code: "PT", name: "Portugal", callingCode: "351" },
	{ code: "GR", name: "Greece", callingCode: "30" },
	{ code: "HU", name: "Hungary", callingCode: "36" },
	{ code: "TR", name: "Turkey", callingCode: "90" },
	{ code: "ZA", name: "South Africa", callingCode: "27" },
	{ code: "EG", name: "Egypt", callingCode: "20" },
	{ code: "NG", name: "Nigeria", callingCode: "234" },
	{ code: "KE", name: "Kenya", callingCode: "254" },
	{ code: "AE", name: "UAE", callingCode: "971" },
	{ code: "SG", name: "Singapore", callingCode: "65" },
	{ code: "MY", name: "Malaysia", callingCode: "60" },
	{ code: "TH", name: "Thailand", callingCode: "66" },
	{ code: "ID", name: "Indonesia", callingCode: "62" },
	{ code: "PH", name: "Philippines", callingCode: "63" },
	{ code: "VN", name: "Vietnam", callingCode: "84" },
	{ code: "KR", name: "South Korea", callingCode: "82" },
	{ code: "TW", name: "Taiwan", callingCode: "886" },
	{ code: "HK", name: "Hong Kong", callingCode: "852" },
	{ code: "AR", name: "Argentina", callingCode: "54" },
	{ code: "CL", name: "Chile", callingCode: "56" },
	{ code: "CO", name: "Colombia", callingCode: "57" },
	{ code: "PE", name: "Peru", callingCode: "51" },
	{ code: "VE", name: "Venezuela", callingCode: "58" },
	{ code: "UY", name: "Uruguay", callingCode: "598" },
	{ code: "NZ", name: "New Zealand", callingCode: "64" },
	{ code: "IL", name: "Israel", callingCode: "972" },
	{ code: "SA", name: "Saudi Arabia", callingCode: "966" },
	{ code: "PK", name: "Pakistan", callingCode: "92" },
	{ code: "BD", name: "Bangladesh", callingCode: "880" },
	{ code: "LK", name: "Sri Lanka", callingCode: "94" },
	{ code: "MM", name: "Myanmar", callingCode: "95" },
] as const;

// Get country label from country code
const getCountryLabel = (countryCode: RPNInput.Country): string => {
	const country = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
	if (country) {
		return `${country.name} (+${country.callingCode})`;
	}
	return `${countryCode} (+${getCountryCallingCode(countryCode)})`;
};

// Build calling code → country code lookup and a longest-first list of codes
const CALLING_CODE_TO_COUNTRY: Record<string, RPNInput.Country> = (() => {
	const map: Record<string, RPNInput.Country> = {};
	for (const c of COUNTRY_OPTIONS) {
		if (!map[c.callingCode]) map[c.callingCode] = c.code as RPNInput.Country;
	}
	return map;
})();

const CALLING_CODES_SORTED: string[] = Object.keys(
	CALLING_CODE_TO_COUNTRY,
).sort((a, b) => b.length - a.length);

// Format number for clean display without affecting value semantics
const formatNumberForDisplay = (phoneNumber: string): string => {
	try {
		let normalized = phoneNumber;
		const digitsOnly = normalized.replace(/[\s-]/g, "");
		if (normalized && !normalized.startsWith("+") && /^\d+$/.test(digitsOnly)) {
			normalized = `+${digitsOnly}`;
		}
		const parsed = parsePhoneNumber(normalized);
		if (parsed) return parsed.formatInternational();
		return normalized;
	} catch {}
	return phoneNumber;
};

export interface PhoneOption {
	number: string;
	name: string;
	country: string;
	label: string;
	id?: string;
	// Optional preformatted display number to avoid recomputation during render
	displayNumber?: string;
}

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

	// Phone validation function
	const validatePhoneNumber = React.useCallback(
		(phone: string): { isValid: boolean; error?: string } => {
			if (!phone.trim()) {
				return { isValid: true }; // Empty is valid
			}

			// First check if it's a possible phone number (lenient validation)
			if (!isPossiblePhoneNumber(phone)) {
				return {
					isValid: false,
					error: "Invalid phone number format or too short",
				};
			}

			// For stricter validation, also check if it's a valid phone number
			if (!isValidPhoneNumber(phone)) {
				try {
					const parsed = parsePhoneNumber(phone);
					if (parsed) {
						return {
							isValid: false,
							error: "Phone number may have invalid area code or format",
						};
					}
				} catch {
					// If parsing fails, fall back to the possible check result
				}
			}

			return { isValid: true };
		},
		[],
	);

	const [country, setCountry] = React.useState<RPNInput.Country | undefined>(
		"SA" as RPNInput.Country,
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

	// Debounce search input to avoid filtering on each keystroke
	const [debouncedPhoneSearch, setDebouncedPhoneSearch] = React.useState("");
	React.useEffect(() => {
		const handle = setTimeout(() => setDebouncedPhoneSearch(phoneSearch), 120);
		return () => clearTimeout(handle);
	}, [phoneSearch]);

	// Get all countries with localized names
	const countryOptions = React.useMemo(() => {
		const labels: Record<string, string> = isLocalized
			? (countryLabelsAr as Record<string, string>)
			: (countryLabelsEn as Record<string, string>);
		return COUNTRY_OPTIONS.map((c) => {
			const code = c.code as RPNInput.Country;
			const localizedName = labels[c.code] || c.name;
			return {
				value: code,
				label: `${localizedName} (+${c.callingCode})`,
			};
		});
	}, [isLocalized]);

	// Handle controlled vs uncontrolled behavior
	React.useEffect(() => {
		if (!uncontrolled && value !== undefined) {
			setSelectedPhone(value);
		} else if ((value === undefined || value === "") && selectedPhone === "") {
			// When uncontrolled/new usage, initialize to +966 on first mount if empty
			setSelectedPhone("+966 ");
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

	// Update filtered phones when search changes (uses memoized index)
	React.useEffect(() => {
		const search = debouncedPhoneSearch.toLowerCase().trim();
		if (!search) {
			setFilteredPhones(indexedOptions);
			return;
		}

		let normalizedSearch = convertZeroZeroToPlus(search);
		normalizedSearch = normalizedSearch.replace(/[\s\-+]/g, "");

		const filtered = indexedOptions.filter((option) => {
			const matchesNumber =
				(option.number || "").toLowerCase().includes(search) ||
				option.__normalizedNumber.includes(normalizedSearch);
			const matchesName = option.__searchName.includes(search);
			const matchesLabel = option.__searchLabel.includes(search);
			return Boolean(matchesNumber || matchesName || matchesLabel);
		});
		setFilteredPhones(filtered);
	}, [debouncedPhoneSearch, indexedOptions]);

	// Do not infer country while typing; keep the selected flag as the source of truth.

	// Limit initial render count when there is no search to speed up popover opening
	const VISIBLE_LIMIT_NO_SEARCH = 120;
	const visiblePhones = React.useMemo(() => {
		if (!debouncedPhoneSearch) {
			const normalize = (s: string) =>
				String(s)
					.replace(/[\s\-+]/g, "")
					.toLowerCase();
			if (selectedPhone) {
				const selectedIndex = filteredPhones.findIndex(
					(opt) =>
						opt.number === selectedPhone ||
						normalize(opt.number) === normalize(selectedPhone),
				);
				if (selectedIndex >= 0) {
					const half = Math.floor(VISIBLE_LIMIT_NO_SEARCH / 2);
					const maxStart = Math.max(
						0,
						filteredPhones.length - VISIBLE_LIMIT_NO_SEARCH,
					);
					const start = Math.max(0, Math.min(maxStart, selectedIndex - half));
					const end = Math.min(
						filteredPhones.length,
						start + VISIBLE_LIMIT_NO_SEARCH,
					);
					return filteredPhones.slice(start, end);
				}
			}
			return filteredPhones.slice(0, VISIBLE_LIMIT_NO_SEARCH);
		}
		return filteredPhones;
	}, [filteredPhones, debouncedPhoneSearch, selectedPhone]);

	// Preview label for creating a new phone using the currently selected country
	const addPreviewDisplay = React.useMemo(() => {
		const raw = debouncedPhoneSearch.trim();
		if (!raw) return "";
		const digits = raw.replace(/\D/g, "");
		try {
			const selected = country || ("SA" as RPNInput.Country);
			const cc = getCountryCallingCode(selected);
			return digits ? `+${cc}${digits}` : `+${cc} `;
		} catch {
			return digits ? `+${digits}` : "+";
		}
	}, [debouncedPhoneSearch, country]);

	// Create a new phone number option
	const createNewPhoneOption = (phoneNumber: string): PhoneOption => {
		// Always perform validation but don't block creation (suppress inline errors)
		validatePhoneNumber(phoneNumber);

		// Format the phone number properly, respecting the currently selected country
		let formattedNumber = convertZeroZeroToPlus(phoneNumber.trim());
		if (!formattedNumber.startsWith("+")) {
			// No international prefix provided by user → use selected country calling code
			try {
				const selected = country || ("SA" as RPNInput.Country);
				const cc = getCountryCallingCode(selected);
				const digits = formattedNumber.replace(/\D/g, "");
				formattedNumber = cc ? `+${cc}${digits}` : `+${digits}`;
			} catch {
				const digits = formattedNumber.replace(/\D/g, "");
				formattedNumber = `+${digits}`;
			}
		}

		try {
			const parsed = parsePhoneNumber(formattedNumber);
			if (parsed) {
				formattedNumber = parsed.formatInternational();
			}
		} catch {
			// Keep as-is if parsing fails
		}

		const selected =
			country ||
			(getCountryFromPhone(formattedNumber) as RPNInput.Country) ||
			("SA" as RPNInput.Country);
		const localizedEntry = countryOptions.find((opt) => opt.value === selected);
		const label = localizedEntry?.label || getCountryLabel(selected);

		const newOption: PhoneOption = {
			number: formattedNumber,
			name: "New Phone Number",
			country: selected,
			label: label,
			id: `new-${Date.now()}`, // Generate unique ID
		};

		return newOption;
	};

	// Handle phone selection with different behavior for controlled vs uncontrolled
	const handlePhoneSelectInternal = (phoneNumber: string) => {
		// Validate the phone number (suppress inline errors)
		validatePhoneNumber(phoneNumber);

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
		if (selectedPhone) validatePhoneNumber(selectedPhone);

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

	// Track popover states for focus management
	const [isCountryOpen, setIsCountryOpen] = React.useState(false);
	const [isPhoneOpen, setIsPhoneOpen] = React.useState(false);

	// Refs to scroll selected items into view when opening popovers
	const selectedCountryRef = React.useRef<HTMLDivElement | null>(null);
	const selectedPhoneRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (isCountryOpen) {
			queueMicrotask(() => {
				try {
					selectedCountryRef.current?.scrollIntoView({
						block: "nearest",
						inline: "nearest",
						behavior: "auto",
					});
				} catch {}
			});
		}
	}, [isCountryOpen]);

	React.useEffect(() => {
		if (isPhoneOpen) {
			queueMicrotask(() => {
				try {
					selectedPhoneRef.current?.scrollIntoView({
						block: "nearest",
						inline: "nearest",
						behavior: "auto",
					});
				} catch {}
			});
		}
	}, [isPhoneOpen]);

	// Size utilities
	const getSizeClasses = (componentSize: "sm" | "default" | "lg") => {
		switch (componentSize) {
			case "sm":
				return "h-8 px-2 text-xs";
			case "lg":
				return "h-12 px-4 text-base";
			default:
				return "h-10 px-3 text-sm";
		}
	};

	// Shrink-to-fit measurement for closed state text
	const textContainerRef = React.useRef<HTMLDivElement | null>(null);
	const textRef = React.useRef<HTMLDivElement | null>(null);
	const [textScale, setTextScale] = React.useState(1);

	const recomputeScale = React.useCallback(() => {
		if (!shrinkTextToFit) return;
		const container = textContainerRef.current;
		const textEl = textRef.current;
		if (!container || !textEl) return;
		// Allow natural size first
		textEl.style.transform = "";
		textEl.style.transformOrigin = "left center";
		const available = container.clientWidth;
		const needed = textEl.scrollWidth;
		if (available > 0 && needed > available) {
			const raw = available / needed;
			const clamped = Math.max(0.6, Math.min(1, raw));
			setTextScale(clamped);
		} else {
			setTextScale(1);
		}
	}, [shrinkTextToFit]);

	// Recompute scale after layout changes for smoother sizing
	React.useLayoutEffect(() => {
		recomputeScale();
	}, [recomputeScale]);

	React.useEffect(() => {
		if (!shrinkTextToFit) return;
		const handle = () => recomputeScale();
		window.addEventListener("resize", handle);
		return () => window.removeEventListener("resize", handle);
	}, [recomputeScale, shrinkTextToFit]);

	// Track container size changes precisely
	React.useEffect(() => {
		if (!shrinkTextToFit) return;
		const container = textContainerRef.current;
		if (!container) return;
		const ro = new ResizeObserver(() => recomputeScale());
		ro.observe(container);
		return () => ro.disconnect();
	}, [recomputeScale, shrinkTextToFit]);

	// Recompute scale when the displayed content or popover state changes
	React.useEffect(() => {
		if (!shrinkTextToFit) return;
		const id = setTimeout(() => recomputeScale(), 0);
		return () => clearTimeout(id);
	}, [shrinkTextToFit, recomputeScale]);

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
		<div className={cn("flex flex-col", className)}>
			<div className="flex">
				{/* Country Selector - only show if enabled */}
				{showCountrySelector && (
					<Popover open={isCountryOpen} onOpenChange={setIsCountryOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="outline"
								disabled={disabled}
								className={cn(
									"flex gap-1 rounded-e-none rounded-s-lg border-r-0 focus:z-10",
									getSizeClasses(_size),
								)}
							>
								{country ? (
									<FlagComponent country={country} countryName={country} />
								) : (
									<span className="text-muted-foreground">🌍</span>
								)}
								<ChevronsUpDown className="-mr-2 size-4 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className={cn("w-[300px] p-0", "click-outside-ignore")}
						>
							<Command shouldFilter={false}>
								<CommandInput
									value={countrySearch}
									onValueChange={setCountrySearch}
									placeholder={i18n.getMessage(
										"phone_country_search_placeholder",
										isLocalized,
									)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											try {
												const root = (e.currentTarget.closest("[cmdk-root]") ||
													e.currentTarget.parentElement) as HTMLElement | null;
												const active = root?.querySelector(
													"[cmdk-item][data-selected='true']",
												) as HTMLElement | null;
												const selectedCountry = active?.getAttribute(
													"data-option-country",
												);
												if (selectedCountry) {
													e.preventDefault();
													e.stopPropagation();
													handleCountrySelect(
														selectedCountry as RPNInput.Country,
													);
													return;
												}
											} catch {}
										}
									}}
								/>
								<CommandList>
									<ThemedScrollbar className="h-72">
										<CommandEmpty>
											{i18n.getMessage("phone_no_country_found", isLocalized)}
										</CommandEmpty>
										<CommandGroup>
											{countryOptions
												.filter((option) =>
													option.label
														.toLowerCase()
														.includes(countrySearch.toLowerCase()),
												)
												.map((option) => (
													<CommandItem
														key={option.value}
														value={option.value}
														onSelect={() => handleCountrySelect(option.value)}
														className="gap-2"
														ref={
															country === option.value
																? selectedCountryRef
																: undefined
														}
														data-option-country={option.value}
													>
														<FlagComponent
															country={option.value}
															countryName={option.label}
														/>
														<span className="flex-1 text-sm">
															{option.label}
														</span>
														{country === option.value && (
															<CheckCircle2 className="ms-auto size-4 text-primary" />
														)}
													</CommandItem>
												))}
										</CommandGroup>
									</ThemedScrollbar>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
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
												className="text-sm text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded text-xs"
												style={{ direction: "ltr" }}
											>
												[{selectedPhone}]
											</span>
											<span className="text-sm font-medium text-foreground">
												{(() => {
													const selectedOption = phoneOptions.find(
														(option) => option.number === selectedPhone,
													);
													return selectedOption?.name || "Unknown";
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
						className={cn("w-[400px] p-0", "click-outside-ignore")}
					>
						<Command shouldFilter={false}>
							<CommandInput
								value={phoneSearch}
								onValueChange={setPhoneSearch}
								placeholder={i18n.getMessage(
									"phone_search_placeholder",
									isLocalized,
								)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										// Handle create-new when no options are shown
										if (
											phoneSearch.trim() &&
											filteredPhones.length === 0 &&
											allowCreateNew
										) {
											e.preventDefault();
											e.stopPropagation();
											handleCreateNewPhone(phoneSearch);
											return;
										}

										// Otherwise, select the currently highlighted item from the list
										try {
											const root = (e.currentTarget.closest("[cmdk-root]") ||
												e.currentTarget.parentElement) as HTMLElement | null;
											const active = root?.querySelector(
												"[cmdk-item][data-selected='true']",
											) as HTMLElement | null;
											const selectedNumber =
												active?.getAttribute("data-option-number");
											if (selectedNumber) {
												e.preventDefault();
												e.stopPropagation();
												handlePhoneSelectControlled(selectedNumber);
												return;
											}
										} catch {}
									}
								}}
							/>
							<CommandList>
								<ThemedScrollbar className="h-72">
									{filteredPhones.length === 0 &&
									debouncedPhoneSearch.trim() &&
									allowCreateNew ? (
										<div className="p-2">
											<CommandItem
												value="create-new"
												onSelect={() =>
													handleCreateNewPhone(debouncedPhoneSearch)
												}
												className="gap-2 text-blue-600 hover:text-blue-700"
											>
												<Plus className="size-4" />
												<span>
													{i18n
														.getMessage("phone_add_number_label", isLocalized)
														.replace("{value}", addPreviewDisplay)}
												</span>
											</CommandItem>
										</div>
									) : (
										<>
											<CommandEmpty>
												{i18n.getMessage("phone_no_phone_found", isLocalized)}
											</CommandEmpty>
											<CommandGroup>
												{visiblePhones.map((option) => (
													<CommandItem
														key={option.number}
														value={option.number}
														onSelect={() =>
															handlePhoneSelectControlled(option.number)
														}
														className="gap-3 py-2.5 px-3"
														ref={
															selectedPhone === option.number
																? selectedPhoneRef
																: undefined
														}
														data-option-number={option.number}
													>
														<div className="flex flex-col space-y-2 min-w-0 flex-1">
															{/* Name row */}
															<span className="text-sm font-medium text-foreground truncate leading-tight">
																{option.name ||
																	option.displayNumber ||
																	option.number}
															</span>
															{/* Phone number row with flag */}
															<div className="flex items-center gap-1.5">
																<FlagComponent
																	country={
																		(option as unknown as IndexedPhoneOption)
																			.__country
																	}
																	countryName={option.label}
																	className="opacity-60 scale-75"
																/>
																<span className="text-sm text-muted-foreground leading-tight truncate">
																	{option.displayNumber || option.number}
																</span>
															</div>
														</div>
														{selectedPhone === option.number && (
															<CheckCircle2 className="ms-auto size-4 text-primary" />
														)}
													</CommandItem>
												))}
												{!debouncedPhoneSearch &&
												filteredPhones.length > VISIBLE_LIMIT_NO_SEARCH ? (
													<div className="px-3 py-2 text-xs text-muted-foreground">
														{filteredPhones.length - VISIBLE_LIMIT_NO_SEARCH}{" "}
														more. Type to search.
													</div>
												) : null}
											</CommandGroup>
										</>
									)}
								</ThemedScrollbar>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			{/* Inline validation is suppressed; cell-level validation will handle errors */}
		</div>
	);
};

const FlagComponent = ({
	country,
	countryName,
	className,
}: RPNInput.FlagProps & { className?: string }) => {
	const Flag = flags[country];

	return (
		<span
			className={`flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full ${className || ""}`}
		>
			{Flag && <Flag title={countryName} />}
		</span>
	);
};

export { PhoneCombobox };
