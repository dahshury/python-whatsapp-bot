// getCountryFromPhone no longer used directly (centralized helper used instead)
import { useScrollSelectedIntoView } from "@shared/libs/hooks/use-scroll-selected-into-view";
import { useShrinkToFitText } from "@shared/libs/hooks/use-shrink-to-fit-text";
// i18n not used directly here anymore; fallbacks handled in service
import { DEFAULT_COUNTRY } from "@shared/libs/phone/config";
// import { CALLING_CODES_SORTED } from "@shared/libs/phone/countries";
import { useLanguage } from "@shared/libs/state/language-context";
import { getSizeClasses } from "@shared/libs/ui/size";
import { cn } from "@shared/libs/utils";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@shared/validation/phone";
import { Button } from "@ui/button";
import { ChevronsUpDown } from "lucide-react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
// ThemedScrollbar is used inside sub-components
import type { PhoneOption } from "@/entities/phone";
import {
	inferCountryFromPhone,
	reformatPhoneForCountry,
	templatePhoneForCountry,
} from "@/services/phone/phone-format.service";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import {
	createNewPhoneOption as createNewPhoneOptionSvc,
	findPhoneOptionByNumber,
	getDisplayNameOrFallback,
} from "@/services/phone/phone-options.service";
// WebSocketService no longer used directly (handled in hook)
import { PhoneCountrySelector } from "@/shared/ui/phone/phone-country-selector";
import { PhoneNumberSelectorContent } from "@/shared/ui/phone/phone-number-selector";
// (Command UI moved into PhoneCountrySelector/PhoneNumberSelectorContent)
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { usePhoneSelectorPopover } from "@/widgets/phone/hooks/use-phone-selector-popover";

// (types and helpers moved to shared modules)

type PhoneComboboxProps = {
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
	/** When false, render the closed trigger with square corners (for button groups). */
	rounded?: boolean;

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
};

const getComboboxButtonClassName = (
	showCountrySelector: boolean,
	rounded: boolean
): string => {
	if (showCountrySelector) {
		return rounded
			? "rounded-s-none rounded-e-lg border-l-0"
			: "rounded-none border-l-0";
	}
	return rounded ? "rounded-lg" : "rounded-none";
};

// Helper component for rendering the phone number display
type PhoneDisplayProps = {
	selectedPhone: string;
	showNameAndPhoneWhenClosed: boolean;
	preferPlaceholderWhenEmpty: boolean;
	placeholder: string;
	country: RPNInput.Country | undefined;
	phoneOptions: PhoneOption[];
	isLocalized: boolean;
	textContainerRef: React.RefObject<HTMLDivElement | null>;
	textRef: React.RefObject<HTMLSpanElement | null>;
	shrinkTextToFit: boolean;
	isMeasured: boolean;
	textScale: number;
};

