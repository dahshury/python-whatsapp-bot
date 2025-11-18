import path from 'node:path'

const config = {
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'ar'],
	},
	ns: ['common', 'dashboard', 'chat', 'calendar', 'validation'],
	defaultNS: 'common',
	localePath: path.resolve('./public/locales'),
	fallbackLng: 'en',
	fallbackNS: 'common',
	backend: {
		loadPath: '/locales/{{lng}}/{{ns}}.json',
	},
	detection: {
		order: ['localStorage', 'navigator'],
		caches: ['localStorage'],
	},
	react: {
		useSuspense: false,
	},
}

export default config
