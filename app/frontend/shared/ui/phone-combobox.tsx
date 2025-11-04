import { useScrollSelectedIntoView } from '@shared/libs/hooks/use-scroll-selected-into-view'
import { useShrinkToFitText } from '@shared/libs/hooks/use-shrink-to-fit-text'
import { i18n } from '@shared/libs/i18n'
import { DEFAULT_COUNTRY } from '@shared/libs/phone/config'
import { CALLING_CODES_SORTED } from '@shared/libs/phone/countries'
import { useLanguage } from '@shared/libs/state/language-context'
import { getSizeClasses } from '@shared/libs/ui/size'
import { cn } from '@shared/libs/utils'
import { getCountryFromPhone } from '@shared/libs/utils/phone-utils'
// ThemedScrollbar is used inside sub-components
import { Button } from '@ui/button'
import { ChevronDown } from 'lucide-react'
import {
	type FC,
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type * as RPNInput from 'react-phone-number-input'
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from 'react-phone-number-input'
import type { PhoneOption } from '@/entities/phone'
import { useBackendPhoneSearch } from '@/features/phone-selector/hooks/useBackendPhoneSearch'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'
import { buildPhoneGroups } from '@/shared/libs/phone/phone-groups'
import { buildIndexedOptions } from '@/shared/libs/phone/phone-index'
import { createNewPhoneOption as createNewPhoneOptionSvc } from '@/shared/libs/phone/phone-options'
import {
	canCreateNewPhone,
	getAddPreviewDisplay,
} from '@/shared/libs/phone/search'
import { PhoneCountrySelector } from '@/shared/ui/phone/phone-country-selector'
// (Command UI moved into PhoneCountrySelector/PhoneNumberSelectorContent)
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { validatePhoneNumber as validatePhoneNumberSvc } from '@/shared/validation/phone'
import { PhoneNumberSelectorContent } from '@/widgets/phone'

// (types and helpers moved to shared modules)

const PHONE_SEARCH_DEBOUNCE_MS = 400
const FLAG_ICON_WIDTH_PX = 24
const FLAG_ICON_GAP_PX = 6
const FLAG_ICON_TOTAL_WIDTH_PX = FLAG_ICON_WIDTH_PX + FLAG_ICON_GAP_PX
const DROPDOWN_MAX_WIDTH_PX = 560
const DROPDOWN_MAX_WIDTH_VW_PERCENT = 0.9
const EMPTY_STATE_ICON_SIZE_PX = 48
const EMPTY_STATE_SEARCH_ICON_SIZE_PX = 32
const EMPTY_STATE_GAP_PX = 16
const EMPTY_STATE_PADDING_PX = 32
const EMPTY_STATE_BADGE_PADDING_PX = 24
const EMPTY_STATE_BUTTON_EXTRA_PX = 40

type PhoneComboboxProps = {
	value?: string
	onChange?: (value: string) => void
	onCustomerSelect?: (phone: string, customerName: string) => void
	className?: string
	placeholder?: string
	phoneOptions: PhoneOption[]
	allowCreateNew?: boolean
	uncontrolled?: boolean
	disabled?: boolean
	showCountrySelector?: boolean
	showNameAndPhoneWhenClosed?: boolean
	/** When false, render the closed trigger with square corners (for button groups). */
	rounded?: boolean

	size?: 'sm' | 'default' | 'lg'
	onMouseEnter?: (e: MouseEvent) => void
	onMouseLeave?: (e: MouseEvent) => void
	/**
	 * When true, the closed combobox text will shrink to fit available width
	 * instead of growing the component width. Default is false.
	 */
	shrinkTextToFit?: boolean
	/**
	 * When true and there is no selected value, prefer showing the placeholder
	 * instead of a default +<countryCode> ... preview.
	 */
	preferPlaceholderWhenEmpty?: boolean
}

const PhoneCombobox: FC<PhoneComboboxProps> = ({
	value = '',
	onChange,
	onCustomerSelect,
	className,
	placeholder = 'Select a phone number',
	phoneOptions,
	allowCreateNew = false,
	uncontrolled = false,
	disabled = false,
	showCountrySelector = true,
	showNameAndPhoneWhenClosed = false,
	size: _size = 'default',
	onMouseEnter,
	onMouseLeave,
	shrinkTextToFit = false,
	preferPlaceholderWhenEmpty = false,
	rounded = true,
}) => {
	const { isLocalized } = useLanguage()
	const [selectedPhone, setSelectedPhone] = useState<string>(value || '')
	const [mounted, setMounted] = useState(false)
	const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(
		undefined
	)
	const triggerRef = useRef<HTMLButtonElement | null>(null)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Use centralized validation service
	const validatePhone = useCallback(
		(phone: string): { isValid: boolean; error?: string } =>
			validatePhoneNumberSvc(phone),
		[]
	)

	const [country, setCountry] = useState<RPNInput.Country | undefined>(
		DEFAULT_COUNTRY as RPNInput.Country
	)

	const [countrySearch, setCountrySearch] = useState('')
	const [phoneSearch, setPhoneSearch] = useState('')

	// Build indexed options from provided phoneOptions for initial display
	const localIndexedOptions: IndexedPhoneOption[] = useMemo(
		() => buildIndexedOptions(phoneOptions) as IndexedPhoneOption[],
		[phoneOptions]
	)

	// Use backend search with pg_trgm when user is actively searching
	const backendSearch = useBackendPhoneSearch(
		phoneSearch,
		selectedPhone,
		PHONE_SEARCH_DEBOUNCE_MS
	)

	// Use backend search results when searching, otherwise use local options
	const isActiveSearch = phoneSearch.trim().length > 0
	const isSearching = isActiveSearch && backendSearch.isSearching
	const searchError = isActiveSearch && backendSearch.hasError

	const indexedOptions = isActiveSearch
		? backendSearch.indexedOptions
		: localIndexedOptions

	// Extract unique countries from all phone options for country selector filtering
	const availableCountries = useMemo(() => {
		const countries = new Set<RPNInput.Country>()
		// Use both local and backend search results to get all available countries
		for (const option of localIndexedOptions) {
			if (option.country) {
				countries.add(option.country as RPNInput.Country)
			}
		}
		return countries
	}, [localIndexedOptions])

	const phoneGroups = useMemo(() => {
		if (isActiveSearch) {
			return backendSearch.groups
		}
		// Build groups from local options when not searching
		return buildPhoneGroups(localIndexedOptions, {
			selectedPhone,
			recentLimit: 50,
			totalLimit: 400,
		}).groups
	}, [isActiveSearch, backendSearch.groups, localIndexedOptions, selectedPhone])

	const orderedPhones = useMemo(() => {
		if (isActiveSearch) {
			return backendSearch.orderedPhones
		}
		return buildPhoneGroups(localIndexedOptions, {
			selectedPhone,
			recentLimit: 50,
			totalLimit: 400,
		}).ordered
	}, [
		isActiveSearch,
		backendSearch.orderedPhones,
		localIndexedOptions,
		selectedPhone,
	])

	// Country options are handled inside PhoneCountrySelector

	// Handle controlled vs uncontrolled behavior
	useEffect(() => {
		if (!uncontrolled && value !== undefined) {
			setSelectedPhone(value)
		} else if ((value === undefined || value === '') && selectedPhone === '') {
			// When uncontrolled/new usage, initialize to +<DEFAULT_COUNTRY CC> on first mount if empty
			try {
				const cc = getCountryCallingCode(DEFAULT_COUNTRY as RPNInput.Country)
				setSelectedPhone(`+${cc} `)
			} catch {
				setSelectedPhone('+')
			}
		}
	}, [value, uncontrolled, selectedPhone])

	// Initialize country from the initial value ONCE (e.g., when editing an existing number)
	const hasInitializedCountryRef = useRef(false)
	useEffect(() => {
		if (hasInitializedCountryRef.current) {
			return
		}
		const initial = (value ?? selectedPhone ?? '').trim()
		if (initial) {
			try {
				const inferred = getCountryFromPhone(initial)
				if (inferred) {
					setCountry(inferred)
				}
			} catch {
				// Ignore errors when inferring country from phone number during initialization
			}
		}
		hasInitializedCountryRef.current = true
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPhone, value])

	// Do not auto-change country based on the typed phone value after initialization

	// Preview label for creating a new phone using the currently selected country
	const addPreviewDisplay = useMemo(
		() =>
			getAddPreviewDisplay(phoneSearch, country, (c: string) =>
				String(getCountryCallingCode(c as unknown as RPNInput.Country))
			),
		[phoneSearch, country]
	)

	// Decide whether to show the create-new option even if there are matches
	const canCreateNew = useMemo(
		() =>
			canCreateNewPhone(
				allowCreateNew,
				phoneSearch,
				indexedOptions as IndexedPhoneOption[]
			),
		[allowCreateNew, phoneSearch, indexedOptions]
	)

	// Create a new phone number option via service
	const createNewPhoneOption = (phoneNumber: string): PhoneOption => {
		// Validate but do not block creation in UI
		validatePhone(phoneNumber)
		return createNewPhoneOptionSvc(phoneNumber, country, isLocalized)
	}

	// Handle phone selection with different behavior for controlled vs uncontrolled
	const handlePhoneSelectInternal = (phoneNumber: string) => {
		// Validate the phone number (suppress inline errors)
		validatePhone(phoneNumber)

		setSelectedPhone(phoneNumber)
		if (!uncontrolled && onChange) {
			onChange(phoneNumber)
		}
		setPhoneSearch('')
		setIsPhoneOpen(false)
	}

	// Handle creating and selecting a new phone number
	const handleCreateNewPhone = (phoneNumber: string) => {
		const newOption = createNewPhoneOption(phoneNumber)
		if (newOption) {
			handlePhoneSelectInternal(newOption.number)
		}
	}

	// For controlled mode, call onChange immediately when user selects
	const handlePhoneSelectControlled = (phoneNumber: string) => {
		// Normalize phone number for comparison (remove + and spaces)
		const normalizePhone = (phone: string) =>
			phone.replace(/[\s\-+]/g, '').trim()
		const normalizedPhone = normalizePhone(phoneNumber)

		// Find the customer data for auto-fill (normalize both sides for comparison)
		const selectedCustomer = phoneOptions.find(
			(option) => normalizePhone(option.number) === normalizedPhone
		)

		// When selecting an existing option, adapt country to the selected number
		try {
			const inferred = getCountryFromPhone(phoneNumber)
			if (inferred) {
				setCountry(inferred)
			}
		} catch {
			// Ignore errors when inferring country from phone number during selection
		}
		// Trigger customer auto-fill if we have a real customer name
		if (
			onCustomerSelect &&
			selectedCustomer &&
			selectedCustomer.name !== 'New Phone Number' &&
			selectedCustomer.name !== 'Unknown Customer'
		) {
			onCustomerSelect(phoneNumber, selectedCustomer.name)
		}

		if (!uncontrolled && onChange) {
			// Update local state immediately for better UX (optimistic update)
			// The parent will update the value prop which will sync via useEffect
			setSelectedPhone(phoneNumber)
			// Use the customer's phone format if found, otherwise use the normalized phone number
			// This ensures the format matches what's used in conversation keys
			const phoneForOnChange = selectedCustomer?.number || normalizedPhone
			onChange(phoneForOnChange)
			setIsPhoneOpen(false)
		} else {
			handlePhoneSelectInternal(phoneNumber)
		}
	}

	const handleCountrySelect = (selectedCountry: RPNInput.Country) => {
		setCountry(selectedCountry)
		setCountrySearch('')
		setIsCountryOpen(false)

		// Re-validate current phone number when country changes (no inline errors)
		if (selectedPhone) {
			validatePhone(selectedPhone)
		}

		// If there's a selected phone number, convert it to the new country's format
		if (selectedPhone?.trim()) {
			let updated = false
			try {
				// Parse the current phone number
				const phoneNumber = parsePhoneNumber(selectedPhone)
				if (phoneNumber) {
					// Get the national (local) number without country code
					const nationalNumber = String(phoneNumber.nationalNumber || '')
					// Format with the new country's calling code
					const newCountryCode = getCountryCallingCode(selectedCountry)
					if (newCountryCode) {
						const newPhoneNumber = nationalNumber
							? `+${newCountryCode}${nationalNumber}`
							: `+${newCountryCode} `
						setSelectedPhone(newPhoneNumber)
						if (!uncontrolled && onChange) {
							onChange(newPhoneNumber)
						}
						updated = true
					}
				}
			} catch {
				// Ignore errors when parsing phone number during country change
			}

			if (!updated) {
				// Fallback: derive local digits by stripping existing calling code prefix
				const digits = String(selectedPhone).replace(/\D/g, '')
				let localDigits = digits
				const matched = CALLING_CODES_SORTED.find((code) =>
					digits.startsWith(code)
				)
				if (matched) {
					localDigits = digits.slice(matched.length)
				}
				try {
					const newCc = getCountryCallingCode(selectedCountry)
					if (newCc) {
						const newPhoneNumber = localDigits
							? `+${newCc}${localDigits}`
							: `+${newCc} `
						setSelectedPhone(newPhoneNumber)
						if (!uncontrolled && onChange) {
							onChange(newPhoneNumber)
						}
					}
				} catch {
					// Ignore errors when getting country calling code during country change
				}
			}
		} else {
			// No phone yet: initialize to +[country code] to keep field non-empty
			try {
				const newCountryCode = getCountryCallingCode(selectedCountry)
				if (newCountryCode) {
					const newPhoneNumber = `+${newCountryCode} `
					setSelectedPhone(newPhoneNumber)
					if (!uncontrolled && onChange) {
						onChange(newPhoneNumber)
					}
				}
			} catch {
				// Ignore errors when initializing phone number with country code
			}
		}
	}

	// Track popover states and selected refs via hooks
	const {
		selectedRef: selectedCountryRef,
		isOpen: isCountryOpen,
		setIsOpen: setIsCountryOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>()
	const {
		selectedRef: selectedPhoneRef,
		isOpen: isPhoneOpen,
		setIsOpen: setIsPhoneOpen,
	} = useScrollSelectedIntoView<HTMLDivElement>()

	// Compute a dynamic dropdown width based on the widest visible option
	useLayoutEffect(() => {
		if (!isPhoneOpen) {
			return
		}
		try {
			// Build a canvas context for fast text measurement
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')
			if (!ctx) {
				return
			}
			const bodyStyle = getComputedStyle(document.body)
			const fontFamily = bodyStyle.fontFamily || 'ui-sans-serif, system-ui'
			const primaryFont = `600 14px ${fontFamily}` // text-sm font-medium
			const secondaryFont = `400 14px ${fontFamily}` // text-sm normal

			const measure = (text: string, font: string): number => {
				ctx.font = font
				return Math.ceil(ctx.measureText(text || '').width)
			}

			let maxContent = 0
			for (const opt of orderedPhones) {
				const primary = opt.name || opt.displayNumber || opt.number
				const secondary = opt.displayNumber || opt.number
				const primaryW = measure(primary, primaryFont)
				const secondaryW = measure(secondary, secondaryFont)
				// Include flag + gap on secondary line
				const secondaryTotal = secondaryW + FLAG_ICON_TOTAL_WIDTH_PX
				const line = Math.max(primaryW, secondaryTotal)
				maxContent = Math.max(maxContent, line)
			}

			// Calculate minimum width for empty states (add new phone, no results, no data)
			let minEmptyStateWidth = 0
			if (orderedPhones.length === 0) {
				const titleFont = `600 14px ${fontFamily}` // font-semibold text-sm
				const descFont = `400 12px ${fontFamily}` // text-xs
				const titleText = 'Add new phone number'
				const descText =
					"We couldn't find this number. Create it to start tracking conversations."

				if (canCreateNew) {
					// Use create-new state text
					const badgeText = addPreviewDisplay || 'Enter a phone number'
					const buttonText = 'Add number'
					const titleW = measure(titleText, titleFont)
					const descW = measure(descText, descFont)
					const badgeW =
						measure(badgeText, secondaryFont) + EMPTY_STATE_BADGE_PADDING_PX
					const buttonW =
						measure(buttonText, secondaryFont) + EMPTY_STATE_BUTTON_EXTRA_PX
					const emptyStateContent = Math.max(titleW, descW, badgeW, buttonW)
					minEmptyStateWidth =
						emptyStateContent +
						EMPTY_STATE_ICON_SIZE_PX +
						EMPTY_STATE_GAP_PX +
						EMPTY_STATE_PADDING_PX
				} else {
					// Use no-results/no-data state text with constrained width (text wraps)
					// Cap at 280px to prevent overly wide dropdown
					const MAX_EMPTY_STATE_TEXT_WIDTH = 280
					minEmptyStateWidth =
						MAX_EMPTY_STATE_TEXT_WIDTH +
						EMPTY_STATE_SEARCH_ICON_SIZE_PX +
						EMPTY_STATE_GAP_PX +
						EMPTY_STATE_PADDING_PX
				}
			}

			// Account for paddings (px-3), internal gaps, potential scrollbar, and trailing check icon
			const H_PADDING = 24 // px-3 on both sides
			const CHECK_ICON = 28 // space for check icon at end
			const SCROLLBAR = 16 // guard for scrollbar / layout
			const INPUT_PADDING = 20 // breathing room for the input
			let computed =
				maxContent + H_PADDING + CHECK_ICON + SCROLLBAR + INPUT_PADDING

			// Use minimum empty state width if applicable, otherwise respect trigger width
			const triggerW = triggerRef.current?.offsetWidth || 0
			const minWidth = minEmptyStateWidth > 0 ? minEmptyStateWidth : triggerW
			computed = Math.max(computed, minWidth)

			// Clamp to reasonable bounds so it is never too wide
			const MAX = Math.min(
				Math.floor(window.innerWidth * DROPDOWN_MAX_WIDTH_VW_PERCENT),
				DROPDOWN_MAX_WIDTH_PX
			) // <= 35rem, <= 90vw
			computed = Math.min(computed, MAX)
			setDropdownWidth(computed)
		} catch {
			// Ignore errors when computing dropdown width
		}
	}, [isPhoneOpen, orderedPhones, canCreateNew, addPreviewDisplay])

	// Size utilities moved to lib/ui/size

	// Shrink-to-fit measurement for closed state text
	const {
		containerRef: textContainerRef,
		textRef,
		scale: textScale,
		recompute,
		isMeasured,
	} = useShrinkToFitText(shrinkTextToFit)

	// Trigger recompute when selected phone or display content changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Need to retrigger when selectedPhone changes to recalculate text width
	useLayoutEffect(() => {
		if (shrinkTextToFit) {
			// Use requestAnimationFrame for immediate but smooth update
			const rafId = requestAnimationFrame(() => recompute())
			return () => cancelAnimationFrame(rafId)
		}
		return
	}, [selectedPhone, phoneOptions, shrinkTextToFit, recompute])

	// Prevent hydration mismatch and show loading state
	if (!mounted) {
		return (
			<div
				className={cn(
					'flex w-full items-center rounded-md border border-input bg-background ring-offset-background',
					getSizeClasses(_size),
					className
				)}
			>
				<span className="text-muted-foreground">Loading...</span>
			</div>
		)
	}

	return (
		<div
			className={cn(
				'flex min-w-0 max-w-full flex-col overflow-hidden',
				className
			)}
			dir="ltr"
		>
			<div className="flex">
				{/* Country Selector - only show if enabled */}
				{showCountrySelector && (
					<PhoneCountrySelector
						availableCountries={availableCountries}
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
				<Popover onOpenChange={setIsPhoneOpen} open={isPhoneOpen}>
					<PopoverTrigger asChild>
						<Button
							className={cn(
								'w-full min-w-0 max-w-full flex-1 justify-between overflow-hidden text-left',
								(() => {
									if (showCountrySelector) {
										return rounded
											? 'rounded-s-none rounded-e-lg border-l-0'
											: 'rounded-none border-l-0'
									}
									return rounded ? 'rounded-lg' : 'rounded-none'
								})(),
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
										'flex w-full items-center gap-1.5',
										shrinkTextToFit ? 'whitespace-nowrap' : '',
										!selectedPhone && 'text-muted-foreground'
									)}
								>
									{showNameAndPhoneWhenClosed && selectedPhone ? (
										<>
											<span
												className="flex-shrink-0 rounded bg-muted/30 px-1.5 py-0.5 font-mono text-muted-foreground text-sm"
												style={{ direction: 'ltr' }}
											>
												[{selectedPhone}]
											</span>
											<div
												className="min-w-0 flex-1 overflow-hidden"
												ref={textContainerRef}
											>
												<span
													className={cn(
														'inline-block whitespace-nowrap font-medium text-foreground text-sm',
														shrinkTextToFit && !isMeasured && 'opacity-0'
													)}
													ref={textRef}
													style={
														shrinkTextToFit
															? {
																	transform: `scale(${textScale})`,
																	transformOrigin: 'left center',
																	willChange: 'transform',
																	direction: 'ltr',
																	transition: isMeasured
																		? 'transform 0.1s ease-out, opacity 0.05s ease-out'
																		: 'none',
																}
															: { direction: 'ltr' }
													}
												>
													{(() => {
														// Normalize phone numbers for comparison
														const normalizePhone = (phone: string) =>
															phone.replace(/[\s\-+]/g, '').trim()
														const normalizedSelected =
															normalizePhone(selectedPhone)
														const selectedOption = phoneOptions.find(
															(option) =>
																normalizePhone(option.number) ===
																normalizedSelected
														)
														return (
															selectedOption?.name ||
															i18n.getMessage(
																'phone_unknown_label',
																isLocalized
															)
														)
													})()}
												</span>
											</div>
										</>
									) : (
										<span className="block w-full text-left" dir="ltr">
											{selectedPhone ||
												(() => {
													if (preferPlaceholderWhenEmpty) {
														return placeholder
													}
													return country
														? `+${getCountryCallingCode(country) || ''} ...`
														: placeholder
												})()}
										</span>
									)}
								</div>
							</div>
							<ChevronDown
								className={cn(
									'-mr-2 size-4 opacity-50 transition-transform duration-200',
									isPhoneOpen && 'rotate-180'
								)}
							/>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className={cn('p-0', 'click-outside-ignore')}
						dir="ltr"
						style={{
							width: dropdownWidth,
							maxWidth: 'min(90vw, 560px)',
						}}
					>
						<PhoneNumberSelectorContent
							addPreviewDisplay={addPreviewDisplay}
							allowCreateNew={allowCreateNew}
							canCreateNew={canCreateNew}
							groups={phoneGroups}
							hasError={searchError}
							isLocalized={isLocalized}
							isSearching={isSearching}
							onCreateNew={handleCreateNewPhone}
							onSelect={handlePhoneSelectControlled}
							search={phoneSearch}
							selectedPhone={selectedPhone}
							selectedRef={selectedPhoneRef}
							setSearch={setPhoneSearch}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Inline validation is suppressed; cell-level validation will handle errors */}
		</div>
	)
}

// Flag rendering moved into sub-components

export { PhoneCombobox }
