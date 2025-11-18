import { getLocalizedCountryOptions } from '@shared/libs/phone/countries'
import React from 'react'
import type * as RPNInput from 'react-phone-number-input'
import { useLanguageStore } from '@/infrastructure/store/app-store'

export function useCountryFilter(countryStats?: Record<string, number>) {
	const { isLocalized: isLangLocalized } = useLanguageStore()
	const [countryFilter, setCountryFilter] = React.useState<
		RPNInput.Country | undefined
	>(undefined)
	const [countrySearch, setCountrySearch] = React.useState('')
	const [isCountryOpen, setIsCountryOpen] = React.useState(false)
	const countryFilterRef = React.useRef<HTMLDivElement | null>(null)

	const countryOptions = React.useMemo(() => {
		const allOptions = getLocalizedCountryOptions(isLangLocalized)
		// Filter to only show countries that exist in countryStats
		// If countryStats is undefined, return empty array (stats still loading)
		if (!countryStats) {
			return []
		}
		if (Object.keys(countryStats).length > 0) {
			return allOptions
				.filter((option) => countryStats[option.value] !== undefined)
				.map((option) => ({
					...option,
					count: countryStats[option.value] || 0,
				}))
		}
		return []
	}, [isLangLocalized, countryStats])

	const getCountryName = React.useCallback(
		(countryCode: RPNInput.Country): string => {
			const option = countryOptions.find((opt) => opt.value === countryCode)
			if (option) {
				const name = option.label.split(' (+')[0]
				return name || countryCode
			}
			return countryCode || ''
		},
		[countryOptions]
	)

	const handleCountryFilterSelect = React.useCallback(
		(country: RPNInput.Country) => {
			setCountryFilter(country)
			setIsCountryOpen(false)
			setCountrySearch('')
		},
		[]
	)

	const handleRemoveCountryFilter = React.useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation()
			setCountryFilter(undefined)
		},
		[]
	)

	return {
		countryFilter,
		setCountryFilter,
		countrySearch,
		setCountrySearch,
		isCountryOpen,
		setIsCountryOpen,
		countryFilterRef,
		countryOptions,
		getCountryName,
		handleCountryFilterSelect,
		handleRemoveCountryFilter,
	}
}
