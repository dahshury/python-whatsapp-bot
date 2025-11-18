'use client'

import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { Locale } from '../i18n-types'
import { getRTLClass, setDocumentDirection } from '../rtl-utils'

type I18nProviderProps = {
	children: ReactNode
	initialLocale?: Locale
}

type I18nContextValue = {
	locale: Locale
	direction: 'ltr' | 'rtl'
	setLocale: (locale: Locale) => void
	isRTL: boolean
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export const I18nProvider: FC<I18nProviderProps> = ({
	children,
	initialLocale = 'en',
}) => {
	const router = useRouter()
	const [locale, setLocaleState] = useState<Locale>(initialLocale)

	const direction = locale === 'ar' ? 'rtl' : 'ltr'
	const isRTL = direction === 'rtl'

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		const stored = localStorage.getItem('locale') as Locale | null
		if (stored && (stored === 'en' || stored === 'ar')) {
			setLocaleState(stored)
			setDocumentDirection(stored)
		} else {
			setDocumentDirection(locale)
		}
	}, [locale])

	useEffect(() => {
		setDocumentDirection(locale)
		localStorage.setItem('locale', locale)
		document.documentElement.className = getRTLClass(locale)
	}, [locale])

	const handleSetLocale = useCallback(
		(newLocale: Locale) => {
			setLocaleState(newLocale)
			router.push(`/${newLocale}`)
		},
		[router]
	)

	const value = useMemo<I18nContextValue>(
		() => ({
			locale,
			direction,
			setLocale: handleSetLocale,
			isRTL,
		}),
		[locale, direction, isRTL, handleSetLocale]
	)

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = (): I18nContextValue => {
	const ctx = useContext(I18nContext)
	if (!ctx) {
		throw new Error('useI18n must be used within I18nProvider')
	}
	return ctx
}
