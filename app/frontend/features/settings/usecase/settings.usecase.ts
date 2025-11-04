export type SettingsUseCase = {
	getTheme: () => 'light' | 'dark'
	setTheme: (theme: 'light' | 'dark') => void
}
