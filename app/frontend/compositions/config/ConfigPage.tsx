'use client'

import {
	Calendar,
	Columns,
	Download,
	Globe,
	Save,
	Settings,
	Undo2,
	Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import {
	type AppConfigDto,
	AppConfigFactory,
	AppConfigMapper,
	type AppConfigSnapshot,
} from '@/entities/app-config'
import {
	useAppConfigQuery,
	useConfigLiveSync,
	useUpdateAppConfig,
} from '@/features/app-config'
import { useCalendarColorVariablesPreview } from '@/features/app-config/hooks/useCalendarColorVariablesPreview'
import {
	type AppConfigFormValues,
	type ColumnFormValue,
	createAppConfigFormValues,
	createDefaultAppConfigFormValues,
	mapFormValuesToUpdateInput,
} from '@/features/app-config/model'
import { CalendarDisplaySection } from '@/features/app-config/ui/calendar-display'
import { ColumnsSection } from '@/features/app-config/ui/columns'
import { GeneralSection } from '@/features/app-config/ui/general'
import { ConfigPageShell } from '@/features/app-config/ui/layout'
import { NotificationPreferencesSection } from '@/features/app-config/ui/notifications'
import { WorkingHoursSection } from '@/features/app-config/ui/working-hours'
import { i18n } from '@/shared/libs/i18n'
import { toastService } from '@/shared/libs/toast'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ButtonGroup } from '@/shared/ui/button-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const deepEqual = (a: unknown, b: unknown): boolean => {
	if (Object.is(a, b)) {
		return true
	}

	if (
		a === null ||
		b === null ||
		typeof a !== 'object' ||
		typeof b !== 'object'
	) {
		return false
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!(Array.isArray(a) && Array.isArray(b))) {
			return false
		}
		if (a.length !== b.length) {
			return false
		}
		for (let i = 0; i < a.length; i += 1) {
			if (!deepEqual(a[i], b[i])) {
				return false
			}
		}
		return true
	}

	const aEntries = Object.entries(a as Record<string, unknown>)
	const bEntries = Object.entries(b as Record<string, unknown>)

	if (aEntries.length !== bEntries.length) {
		return false
	}

	for (const [key, value] of aEntries) {
		if (!(key in (b as Record<string, unknown>))) {
			return false
		}
		if (
			!deepEqual(value, (b as Record<string, unknown>)[key as keyof typeof b])
		) {
			return false
		}
	}

	return true
}

