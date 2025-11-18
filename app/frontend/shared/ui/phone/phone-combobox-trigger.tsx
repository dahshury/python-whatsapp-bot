import { getPhoneDisplayName } from '@shared/libs/phone/phone-display'
import { getSizeClasses } from '@shared/libs/ui/size'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { ChevronDown } from 'lucide-react'
import type * as React from 'react'
import type { MouseEvent, RefObject } from 'react'
import type * as RPNInput from 'react-phone-number-input'
import { getCountryCallingCode } from 'react-phone-number-input'
import type { PhoneOption } from '@/entities/phone'

type PhoneComboboxTriggerProps = {
	selectedPhone: string
	phoneOptions: PhoneOption[]
	placeholder: string
	country?: RPNInput.Country
	preferPlaceholderWhenEmpty: boolean
	showNameAndPhoneWhenClosed: boolean
	shrinkTextToFit: boolean
	isLocalized: boolean
	isPhoneOpen: boolean
	disabled: boolean
	size: 'sm' | 'default' | 'lg'
	rounded: boolean
	showCountrySelector: boolean
	onMouseEnter?: (e: MouseEvent) => void
	onMouseLeave?: (e: MouseEvent) => void
	textContainerRef: RefObject<HTMLDivElement | null>
	textRef: RefObject<HTMLDivElement | null>
	textScale: number
	isMeasured: boolean
}

export const PhoneComboboxTrigger = ({
	selectedPhone,
	phoneOptions,
	placeholder,
	country,
	preferPlaceholderWhenEmpty,
	showNameAndPhoneWhenClosed,
	shrinkTextToFit,
	isLocalized,
	isPhoneOpen,
	disabled,
	size,
	rounded,
	showCountrySelector,
	onMouseEnter,
	onMouseLeave,
	textContainerRef,
	textRef,
	textScale,
	isMeasured,
	ref,
	...restProps
}: PhoneComboboxTriggerProps &
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		ref?: React.Ref<HTMLButtonElement | null>
	}) => (
	<Button
		{...restProps}
		className={cn(
			'w-full min-w-0 max-w-full flex-1 justify-between overflow-hidden text-left',
			(() => {
				if (showCountrySelector) {
					return rounded
						? 'rounded-s-none rounded-e-lg border-l-0'
						: 'rounded-none border-l-0'
				}
				return rounded ? 'rounded-lg' : 'rounded-none border-l-0'
			})(),
			getSizeClasses(size)
		)}
		disabled={disabled}
		onMouseEnter={onMouseEnter}
		onMouseLeave={onMouseLeave}
		{...(ref ? { ref } : {})}
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
								{getPhoneDisplayName(selectedPhone, phoneOptions, isLocalized)}
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
)

PhoneComboboxTrigger.displayName = 'PhoneComboboxTrigger'
