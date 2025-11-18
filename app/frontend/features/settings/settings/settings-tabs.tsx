'use client'

import { i18n } from '@shared/libs/i18n'
import { Plane, Settings2, View } from 'lucide-react'
import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { VacationPeriods } from '@/features/settings'
import { useSettingsStore } from '@/infrastructure/store/app-store'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/shared/ui/animate-ui/components/radix/tabs'
import { DocumentsViewSettings } from './documents-view-settings'
import { GeneralSettings } from './general-settings'
import { ThemeSelector } from './theme-selector'
import { ViewModeToolbar } from './view-mode-toolbar'
import { ViewSettings } from './view-settings'

type SettingsTabsProps = {
	isLocalized?: boolean
	activeTab?: string
	onTabChange?: (value: string) => void
	currentCalendarView?: string
	activeView?: string
	onCalendarViewChange?: (view: string) => void
	customViewSelector?: ReactElement
	isCalendarPage?: boolean
	/**
	 * Optional override to control which tabs are visible. When provided,
	 * it takes precedence over isCalendarPage for determining visibility.
	 */
	allowedTabs?: ReadonlyArray<'view' | 'general' | 'vacation'>
	/** Hide the ViewModeToolbar (free roam / dual / default) controls. */
	hideViewModeToolbar?: boolean
	/** Whether this is the documents page (shows documents-specific view settings) */
	isDocumentsPage?: boolean
}

// View mode selection is handled by ViewModeToolbar

export function SettingsTabs({
	isLocalized = false,
	activeTab = 'view',
	onTabChange,
	currentCalendarView,
	activeView,
	onCalendarViewChange,
	customViewSelector,
	isCalendarPage = true,
	allowedTabs,
	hideViewModeToolbar = false,
	isDocumentsPage = false,
}: SettingsTabsProps) {
	useSettingsStore()
	// View mode change logic lives in ViewModeToolbar

	// Removed auto-switching tabs when not on calendar page to avoid update loops.

	// Determine which tabs to show
	const showViewTab = Array.isArray(allowedTabs)
		? allowedTabs.includes('view')
		: isCalendarPage
	const showVacationTab = Array.isArray(allowedTabs)
		? allowedTabs.includes('vacation')
		: isCalendarPage
	const showGeneralTab = Array.isArray(allowedTabs)
		? allowedTabs.includes('general')
		: true

	// Ensure active tab is valid when some tabs are hidden (e.g., dashboard page)
	// Memoize defaultTab to prevent unnecessary re-renders
	const defaultTab = useMemo(() => {
		if (showViewTab) {
			return 'view'
		}
		if (showGeneralTab) {
			return 'general'
		}
		if (showVacationTab) {
			return 'vacation'
		}
		return 'view'
	}, [showViewTab, showGeneralTab, showVacationTab])

	const computedActiveTab = useMemo(() => {
		const allowed = [] as string[]
		if (showGeneralTab) {
			allowed.push('general')
		}
		if (showViewTab) {
			allowed.push('view')
		}
		if (showVacationTab) {
			allowed.push('vacation')
		}
		return allowed.includes(activeTab) ? activeTab : defaultTab
	}, [activeTab, showViewTab, showVacationTab, showGeneralTab, defaultTab])

	const [tabsValue, setTabsValue] = useState(computedActiveTab)

	useEffect(() => {
		if (!isDocumentsPage && computedActiveTab !== tabsValue) {
			setTabsValue(computedActiveTab)
		}
	}, [computedActiveTab, isDocumentsPage, tabsValue])

	const handleTabChange = useCallback(
		(value: string) => {
			setTabsValue(value)
			onTabChange?.(value)
		},
		[onTabChange]
	)

	return (
		<Tabs className="w-full" onValueChange={handleTabChange} value={tabsValue}>
			<TabsList className="mx-auto">
				{showViewTab && (
					<TabsTrigger className="py-1" value="view">
						<View className="mr-1.5 h-3.5 w-3.5" />
						<span className="text-[0.8rem] leading-none">
							{i18n.getMessage('tab_view', isLocalized)}
						</span>
					</TabsTrigger>
				)}
				{showGeneralTab && (
					<TabsTrigger className="py-1" value="general">
						<Settings2 className="mr-1.5 h-3.5 w-3.5" />
						<span className="text-[0.8rem] leading-none">
							{i18n.getMessage('tab_general', isLocalized)}
						</span>
					</TabsTrigger>
				)}
				{showVacationTab && (
					<TabsTrigger className="relative w-full py-1" value="vacation">
						<Plane className="mr-1.5 h-3.5 w-3.5" />
						<span className="text-[0.8rem] leading-none">
							{i18n.getMessage('tab_vacation', isLocalized)}
						</span>
					</TabsTrigger>
				)}
			</TabsList>

			{showGeneralTab && (
				<TabsContent className="space-y-3 pt-3" value="general">
					<GeneralSettings isLocalized={isLocalized} />
					<ThemeSelector isLocalized={isLocalized} />
				</TabsContent>
			)}

			{showViewTab && (
				<TabsContent className="space-y-3 pt-3" value="view">
					{(() => {
						if (customViewSelector) {
							return (
								<div className="space-y-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1.5">
											<View className="h-3.5 w-3.5" />
											<span className="font-medium text-[0.8rem] leading-none">
												{i18n.getMessage('settings_view', isLocalized)}
											</span>
										</div>
										{!hideViewModeToolbar && <ViewModeToolbar />}
									</div>

									{customViewSelector}
								</div>
							)
						}

						if (isDocumentsPage) {
							return <DocumentsViewSettings isLocalized={isLocalized} />
						}

						return (
							<ViewSettings
								isLocalized={isLocalized}
								{...(currentCalendarView ? { currentCalendarView } : {})}
								{...(activeView ? { activeView } : {})}
								{...(onCalendarViewChange ? { onCalendarViewChange } : {})}
								hideChatSettings={
									Array.isArray(allowedTabs) &&
									allowedTabs.length === 1 &&
									allowedTabs.includes('view')
								}
								hideViewModeToolbar={hideViewModeToolbar}
							/>
						)
					})()}
				</TabsContent>
			)}

			{showVacationTab && (
				<TabsContent className="pt-3" value="vacation">
					<div className="space-y-3">
						<div className="rounded-md border bg-background/40 p-2 backdrop-blur-sm">
							{computedActiveTab === 'vacation' && <VacationPeriods />}
						</div>
					</div>
				</TabsContent>
			)}
		</Tabs>
	)
}