export const ConfigPage = () => {
	const { data, isLoading, isError, refetch } = useAppConfigQuery()
	const updateConfig = useUpdateAppConfig()
	useConfigLiveSync()
	const cleanedVersionRef = useRef<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const defaultFormValuesRef = useRef(createDefaultAppConfigFormValues())
	const initialValuesRef = useRef<AppConfigFormValues | null>(
		defaultFormValuesRef.current
	)

	const form = useForm<AppConfigFormValues>({
		defaultValues: defaultFormValuesRef.current,
		mode: 'onChange',
	})

	const formValues = useMemo(() => form.getValues(), [form.getValues])

	// Watch form values for real-time color preview
	useCalendarColorVariablesPreview(formValues.eventColors)

	useEffect(() => {
		if (data) {
			const nextValues = createAppConfigFormValues(data)
			initialValuesRef.current = nextValues
			form.reset(nextValues)
		}
	}, [data, form])

	useEffect(() => {
		if (!data || updateConfig.isPending) {
			return
		}

		const expiredRanges = data.expiredCustomRanges ?? []
		if (expiredRanges.length === 0) {
			return
		}

		const snapshot = data.toSnapshot()
		if (cleanedVersionRef.current === snapshot.updatedAt) {
			return
		}

		cleanedVersionRef.current = snapshot.updatedAt
		const sanitizedValues = createAppConfigFormValues(data)

		updateConfig
			.mutateAsync(mapFormValuesToUpdateInput(sanitizedValues))
			.then(() => {
				const rangeLabel =
					expiredRanges.length === 1
						? '1 expired custom range was removed automatically'
						: `${expiredRanges.length} expired custom ranges were removed automatically`
				toastService.info(rangeLabel)
			})
			.catch((error) => {
				const message =
					error instanceof Error ? error.message : 'Unknown error occurred'
				toastService.error(
					`Failed to auto-clean expired custom ranges: ${message}`
				)
			})
	}, [data, updateConfig])

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			const updated = await updateConfig.mutateAsync(
				mapFormValuesToUpdateInput(values)
			)
			const nextValues = createAppConfigFormValues(updated)
			initialValuesRef.current = nextValues
			form.reset(nextValues)
			toastService.success('Configuration saved successfully')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error occurred'
			toastService.error(`Failed to save configuration: ${message}`)
		}
	})

	const isSaving = updateConfig.isPending
	const isValid = form.formState.isValid

	// Watch column values for reactive validation
	const calendarColumns = formValues.calendarColumns ?? []
	const documentsColumns = formValues.documentsColumns ?? []
	const availableLanguages = formValues.availableLanguages ?? []
	const availableThemes = formValues.availableThemes ?? []
	const availableCalendarViews = formValues.availableCalendarViews ?? []
	const defaultCalendarView = formValues.defaultCalendarView ?? null

	// Custom validation function to check columns
	const validateColumns = (): boolean => {
		if (availableLanguages.length === 0) {
			return true // No languages enabled, skip translation validation
		}

		// Helper to check if translation exists (either in metadata or i18n system)
		const hasTranslation = (column: ColumnFormValue, lang: string): boolean => {
			const metadata = column.metadata as
				| Record<string, unknown>
				| null
				| undefined
			const translations =
				(metadata?.translations as Record<string, string> | undefined) || {}
			const translationValue = translations[lang]

			// If translation exists in metadata and is not empty, it's valid
			if (translationValue && translationValue.trim() !== '') {
				return true
			}

			// Use the same logic as display: prefer title, fallback to id
			const columnKey = column.title || column.id || ''

			// For i18n keys, check if translation exists in i18n system
			const isI18nKey =
				columnKey.startsWith('field_') ||
				columnKey.startsWith('appt_') ||
				columnKey.startsWith('msg_')
			if (isI18nKey && columnKey) {
				const isLocalized = lang === 'ar'
				const i18nTranslation = i18n.getMessage(columnKey, isLocalized)
				// Check translation exists, is different from key, and not empty
				if (
					i18nTranslation &&
					i18nTranslation !== columnKey &&
					i18nTranslation.trim() !== ''
				) {
					return true
				}
			}

			return false
		}

		// Validate calendar columns
		for (const column of calendarColumns) {
			// Check required fields
			if (
				!(column.id && column.dataType) ||
				column.width === null ||
				column.width === undefined
			) {
				return false
			}

			// Check translations for all available languages
			for (const lang of availableLanguages) {
				if (!hasTranslation(column, lang)) {
					return false
				}
			}
		}

		// Validate document columns
		for (const column of documentsColumns) {
			// Check required fields
			if (
				!(column.id && column.dataType) ||
				column.width === null ||
				column.width === undefined
			) {
				return false
			}

			// Check translations for all available languages
			for (const lang of availableLanguages) {
				if (!hasTranslation(column, lang)) {
					return false
				}
			}
		}

		return true
	}

	// Watch calendar values for reactive validation
	const workingDays = formValues.workingDays ?? []
	const defaultWorkingHours = formValues.defaultWorkingHours
	const slotDurationHours = formValues.slotDurationHours

	// Custom validation function to check calendar fields
	const validateCalendar = (): boolean => {
		// Check at least one working day is selected
		if (!workingDays || workingDays.length === 0) {
			return false
		}

		// Check start time and end time are provided
		if (!(defaultWorkingHours?.startTime && defaultWorkingHours?.endTime)) {
			return false
		}

		// Check slot duration is provided
		if (!slotDurationHours || slotDurationHours <= 0) {
			return false
		}

		if (!availableCalendarViews || availableCalendarViews.length === 0) {
			return false
		}

		if (
			defaultCalendarView &&
			!availableCalendarViews.includes(defaultCalendarView)
		) {
			return false
		}

		return true
	}

	// Custom validation function to check required lists
	const validateRequiredLists = (): boolean => {
		// Must have at least one theme
		if (!availableThemes || availableThemes.length === 0) {
			return false
		}

		// Must have at least one language (English is always required, so this should always be true)
		if (!availableLanguages || availableLanguages.length === 0) {
			return false
		}

		// Must have at least one calendar column
		if (!calendarColumns || calendarColumns.length === 0) {
			return false
		}

		// Must have at least one document column
		if (!documentsColumns || documentsColumns.length === 0) {
			return false
		}

		return true
	}

	// Check if columns are valid (reactive)
	const columnsValid = validateColumns()
	// Check if calendar is valid (reactive)
	const calendarValid = validateCalendar()
	// Check if required lists are valid (reactive)
	const requiredListsValid = validateRequiredLists()
	const hasDirtyChanges =
		initialValuesRef.current !== null &&
		!deepEqual(formValues, initialValuesRef.current)
	const canSave =
		hasDirtyChanges &&
		isValid &&
		columnsValid &&
		calendarValid &&
		requiredListsValid

	// Count changes per tab section
	const hasFieldChanged = (
		selector: (values: AppConfigFormValues) => unknown
	): boolean => {
		if (!initialValuesRef.current) {
			return false
		}
		return !deepEqual(selector(formValues), selector(initialValuesRef.current))
	}

	const getCalendarChanges = () => {
		const selectors = [
			(values: AppConfigFormValues) => values.workingDays,
			(values: AppConfigFormValues) =>
				values.defaultWorkingHours?.startTime ?? null,
			(values: AppConfigFormValues) =>
				values.defaultWorkingHours?.endTime ?? null,
			(values: AppConfigFormValues) => values.daySpecificWorkingHours,
			(values: AppConfigFormValues) => values.slotDurationHours,
			(values: AppConfigFormValues) => values.daySpecificSlotDurations,
			(values: AppConfigFormValues) => values.customCalendarRanges,
			(values: AppConfigFormValues) => values.calendarFirstDay,
			(values: AppConfigFormValues) => values.eventTimeFormat?.format ?? null,
			(values: AppConfigFormValues) =>
				values.eventTimeFormat?.showMinutes ?? null,
			(values: AppConfigFormValues) =>
				values.eventTimeFormat?.showMeridiem ?? null,
			(values: AppConfigFormValues) => values.defaultCalendarView,
			(values: AppConfigFormValues) => values.calendarLocale,
			(values: AppConfigFormValues) => values.calendarDirection,
			(values: AppConfigFormValues) => values.eventColors?.defaultEventColor,
			(values: AppConfigFormValues) => values.eventColors?.eventColorByType,
			(values: AppConfigFormValues) => values.eventColors?.useEventColors,
			(values: AppConfigFormValues) => values.eventColors?.eventColorByStatus,
			(values: AppConfigFormValues) => values.eventColors?.eventColorByPriority,
			(values: AppConfigFormValues) => values.eventColors?.documentStrokeColor,
			(values: AppConfigFormValues) => values.eventLoading?.dayMaxEvents,
			(values: AppConfigFormValues) => values.eventLoading?.dayMaxEventRows,
			(values: AppConfigFormValues) => values.eventLoading?.moreLinkClick,
			(values: AppConfigFormValues) => values.availableCalendarViews,
			(values: AppConfigFormValues) =>
				values.eventDurationSettings?.strategy ?? 'auto',
			(values: AppConfigFormValues) =>
				values.eventDurationSettings?.defaultMinutes ?? null,
			(values: AppConfigFormValues) =>
				values.eventDurationSettings?.perTypeMinutes ?? {},
			(values: AppConfigFormValues) =>
				values.slotCapacitySettings?.agent?.totalMax ?? null,
			(values: AppConfigFormValues) =>
				values.slotCapacitySettings?.agent?.perTypeMax ?? {},
			(values: AppConfigFormValues) =>
				values.slotCapacitySettings?.secretary?.totalMax ?? null,
			(values: AppConfigFormValues) =>
				values.slotCapacitySettings?.secretary?.perTypeMax ?? {},
		]
		return selectors.reduce(
			(count, selector) => count + (hasFieldChanged(selector) ? 1 : 0),
			0
		)
	}

	const getColumnsChanges = () => {
		const selectors = [
			(values: AppConfigFormValues) => values.calendarColumns,
			(values: AppConfigFormValues) => values.documentsColumns,
		]
		return selectors.reduce(
			(count, selector) => count + (hasFieldChanged(selector) ? 1 : 0),
			0
		)
	}

	const getGeneralChanges = () => {
		const selectors = [
			(values: AppConfigFormValues) => values.defaultCountryPrefix,
			(values: AppConfigFormValues) => values.availableLanguages,
			(values: AppConfigFormValues) => values.availableThemes,
			(values: AppConfigFormValues) => values.timezone,
			(values: AppConfigFormValues) => values.llmProvider,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notifyOnEventCreate,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notifyOnEventUpdate,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notifyOnEventDelete,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notifyOnEventReminder,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notificationSound,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.notificationDesktop,
			(values: AppConfigFormValues) =>
				values.notificationPreferences?.quietHours,
		]
		return selectors.reduce(
			(count, selector) => count + (hasFieldChanged(selector) ? 1 : 0),
			0
		)
	}

	const calendarChanges = getCalendarChanges()
	const columnsChanges = getColumnsChanges()
	const generalChanges = getGeneralChanges()

	const handleExport = () => {
		if (!data) {
			toastService.error('Nothing to export yet')
			return
		}
		try {
			const dto = AppConfigMapper.toDto(data)
			const blob = new Blob([JSON.stringify(dto, null, 2)], {
				type: 'application/json',
			})
			const url = URL.createObjectURL(blob)
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = `app-config-${new Date()
				.toISOString()
				.replace(/[:]/g, '-')}.json`
			anchor.click()
			URL.revokeObjectURL(url)
			toastService.success('Configuration exported')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error occurred'
			toastService.error(`Failed to export configuration: ${message}`)
		}
	}

	const handleImportTrigger = () => {
		fileInputRef.current?.click()
	}

	const normalizeImportedConfig = (raw: unknown): AppConfigDto => {
		if (raw && typeof raw === 'object') {
			if ('working_days' in (raw as Record<string, unknown>)) {
				// Already a DTO
				return raw as AppConfigDto
			}
			if ('workingDays' in (raw as Record<string, unknown>)) {
				// Snapshot format - convert to domain then to DTO
				const domain = AppConfigFactory.create(raw as AppConfigSnapshot)
				return AppConfigMapper.toDto(domain)
			}
		}
		throw new Error(
			'Unsupported config format. Please use a JSON file exported from this page.'
		)
	}

	const handleImportFile = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (!file) {
			return
		}
		try {
			const text = await file.text()
			const parsed = JSON.parse(text) as unknown
			const dto = normalizeImportedConfig(parsed)
			// Update config with imported data
			const updated = await updateConfig.mutateAsync(
				AppConfigMapper.toUpdateDto(AppConfigMapper.toDomain(dto).toSnapshot())
			)
			const nextValues = createAppConfigFormValues(updated)
			initialValuesRef.current = nextValues
			form.reset(nextValues)
			cleanedVersionRef.current = null
			toastService.success('Configuration imported successfully')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Invalid configuration file'
			toastService.error(`Failed to import configuration: ${message}`)
		} finally {
			event.target.value = ''
		}
	}

	const handleDiscard = () => {
		if (!initialValuesRef.current) {
			return
		}
		form.reset(initialValuesRef.current)
		toastService.info('Changes discarded')
	}

	return (
		<ConfigPageShell
			isError={isError}
			isLoading={isLoading && !data}
			onRetry={refetch}
		>
			{data ? (
				<form className="w-full" onSubmit={onSubmit}>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<Settings className="h-6 w-6 text-primary" />
								<h1 className="font-bold text-3xl tracking-tight">
									App Configuration
								</h1>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input
								accept="application/json"
								className="hidden"
								onChange={handleImportFile}
								ref={fileInputRef}
								type="file"
							/>
							<ButtonGroup>
								<Button
									disabled={!data}
									onClick={handleExport}
									type="button"
									variant="outline"
								>
									<Download className="mr-2 h-4 w-4" />
									Export
								</Button>
								<Button
									disabled={isSaving}
									onClick={handleImportTrigger}
									type="button"
									variant="outline"
								>
									<Upload className="mr-2 h-4 w-4" />
									Import
								</Button>
								<Button
									disabled={!hasDirtyChanges || isSaving}
									onClick={handleDiscard}
									type="button"
									variant="outline"
								>
									<Undo2 className="mr-2 h-4 w-4" />
									Discard
								</Button>
								<Button
									disabled={!canSave || isSaving}
									type="submit"
									variant="outline"
								>
									<Save className="mr-2 h-4 w-4" />
									{isSaving ? 'Saving...' : 'Save'}
								</Button>
							</ButtonGroup>
						</div>
					</div>

					<div className="h-10" />

					<div>
						<Tabs
							className="flex w-full flex-row gap-3"
							defaultValue="calendar"
						>
							<div className="sticky top-0 self-start">
								<TabsList className="flex h-auto flex-col">
									<TabsTrigger
										className="w-full justify-start"
										value="calendar"
									>
										<Calendar className="mr-2 h-4 w-4" />
										Calendar
										{calendarChanges > 0 && (
											<Badge className="ml-2" variant="secondary">
												{calendarChanges}
											</Badge>
										)}
									</TabsTrigger>
									<TabsTrigger className="w-full justify-start" value="columns">
										<Columns className="mr-2 h-4 w-4" />
										Columns
										{columnsChanges > 0 && (
											<Badge className="ml-2" variant="secondary">
												{columnsChanges}
											</Badge>
										)}
									</TabsTrigger>
									<TabsTrigger className="w-full justify-start" value="general">
										<Globe className="mr-2 h-4 w-4" />
										General
										{generalChanges > 0 && (
											<Badge className="ml-2" variant="secondary">
												{generalChanges}
											</Badge>
										)}
									</TabsTrigger>
								</TabsList>
							</div>

							<div className="flex-1">
								<TabsContent className="mt-0" value="calendar">
									<Tabs className="space-y-4" defaultValue="working-hours">
										<TabsList>
											<TabsTrigger value="working-hours">
												Working Hours
											</TabsTrigger>
											<TabsTrigger value="display">Display</TabsTrigger>
										</TabsList>
										<TabsContent value="working-hours">
											<WorkingHoursSection form={form} />
										</TabsContent>
										<TabsContent value="display">
											<CalendarDisplaySection form={form} />
										</TabsContent>
									</Tabs>
								</TabsContent>

								<TabsContent className="mt-0" value="columns">
									<Tabs className="space-y-4" defaultValue="calendar-columns">
										<TabsList>
											<TabsTrigger value="calendar-columns">
												Calendar
											</TabsTrigger>
											<TabsTrigger value="documents-columns">
												Documents
											</TabsTrigger>
										</TabsList>
										<TabsContent value="calendar-columns">
											<ColumnsSection
												description="Columns shown on the calendar/data table page"
												fieldName="calendarColumns"
												form={form}
												title="Calendar Columns"
											/>
										</TabsContent>
										<TabsContent value="documents-columns">
											<ColumnsSection
												description="Columns shown on the documents page"
												fieldName="documentsColumns"
												form={form}
												title="Documents Columns"
											/>
										</TabsContent>
									</Tabs>
								</TabsContent>

								<TabsContent className="mt-0" value="general">
									<div className="space-y-6">
										<GeneralSection form={form} />
										<NotificationPreferencesSection form={form} />
									</div>
								</TabsContent>
							</div>
						</Tabs>
					</div>
				</form>
			) : null}
		</ConfigPageShell>
	)
}
