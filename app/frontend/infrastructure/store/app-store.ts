import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { i18n } from '@/shared/libs/i18n'

// ============================================================================
// Settings Store
// ============================================================================

// Chat message limit constants
const DEFAULT_CHAT_MESSAGE_LIMIT = 20
const VIEWER_SPLIT_MIN_PERCENT = 5
const VIEWER_SPLIT_MAX_PERCENT = 95
const TOOLBAR_SIZE_PERCENTAGE_SCALE = 100
const DEFAULT_TOOLBAR_SIZE_PERCENT = 100

const clampViewerSplitPercent = (value: number) =>
	Math.min(Math.max(value, VIEWER_SPLIT_MIN_PERCENT), VIEWER_SPLIT_MAX_PERCENT)

export type SettingsState = {
	// State
	theme: string
	freeRoam: boolean
	showDualCalendar: boolean
	showToolCalls: boolean
	chatMessageLimit: number
	sendTypingIndicator: boolean
	viewerEnabled: boolean
	viewerSplitPaneLocked: boolean
	viewerSplitPaneHeight: number | null
	editorMinimalMode: boolean
	editorToolbarSize: number

	// Actions
	setTheme: (theme: string) => void
	setFreeRoam: (freeRoam: boolean) => void
	setShowDualCalendar: (show: boolean) => void
	setShowToolCalls: (show: boolean) => void
	setChatMessageLimit: (limit: number) => void
	setSendTypingIndicator: (send: boolean) => void
	setViewerEnabled: (enabled: boolean) => void
	setViewerSplitPaneLocked: (locked: boolean) => void
	setViewerSplitPaneHeight: (height: number | null) => void
	setEditorMinimalMode: (minimal: boolean) => void
	setEditorToolbarSize: (size: number) => void
}

