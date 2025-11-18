export type Locale = 'en' | 'ar'

export type Namespace =
	| 'common'
	| 'dashboard'
	| 'chat'
	| 'calendar'
	| 'validation'

export type I18nConfig = {
	locale: Locale
	direction: 'ltr' | 'rtl'
	namespaces: Namespace[]
}
