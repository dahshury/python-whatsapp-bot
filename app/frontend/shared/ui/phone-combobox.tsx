import { useDropdownWidth } from '@shared/libs/hooks/use-dropdown-width'
import { useScrollSelectedIntoView } from '@shared/libs/hooks/use-scroll-selected-into-view'
import { useShrinkToFitText } from '@shared/libs/hooks/use-shrink-to-fit-text'
import { getSizeClasses } from '@shared/libs/ui/size'
import { cn } from '@shared/libs/utils'
import { getCountryFromPhone } from '@shared/libs/utils/phone-utils'
import {
	type FC,
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import type * as RPNInput from 'react-phone-number-input'
import { getCountryCallingCode } from 'react-phone-number-input'
import type { PhoneOption } from '@/entities/phone'
import { useDefaultCountryCode } from '@/features/phone-selector/hooks/useDefaultCountryCode'
import { usePhoneComboboxCountry } from '@/features/phone-selector/hooks/usePhoneComboboxCountry'
import { usePhoneComboboxSelection } from '@/features/phone-selector/hooks/usePhoneComboboxSelection'
import { usePhoneComboboxState } from '@/features/phone-selector/hooks/usePhoneComboboxState'
import { useLanguageStore } from '@/infrastructure/store/app-store'
import { PhoneComboboxTrigger } from '@/shared/ui/phone/phone-combobox-trigger'
import { PhoneCountrySelector } from '@/shared/ui/phone/phone-country-selector'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { validatePhoneNumber as validatePhoneNumberSvc } from '@/shared/validation/phone'
import { PhoneNumberSelectorContent } from '@/widgets/phone'

// (types and helpers moved to shared modules)

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
	const { isLocalized } = useLanguageStore()
	const defaultCountry = useDefaultCountryCode()
	const [selectedPhone, setSelectedPhone] = useState<string>(value || '')
	const [mounted, setMounted] = useState(false)
	const triggerRef = useRef<HTMLButtonElement | null>(null)

	// Ref callback to merge refs for PopoverTrigger and our width calculation
	const triggerRefCallback = useCallback((node: HTMLButtonElement | null) => {
		triggerRef.current = node
	}, [])

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
		defaultCountry
	)

	useEffect(() => {
		if (!selectedPhone.trim()) {
			setCountry(defaultCountry)
		}
	}, [defaultCountry, selectedPhone])

	const [countrySearch, setCountrySearch] = useState('')
	const [phoneSearch, setPhoneSearch] = useState('')

	// Handle controlled vs uncontrolled behavior
	useEffect(() => {
		if (!uncontrolled && value !== undefined) {
			setSelectedPhone(value)
		} else if ((value === undefined || value === '') && selectedPhone === '') {
			try {
				const cc = getCountryCallingCode(defaultCountry)
				setSelectedPhone(`+${cc} `)
			} catch {
				setSelectedPhone('+')
			}
		}
	}, [value, uncontrolled, selectedPhone, defaultCountry])

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

	// Use state management hook
	const {
		phoneGroups,
		orderedPhones,
		availableCountries,
		isSearching,
		searchError,
		canCreateNew,
		addPreviewDisplay,
	} = usePhoneComboboxState({
		phoneOptions,
		phoneSearch,
		selectedPhone,
		country,
		allowCreateNew,
		isLocalized,
	})

	// Use phone selection hook
	const { handlePhoneSelectControlled, handleCreateNewPhone } =
		usePhoneComboboxSelection({
			selectedPhone,
			setSelectedPhone,
			phoneOptions,
			uncontrolled,
			...(onChange ? { onChange } : {}),
			...(onCustomerSelect ? { onCustomerSelect } : {}),
			onCountryChange: setCountry,
			setIsPhoneOpen,
			setPhoneSearch,
			...(country ? { selectedCountry: country } : {}),
			isLocalized,
			defaultCountry,
			validatePhone,
		})

	// Use country selection hook
	const { handleCountrySelect } = usePhoneComboboxCountry({
		selectedPhone,
		setSelectedPhone,
		uncontrolled,
		...(onChange ? { onChange } : {}),
		validatePhone,
	})

	// Wrapper to handle country selection with UI state updates
	const handleCountrySelectWrapper = (selectedCountry: RPNInput.Country) => {
		setCountry(selectedCountry)
		setCountrySearch('')
		setIsCountryOpen(false)
		handleCountrySelect(selectedCountry)
	}

	// Compute a dynamic dropdown width based on the widest visible option
	const dropdownWidth = useDropdownWidth({
		isOpen: isPhoneOpen,
		orderedPhones,
		canCreateNew,
		addPreviewDisplay,
		triggerRef,
	})

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
						setCountry={handleCountrySelectWrapper}
						setIsOpen={setIsCountryOpen}
						setSearch={setCountrySearch}
						size={_size}
					/>
				)}

				{/* Phone Number Selector */}
				<Popover onOpenChange={setIsPhoneOpen} open={isPhoneOpen}>
					<PopoverTrigger asChild>
						<PhoneComboboxTrigger
							{...(country ? { country } : {})}
							disabled={disabled}
							isLocalized={isLocalized}
							isMeasured={isMeasured}
							isPhoneOpen={isPhoneOpen}
							phoneOptions={phoneOptions}
							placeholder={placeholder}
							preferPlaceholderWhenEmpty={preferPlaceholderWhenEmpty}
							ref={triggerRefCallback}
							rounded={rounded}
							selectedPhone={selectedPhone}
							showCountrySelector={showCountrySelector}
							showNameAndPhoneWhenClosed={showNameAndPhoneWhenClosed}
							shrinkTextToFit={shrinkTextToFit}
							size={_size}
							textContainerRef={textContainerRef}
							textRef={textRef}
							textScale={textScale}
							{...(onMouseEnter ? { onMouseEnter } : {})}
							{...(onMouseLeave ? { onMouseLeave } : {})}
						/>
					</PopoverTrigger>
					<PopoverContent
						avoidCollisions={false}
						className={cn('p-0', 'click-outside-ignore')}
						dir="ltr"
						side="bottom"
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
