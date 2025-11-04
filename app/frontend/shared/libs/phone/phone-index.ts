import type * as RPNInput from 'react-phone-number-input'
import type { PhoneOption } from '@/entities/phone'
import {
	formatNumberForDisplay,
	getCountryFromPhone,
} from '@/shared/libs/utils/phone-utils'

export type IndexedPhoneOption = PhoneOption & {
	displayNumber: string
	__normalizedNumber: string
	__searchName: string
	__searchLabel: string
	__country: RPNInput.Country
}

export function buildIndexedOptions(
	phoneOptions: PhoneOption[]
): IndexedPhoneOption[] {
	try {
		return phoneOptions.map((option) => {
			const display =
				option.displayNumber ?? formatNumberForDisplay(option.number)
			const normalizedNumber = option.number
				.replace(/[\s\-+]/g, '')
				.toLowerCase()
			const searchName = (option.name || '').toLowerCase()
			const searchLabel = (option.label || '').toLowerCase()
			const optionCountry = getCountryFromPhone(option.number)
			return {
				...option,
				displayNumber: display,
				__normalizedNumber: normalizedNumber,
				__searchName: searchName,
				__searchLabel: searchLabel,
				__country: optionCountry,
			} as IndexedPhoneOption
		})
	} catch {
		return phoneOptions.map((option) => ({
			...option,
			displayNumber: option.displayNumber ?? option.number,
			__normalizedNumber: option.number.replace(/[\s\-+]/g, '').toLowerCase(),
			__searchName: (option.name || '').toLowerCase(),
			__searchLabel: (option.label || '').toLowerCase(),
			__country: getCountryFromPhone(option.number),
		})) as IndexedPhoneOption[]
	}
}
