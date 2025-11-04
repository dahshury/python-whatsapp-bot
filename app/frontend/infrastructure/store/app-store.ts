import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// Settings Store
// ============================================================================

export type SettingsState = {
	// State
	theme: string
	freeRoam: boolean
	showDualCalendar: boolean
	showToolCalls: boolean
	chatMessageLimit: number
	sendTypingIndicator: boolean

	// Actions
	setTheme: (theme: string) => void
	setFreeRoam: (freeRoam: boolean) => void
	setShowDualCalendar: (show: boolean) => void
	setShowToolCalls: (show: boolean) => void
	setChatMessageLimit: (limit: number) => void
	setSendTypingIndicator: (send: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			// Initial state
			theme: 'theme-default',
			freeRoam: false,
			showDualCalendar: false,
			showToolCalls: true,
			chatMessageLimit: 20,
			sendTypingIndicator: false,

			// Actions
			setTheme: (theme) => set({ theme }),
			setFreeRoam: (freeRoam) => set({ freeRoam }),
			setShowDualCalendar: (show) => set({ showDualCalendar: show }),
			setShowToolCalls: (show) => set({ showToolCalls: show }),
			setChatMessageLimit: (limit) => set({ chatMessageLimit: limit }),
			setSendTypingIndicator: (send) => set({ sendTypingIndicator: send }),
		}),
		{
			name: 'settings-store',
			version: 1,
		}
	)
)

// ============================================================================
// Language Store
// ============================================================================

export type LanguageState = {
	// State
	locale: string
	isLocalized: boolean

	// Actions
	setLocale: (locale: string) => void
	setUseLocalizedText: (useLocalized: boolean) => void
}

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set) => ({
			// Initial state
			locale: 'en',
			isLocalized: false,

			// Actions
			setLocale: (locale) => set({ locale, isLocalized: locale !== 'en' }),
			setUseLocalizedText: (useLocalized) =>
				set((state) => {
					let locale: string
					if (useLocalized) {
						if (state.locale !== 'en') {
							locale = state.locale
						} else {
							locale = 'ar'
						}
					} else {
						locale = 'en'
					}
					return {
						locale,
						isLocalized: useLocalized,
					}
				}),
		}),
		{
			name: 'language-store',
			version: 1,
		}
	)
)

// ============================================================================
// UI Store
// ============================================================================

export type UIState = {
	// State
	sidebarOpen: boolean
	mobileSidebarOpen: boolean
	selectedTab: string

	// Actions
	setSidebarOpen: (open: boolean) => void
	setMobileSidebarOpen: (open: boolean) => void
	setSelectedTab: (tab: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
	// Initial state
	sidebarOpen: true,
	mobileSidebarOpen: false,
	selectedTab: 'chat',

	// Actions
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
	setSelectedTab: (tab) => set({ selectedTab: tab }),
}))
