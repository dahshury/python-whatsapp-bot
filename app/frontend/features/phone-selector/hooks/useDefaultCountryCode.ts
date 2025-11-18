import type * as RPNInput from 'react-phone-number-input'
import { useAppConfigQuery } from '@/features/app-config'
import { DEFAULT_COUNTRY } from '@/shared/libs/phone/config'

export function useDefaultCountryCode(): RPNInput.Country {
	const { data: appConfig } = useAppConfigQuery()
	const snapshot = appConfig?.toSnapshot()
	const configured = snapshot?.defaultCountryPrefix || DEFAULT_COUNTRY
	return configured as RPNInput.Country
}
