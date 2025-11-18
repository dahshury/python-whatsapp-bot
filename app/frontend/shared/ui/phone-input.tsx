import { cn } from '@shared/libs/utils'
import type { RefObject } from 'react'
import type { PhoneOption } from '@/entities/phone'
import { PhoneCombobox } from '@/shared/ui/phone-combobox'

// Predefined phone numbers with fake owner names and their countries
const PHONE_OPTIONS: PhoneOption[] = [
	{
		number: '+1 555-123-4567',
		name: 'John Smith',
		country: 'US',
		label: 'United States (+1)',
	},
	{
		number: '+44 20 7123 4567',
		name: 'Emma Johnson',
		country: 'GB',
		label: 'United Kingdom (+44)',
	},
	{
		number: '+49 30 12345678',
		name: 'Hans Mueller',
		country: 'DE',
		label: 'Germany (+49)',
	},
	{
		number: '+33 1 23 45 67 89',
		name: 'Marie Dubois',
		country: 'FR',
		label: 'France (+33)',
	},
	{
		number: '+81 3-1234-5678',
		name: 'Yuki Tanaka',
		country: 'JP',
		label: 'Japan (+81)',
	},
	{
		number: '+61 2 1234 5678',
		name: 'Alex Chen',
		country: 'AU',
		label: 'Australia (+61)',
	},
	{
		number: '+55 11 91234-5678',
		name: 'Carlos Silva',
		country: 'BR',
		label: 'Brazil (+55)',
	},
	{
		number: '+91 98765 43210',
		name: 'Priya Patel',
		country: 'IN',
		label: 'India (+91)',
	},
	{
		number: '+86 138 0013 8000',
		name: 'Li Wei',
		country: 'CN',
		label: 'China (+86)',
	},
	{
		number: '+7 495 123-45-67',
		name: 'Ivan Petrov',
		country: 'RU',
		label: 'Russia (+7)',
	},
]

type PhoneInputProps = {
	value?: string
	onChange?: (value: string) => void
	className?: string
	placeholder?: string
	// New prop to control behavior
	uncontrolled?: boolean
}

const PhoneInput = ({
	className,
	onChange,
	value,
	placeholder = 'Select a phone number',
	uncontrolled = false,
	ref,
	...props
}: PhoneInputProps & { ref?: RefObject<HTMLDivElement | null> }) => (
	<div className={cn('', className)} ref={ref} {...props} dir="ltr">
		<PhoneCombobox
			{...(onChange !== undefined && { onChange })}
			phoneOptions={PHONE_OPTIONS}
			placeholder={placeholder}
			uncontrolled={uncontrolled}
			value={value || ''}
		/>
	</div>
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
