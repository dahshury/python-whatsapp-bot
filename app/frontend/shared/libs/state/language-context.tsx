'use client'
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { i18n } from '@/shared/libs/i18n'

export type LanguageState = {
	locale: string
	isLocalized: boolean
	setLocale: (locale: string) => void
	setUseLocalizedText: (useLocalized: boolean) => void
}

const LanguageContext = createContext<LanguageState | undefined>(undefined)

export const LanguageProvider = ({ children }: PropsWithChildren) => {
	const [locale, setLocale] = useState<string>('en')
	const isLocalized = locale !== 'en'

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('locale')
			if (stored) {
				setLocale(stored)
				return
			}
			// Backward compatibility: migrate old isLocalized flag to locale
			const legacyIsLocalized = localStorage.getItem('isLocalized')
			if (legacyIsLocalized === 'true') {
				setLocale('ar')
			}
		}
	}, [])

	useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('locale', locale)
			try {
				i18n.changeLanguage(locale === 'ar' ? 'ar' : 'en')
				document.documentElement.setAttribute(
					'lang',
					locale === 'ar' ? 'ar' : 'en'
				)
			} catch {
				// noop
			}
			// Do not toggle document direction; keep layout LTR while translating text in-place
		}
	}, [locale])

	const setUseLocalizedText = useCallback((useLocalized: boolean) => {
		setLocale((prev) => {
			if (useLocalized) {
				// If already non-English, keep current; otherwise switch to Arabic for now
				return prev !== 'en' ? prev : 'ar'
			}
			// Switch to English
			return 'en'
		})
	}, [])

	const value = useMemo<LanguageState>(
		() => ({ locale, isLocalized, setLocale, setUseLocalizedText }),
		[locale, isLocalized, setUseLocalizedText]
	)
	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	)
}

export function useLanguage(): LanguageState {
	const ctx = useContext(LanguageContext)
	if (!ctx) {
		throw new Error('useLanguage must be used within LanguageProvider')
	}
	return ctx
}