// Initialize settings with legacy migration support
function initializeSettings(): Partial<SettingsState> {
	if (typeof window === 'undefined') {
		return {
			theme: 'theme-default',
			freeRoam: false,
			showDualCalendar: false,
			showToolCalls: true,
			chatMessageLimit: 20,
			sendTypingIndicator: false,
			viewerEnabled: false,
			viewerSplitPaneLocked: false,
			viewerSplitPaneHeight: null,
			editorMinimalMode: true,
			editorToolbarSize: 100,
		}
	}

	// Migrate legacy theme storage
	const storedStyleTheme = localStorage.getItem('styleTheme')
	const legacyTheme = localStorage.getItem('theme')
	let theme = 'theme-default'
	if (storedStyleTheme) {
		theme = storedStyleTheme
	} else if (legacyTheme?.startsWith('theme-')) {
		theme = legacyTheme
		try {
			localStorage.setItem('styleTheme', legacyTheme)
		} catch {
			// localStorage.setItem failed - continue with legacy theme
		}
	}

	// Load other settings from localStorage
	const storedFreeRoam = localStorage.getItem('freeRoam')
	const storedDual = localStorage.getItem('showDualCalendar')
	const storedToolCalls = localStorage.getItem('showToolCalls')
	const storedLimit = localStorage.getItem('chatMessageLimit')
	const storedTyping = localStorage.getItem('sendTypingIndicator')
	const storedViewerEnabled = localStorage.getItem('viewerEnabled')
	const storedViewerSplitPaneLocked = localStorage.getItem(
		'viewerSplitPaneLocked'
	)
	const storedViewerSplitPaneHeight = localStorage.getItem(
		'viewerSplitPaneHeight'
	)
	const storedEditorMinimalMode = localStorage.getItem('editorMinimalMode')
	const storedEditorToolbarSize = localStorage.getItem('editorToolbarSize')

	let viewerSplitPaneHeight: number | null = null
	if (storedViewerSplitPaneHeight) {
		const normalized = storedViewerSplitPaneHeight.includes('%')
			? Number.parseFloat(storedViewerSplitPaneHeight.replace('%', ''))
			: Number.parseFloat(storedViewerSplitPaneHeight)
		if (Number.isFinite(normalized)) {
			viewerSplitPaneHeight = clampViewerSplitPercent(normalized)
		}
	}

	return {
		theme,
		freeRoam: storedFreeRoam != null ? storedFreeRoam === 'true' : false,
		showDualCalendar: storedDual != null ? storedDual === 'true' : false,
		showToolCalls: storedToolCalls != null ? storedToolCalls === 'true' : true,
		chatMessageLimit:
			storedLimit != null ? Number(storedLimit) : DEFAULT_CHAT_MESSAGE_LIMIT,
		sendTypingIndicator: storedTyping != null ? storedTyping === 'true' : false,
		viewerEnabled:
			storedViewerEnabled != null ? storedViewerEnabled === 'true' : false,
		viewerSplitPaneLocked:
			storedViewerSplitPaneLocked != null
				? storedViewerSplitPaneLocked === 'true'
				: false,
		viewerSplitPaneHeight,
		editorMinimalMode:
			storedEditorMinimalMode != null
				? storedEditorMinimalMode === 'true'
				: true,
		editorToolbarSize:
			storedEditorToolbarSize != null
				? Number(storedEditorToolbarSize)
				: DEFAULT_TOOLBAR_SIZE_PERCENT,
	}
}

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => {
			const initialState = initializeSettings() as SettingsState

			// Initialize CSS variable for toolbar scale
			if (typeof window !== 'undefined') {
				const toolbarSize =
					initialState.editorToolbarSize ?? DEFAULT_TOOLBAR_SIZE_PERCENT
				document.documentElement.style.setProperty(
					'--tldraw-toolbar-scale',
					String(toolbarSize / TOOLBAR_SIZE_PERCENTAGE_SCALE)
				)
			}

			return {
				// Initial state with legacy migration
				...initialState,

				// Actions
				setTheme: (theme) => {
					set({ theme })
					// Persist to legacy key for backward compatibility
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('styleTheme', theme)
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setFreeRoam: (freeRoam) => {
					set({ freeRoam })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('freeRoam', String(freeRoam))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setShowDualCalendar: (show) => {
					set({ showDualCalendar: show })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('showDualCalendar', String(show))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setShowToolCalls: (show) => {
					set({ showToolCalls: show })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('showToolCalls', String(show))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setChatMessageLimit: (limit) => {
					set({ chatMessageLimit: limit })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('chatMessageLimit', String(limit))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setSendTypingIndicator: (send) => {
					set({ sendTypingIndicator: send })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('sendTypingIndicator', String(send))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setViewerEnabled: (enabled) => {
					set({ viewerEnabled: enabled })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('viewerEnabled', String(enabled))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setViewerSplitPaneLocked: (locked) => {
					set({ viewerSplitPaneLocked: locked })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('viewerSplitPaneLocked', String(locked))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setViewerSplitPaneHeight: (height) => {
					const clamped =
						typeof height === 'number' ? clampViewerSplitPercent(height) : null
					set({ viewerSplitPaneHeight: clamped })
					if (typeof window !== 'undefined') {
						try {
							if (clamped === null) {
								localStorage.removeItem('viewerSplitPaneHeight')
							} else {
								localStorage.setItem('viewerSplitPaneHeight', String(clamped))
							}
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setEditorMinimalMode: (minimal) => {
					set({ editorMinimalMode: minimal })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('editorMinimalMode', String(minimal))
						} catch {
							// localStorage.setItem failed
						}
					}
				},
				setEditorToolbarSize: (size) => {
					set({ editorToolbarSize: size })
					if (typeof window !== 'undefined') {
						try {
							localStorage.setItem('editorToolbarSize', String(size))
							// Update CSS variable
							document.documentElement.style.setProperty(
								'--tldraw-toolbar-scale',
								String(size / TOOLBAR_SIZE_PERCENTAGE_SCALE)
							)
						} catch {
							// localStorage.setItem failed
						}
					}
				},
			}
		},
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

// Initialize language with migration support
function initializeLanguage(): { locale: string; isLocalized: boolean } {
	if (typeof window === 'undefined') {
		return { locale: 'en', isLocalized: false }
	}

	// Check for stored locale
	const stored = localStorage.getItem('locale')
	if (stored) {
		return { locale: stored, isLocalized: stored !== 'en' }
	}

	// Backward compatibility: migrate old isLocalized flag to locale
	const legacyIsLocalized = localStorage.getItem('isLocalized')
	if (legacyIsLocalized === 'true') {
		return { locale: 'ar', isLocalized: true }
	}

	return { locale: 'en', isLocalized: false }
}

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set, get) => {
			const initial = initializeLanguage()

			// Initialize i18n and document lang attribute on store creation
			if (typeof window !== 'undefined') {
				try {
					i18n.changeLanguage(initial.locale === 'ar' ? 'ar' : 'en')
					document.documentElement.setAttribute(
						'lang',
						initial.locale === 'ar' ? 'ar' : 'en'
					)
				} catch {
					// i18n not initialized yet, will be handled on first setLocale call
				}
			}

			return {
				// Initial state with migration
				locale: initial.locale,
				isLocalized: initial.isLocalized,

				// Actions
				setLocale: (locale) => {
					set({ locale, isLocalized: locale !== 'en' })
					// Update i18n and document lang attribute
					if (typeof window !== 'undefined') {
						try {
							i18n.changeLanguage(locale === 'ar' ? 'ar' : 'en')
							document.documentElement.setAttribute(
								'lang',
								locale === 'ar' ? 'ar' : 'en'
							)
							// Persist to localStorage for backward compatibility
							localStorage.setItem('locale', locale)
						} catch {
							// i18n or localStorage operations failed
						}
					}
				},
				setUseLocalizedText: (useLocalized) => {
					const state = get()
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
					set({ locale, isLocalized: useLocalized })
					// Update i18n and document lang attribute
					if (typeof window !== 'undefined') {
						try {
							i18n.changeLanguage(locale === 'ar' ? 'ar' : 'en')
							document.documentElement.setAttribute(
								'lang',
								locale === 'ar' ? 'ar' : 'en'
							)
							// Persist to localStorage for backward compatibility
							localStorage.setItem('locale', locale)
						} catch {
							// i18n or localStorage operations failed
						}
					}
				},
			}
		},
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