function PhoneNumberDisplay({
	selectedPhone,
	showNameAndPhoneWhenClosed,
	preferPlaceholderWhenEmpty,
	placeholder,
	country,
	phoneOptions,
	isLocalized,
	textContainerRef,
	textRef,
	shrinkTextToFit,
	isMeasured,
	textScale,
}: PhoneDisplayProps) {
	if (showNameAndPhoneWhenClosed && selectedPhone) {
		return (
			<>
				<span
					className="flex-shrink-0 rounded bg-muted/30 px-1.5 py-0.5 font-mono text-muted-foreground text-sm"
					style={{ direction: "ltr" }}
				>
					[{selectedPhone}]
				</span>
				<div className="min-w-0 flex-1 overflow-hidden" ref={textContainerRef}>
					<span
						className={cn(
							"inline-block whitespace-nowrap font-medium text-foreground text-sm",
							shrinkTextToFit && !isMeasured && "opacity-0"
						)}
						ref={textRef}
						style={
							shrinkTextToFit
								? {
										transform: `scale(${textScale})`,
										transformOrigin: "left center",
										willChange: "transform",
										direction: "ltr",
										transition: isMeasured
											? "transform 0.1s ease-out, opacity 0.05s ease-out"
											: "none",
									}
								: { direction: "ltr" }
						}
					>
						{(() =>
							getDisplayNameOrFallback(
								selectedPhone,
								phoneOptions,
								isLocalized
							))()}
					</span>
				</div>
			</>
		);
	}

	return (
		<span className="block w-full text-left" dir="ltr">
			{selectedPhone ||
				(() => {
					if (preferPlaceholderWhenEmpty) {
						return placeholder;
					}
					if (country) {
						return `+${getCountryCallingCode(country) || ""} ...`;
					}
					return placeholder;
				})()}
		</span>
	);
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
	rounded = true,
}) => {
	const { isLocalized } = useLanguage();
	const [selectedPhone, setSelectedPhone] = useState<string>(value || "");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Use centralized validation service
	const validatePhone = useCallback(
		(phone: string): { isValid: boolean; error?: string } =>
			validatePhoneNumberSvc(phone),
		[]
	);

	const [country, setCountry] = useState<RPNInput.Country | undefined>(
		DEFAULT_COUNTRY as RPNInput.Country
	);

	const [countrySearch, setCountrySearch] = useState("");

	// Use centralized phone selector popover logic
	const {
		phoneSearch,
		setPhoneSearch,
		indexedOptions,
		visiblePhonesWithSelectedFirst,
		isSearching,
		hasError,
		retry,
		addPreviewDisplay,
		canCreateNew,
		addEphemeralOption,
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

	// Country options are handled inside PhoneCountrySelector

	// Handle controlled vs uncontrolled behavior
	useEffect(() => {
		if (!uncontrolled && value !== undefined) {
			setSelectedPhone(value);
		} else if ((value === undefined || value === "") && selectedPhone === "") {
			setSelectedPhone(
				templatePhoneForCountry(DEFAULT_COUNTRY as unknown as RPNInput.Country)
			);
		}
	}, [value, uncontrolled, selectedPhone]);

	// Initialize country from the initial value ONCE (e.g., when editing an existing number)
	const hasInitializedCountryRef = useRef(false);
	useEffect(() => {
		if (hasInitializedCountryRef.current) {
			return;
		}
		const initial = (value ?? selectedPhone ?? "").trim();
		if (initial) {
			const inferred = inferCountryFromPhone(initial);
			if (inferred) {
				setCountry(inferred);
			}
		}
		hasInitializedCountryRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPhone, value]);

	// Do not auto-change country based on the typed phone value after initialization
	// Do not infer country while typing; keep the selected flag as the source of truth.

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
			addEphemeralOption(newOption);
			handlePhoneSelectInternal(newOption.number);
		}
	};

	// For controlled mode, call onChange immediately when user selects
	const handlePhoneSelectControlled = (phoneNumber: string) => {
		// Find the customer data for auto-fill
		const selectedCustomer = findPhoneOptionByNumber(phoneOptions, phoneNumber);

		// When selecting an existing option, adapt country to the selected number
		const inferred = inferCountryFromPhone(phoneNumber);
		if (inferred) {
			setCountry(inferred);
		}
		if (
			selectedCustomer &&
			selectedCustomer.name !== "New Phone Number" &&
			selectedCustomer.name !== "Unknown Customer" &&
			onCustomerSelect
		) {
			// Trigger customer auto-fill if we have a real customer name
			onCustomerSelect(phoneNumber, selectedCustomer.name);
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
		if (selectedPhone) {
			validatePhone(selectedPhone);
		}
		const next = selectedPhone?.trim()
			? reformatPhoneForCountry(selectedPhone, selectedCountry)
			: templatePhoneForCountry(selectedCountry);
		setSelectedPhone(next);
		if (!uncontrolled && onChange) {
			onChange(next);
		}
	};

	// Track popover states and selected refs via hooks
	const {
		selectedRef: selectedCountryRef,
		isOpen: isCountryOpen,
		setIsOpen: setIsCountryOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>();

	// Size utilities moved to lib/ui/size

	// Shrink-to-fit measurement for closed state text
	const {
		containerRef: textContainerRef,
		textRef,
		scale: textScale,
		recompute,
		isMeasured,
	} = useShrinkToFitText(shrinkTextToFit);

	// Trigger recompute when selected phone or display content changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Need to retrigger when selectedPhone changes to recalculate text width
	useLayoutEffect(() => {
		if (shrinkTextToFit) {
			// Use requestAnimationFrame for immediate but smooth update
			const rafId = requestAnimationFrame(() => recompute());
			return () => cancelAnimationFrame(rafId);
		}
		return;
	}, [selectedPhone, phoneOptions, shrinkTextToFit, recompute]);

	// Prevent hydration mismatch and show loading state
	if (!mounted) {
		return (
			<div
				className={cn(
					"flex w-full items-center rounded-md border border-input bg-background ring-offset-background",
					getSizeClasses(_size),
					className
				)}
			>
				<span className="text-muted-foreground">Loading...</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex min-w-0 max-w-full flex-col overflow-hidden",
				className
			)}
			dir="ltr"
		>
			<div className="flex">
				{/* Country Selector - only show if enabled */}
				{showCountrySelector && (
					<PhoneCountrySelector
						country={country}
						disabled={disabled}
						isOpen={isCountryOpen}
						search={countrySearch}
						selectedRef={selectedCountryRef}
						setCountry={handleCountrySelect}
						setIsOpen={setIsCountryOpen}
						setSearch={setCountrySearch}
						size={_size}
					/>
				)}

				{/* Phone Number Selector */}
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
							className={cn(
								"w-full min-w-0 max-w-full flex-1 justify-between overflow-hidden text-left",
								getComboboxButtonClassName(showCountrySelector, rounded),
								getSizeClasses(_size)
							)}
							disabled={disabled}
							onMouseEnter={onMouseEnter}
							onMouseLeave={onMouseLeave}
							ref={triggerRef}
							type="button"
							variant="outline"
						>
							<div className="mr-2 min-w-0 flex-1 overflow-hidden text-left">
								<div
									className={cn(
										"flex w-full items-center gap-1.5",
										shrinkTextToFit ? "whitespace-nowrap" : "",
										!selectedPhone && "text-muted-foreground"
									)}
								>
									{showNameAndPhoneWhenClosed && selectedPhone ? (
										<PhoneNumberDisplay
											country={country}
											isLocalized={isLocalized}
											isMeasured={isMeasured}
											phoneOptions={phoneOptions}
											placeholder={placeholder}
											preferPlaceholderWhenEmpty={preferPlaceholderWhenEmpty}
											selectedPhone={selectedPhone}
											showNameAndPhoneWhenClosed={showNameAndPhoneWhenClosed}
											shrinkTextToFit={shrinkTextToFit}
											textContainerRef={textContainerRef}
											textRef={textRef}
											textScale={textScale}
										/>
									) : (
										<PhoneNumberDisplay
											country={country}
											isLocalized={isLocalized}
											isMeasured={isMeasured}
											phoneOptions={phoneOptions}
											placeholder={placeholder}
											preferPlaceholderWhenEmpty={preferPlaceholderWhenEmpty}
											selectedPhone={selectedPhone}
											showNameAndPhoneWhenClosed={showNameAndPhoneWhenClosed}
											shrinkTextToFit={shrinkTextToFit}
											textContainerRef={textContainerRef}
											textRef={textRef}
											textScale={textScale}
										/>
									)}
								</div>
							</div>
							<ChevronsUpDown className="-mr-2 size-4 opacity-50" />
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
						style={{
							width: dropdownWidth,
							maxWidth: "min(90vw, 560px)",
						}}
					>
						<PhoneNumberSelectorContent
							addPreviewDisplay={addPreviewDisplay}
							allIndexedPhones={indexedOptions as IndexedPhoneOption[]}
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
									// Silently ignore errors from country code extraction
								}
								return raw;
							})()}
							hasError={hasError}
							isLocalized={isLocalized}
							isSearching={isSearching}
							onCreateNew={handleCreateNewPhone}
							onSelect={handlePhoneSelectControlled}
							retry={retry}
							search={phoneSearch}
							selectedPhone={selectedPhone}
							selectedRef={selectedPhoneRef}
							setSearch={setPhoneSearch}
							visiblePhones={visiblePhonesWithSelectedFirst}
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
