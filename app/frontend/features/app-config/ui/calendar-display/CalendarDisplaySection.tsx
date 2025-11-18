'use client'

import allLocales from '@fullcalendar/core/locales-all'
import { ChevronsUpDown, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, type UseFormReturn, useController } from 'react-hook-form'
import type { EventTypeColorConfig } from '@/entities/app-config'
import { EVENT_TYPE } from '@/entities/event'
import {
	DOCUMENT_EVENT_STROKE_COLOR,
	EVENT_TYPE_COLOR_DEFAULTS,
} from '@/shared/constants/calendar-colors'
import { CALENDAR_VIEW_OPTIONS } from '@/shared/constants/calendar-views'
import { cn } from '@/shared/libs/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerEyeDropper,
	ColorPickerFormat,
	ColorPickerHue,
	ColorPickerOutput,
	ColorPickerSelection,
} from '@/shared/ui/color-picker'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/shared/ui/command'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import {
	clampDurationMinutes,
	computeCapacityCeiling,
	DEFAULT_EVENT_DURATION_MINUTES,
	DEFAULT_SLOT_DURATION_HOURS,
	getEffectiveSlotDurationMinutes,
	MIN_EVENT_DURATION_MINUTES,
} from '../../lib/slot-capacity'
import type { AppConfigFormValues } from '../../model'
import { SectionCard } from '../working-hours/components/section-card'

type LocaleOption = {
	value: string
	label: string
}

const DEFAULT_LOCALE_VALUE = '__app-default__'

const formatLocaleLabel = (code?: string): string => {
	if (!code) {
		return ''
	}
	const normalizedCode = code.replace('_', '-')
	try {
		if (
			typeof Intl !== 'undefined' &&
			'DisplayNames' in Intl &&
			typeof Intl.DisplayNames === 'function'
		) {
			const baseCode = normalizedCode.split('-')[0] ?? normalizedCode
			const displayNames = new Intl.DisplayNames([normalizedCode], {
				type: 'language',
			})
			const displayName = displayNames.of(baseCode)
			if (displayName && displayName.toLowerCase() !== baseCode.toLowerCase()) {
				return `${displayName} (${code})`
			}
		}
	} catch {
		// Ignore unsupported locale codes and fall back to the raw code
	}
	return code
}

const FULLCALENDAR_LOCALE_OPTIONS: LocaleOption[] = Array.from(
	new Map(
		allLocales
			.filter((locale) => Boolean(locale?.code))
			.map((locale) => [locale.code, locale])
	).values()
)
	.map((locale) => ({
		value: locale.code,
		label: formatLocaleLabel(locale.code),
	}))
	.sort((a, b) => a.label.localeCompare(b.label))

type CalendarDisplaySectionProps = {
	form: UseFormReturn<AppConfigFormValues>
	className?: string
}

const DAYS_OF_WEEK = [
	{ value: 0, label: 'Sunday' },
	{ value: 1, label: 'Monday' },
	{ value: 2, label: 'Tuesday' },
	{ value: 3, label: 'Wednesday' },
	{ value: 4, label: 'Thursday' },
	{ value: 5, label: 'Friday' },
	{ value: 6, label: 'Saturday' },
]

// Default calendar first day: Saturday (6)
const DEFAULT_CALENDAR_FIRST_DAY = 6

const TIME_FORMATS = [
	{ value: '12h', label: '12-hour (AM/PM)' },
	{ value: '24h', label: '24-hour' },
	{ value: 'auto', label: 'Auto (responsive)' },
]

const DIRECTION_OPTIONS = [
	{ value: 'ltr', label: 'Left to Right' },
	{ value: 'rtl', label: 'Right to Left' },
	{ value: 'auto', label: 'Auto (detect from locale)' },
]

type EventColorMeta = {
	typeValue: number
	label: string
	defaultColors: EventTypeColorConfig
	description: string
}

const EVENT_TYPE_COLOR_META: EventColorMeta[] = [
	{
		typeValue: EVENT_TYPE.CheckUp,
		label: 'Check-up (Type 0)',
		defaultColors: EVENT_TYPE_COLOR_DEFAULTS['0'],
		description: 'Background and border colors for check-up reservations.',
	},
	{
		typeValue: EVENT_TYPE.FollowUp,
		label: 'Follow-up (Type 1)',
		defaultColors: EVENT_TYPE_COLOR_DEFAULTS['1'],
		description: 'Background and border colors for follow-up reservations.',
	},
	{
		typeValue: EVENT_TYPE.Conversation,
		label: 'Conversation (Type 2)',
		defaultColors: EVENT_TYPE_COLOR_DEFAULTS['2'],
		description: 'Background and border colors for conversation events.',
	},
]

const buildCapacityOptions = (limit: number): number[] => {
	if (!Number.isFinite(limit) || limit <= 0) {
		return []
	}
	return Array.from({ length: limit }, (_, index) => index + 1)
}

const formatCapacityLabel = (count: number): string =>
	`${count} event${count === 1 ? '' : 's'}`

const formatSlotDurationLabel = (minutes: number): string => {
	if (!Number.isFinite(minutes) || minutes <= 0) {
		return 'slot'
	}
	const rounded = Math.round(minutes)
	const hours = Math.floor(rounded / 60)
	const mins = rounded % 60
	if (hours > 0 && mins > 0) {
		return `${hours}h ${mins}m`
	}
	if (hours > 0) {
		return `${hours}h`
	}
	return `${mins}m`
}

type PerTypeDurationOverrideInputProps = {
	form: UseFormReturn<AppConfigFormValues>
	meta: EventColorMeta
	normalizedDefaultDuration: number
}

const PerTypeDurationOverrideInput = ({
	form,
	meta,
	normalizedDefaultDuration,
}: PerTypeDurationOverrideInputProps) => {
	const typeKey = String(meta.typeValue)
	const name = `eventDurationSettings.perTypeMinutes.${typeKey}` as const
	const { field: controllerField } = useController({
		control: form.control,
		name,
	})
	const [draftValue, setDraftValue] = useState<string>(() =>
		typeof controllerField.value === 'number'
			? String(controllerField.value)
			: ''
	)

	useEffect(() => {
		setDraftValue(
			typeof controllerField.value === 'number'
				? String(controllerField.value)
				: ''
		)
	}, [controllerField.value])

	const commitDraft = (raw: string) => {
		const trimmed = raw.trim()
		if (trimmed === '' || trimmed === '0') {
			controllerField.onChange(undefined)
			setDraftValue('')
			return
		}
		const parsed = Number(trimmed)
		if (!Number.isFinite(parsed)) {
			return
		}
		if (parsed <= 0) {
			controllerField.onChange(undefined)
			setDraftValue('')
			return
		}
		const clamped = clampDurationMinutes(parsed)
		controllerField.onChange(clamped)
		setDraftValue(String(clamped))
	}

	return (
		<div className="flex items-center gap-3">
			<div className="min-w-0 flex-1">
				<Label className="font-medium text-sm">{meta.label}</Label>
				<p className="text-muted-foreground text-xs">{meta.description}</p>
			</div>
			<div className="flex items-center gap-2">
				<Input
					aria-label={`${meta.label} duration minutes`}
					className="w-24"
					inputMode="numeric"
					name={controllerField.name}
					onBlur={() => {
						commitDraft(draftValue)
						controllerField.onBlur()
					}}
					onChange={(event) => {
						setDraftValue(event.target.value)
					}}
					pattern="[0-9]*"
					placeholder="—"
					ref={controllerField.ref}
					type="text"
					value={draftValue}
				/>
				<Button
					aria-label={`Reset ${meta.label} duration override`}
					onClick={() => {
						controllerField.onChange(normalizedDefaultDuration)
						setDraftValue(String(normalizedDefaultDuration))
					}}
					size="icon"
					type="button"
					variant="ghost"
				>
					<RotateCcw className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}

export const CalendarDisplaySection = ({
	form,
	className,
}: CalendarDisplaySectionProps) => {
	const { control } = form
	const [isViewsOpen, setIsViewsOpen] = useState(false)
	const availableViewValues = form.watch('availableCalendarViews') || []
	const [durationStrategy, setDurationStrategy] = useState<'auto' | 'manual'>(
		(form.getValues('eventDurationSettings.strategy') as
			| 'auto'
			| 'manual'
			| undefined) ?? 'auto'
	)

	useEffect(() => {
		const subscription = form.watch((value, { name }) => {
			if (!name || name.startsWith('eventDurationSettings.strategy')) {
				const nextStrategy =
					(value?.eventDurationSettings?.strategy as
						| 'auto'
						| 'manual'
						| undefined) ?? 'auto'
				setDurationStrategy(nextStrategy)
			}
		})
		return () => subscription.unsubscribe()
	}, [form])

	const slotDurationHoursValue = form.watch('slotDurationHours')
	const daySpecificSlotDurations =
		(form.watch(
			'daySpecificSlotDurations'
		) as AppConfigFormValues['daySpecificSlotDurations']) ?? []
	const customCalendarRanges =
		(form.watch(
			'customCalendarRanges'
		) as AppConfigFormValues['customCalendarRanges']) ?? []
	const eventDurationDefaultMinutes = form.watch(
		'eventDurationSettings.defaultMinutes'
	)
	const perTypeDurationValues =
		(form.watch('eventDurationSettings.perTypeMinutes') as Record<
			string,
			number | undefined
		>) ?? {}
	const roleTotals = {
		agent: form.watch('slotCapacitySettings.agent.totalMax') as
			| number
			| undefined,
		secretary: form.watch('slotCapacitySettings.secretary.totalMax') as
			| number
			| undefined,
	}

	const slotDurationMinutes = useMemo(
		() =>
			getEffectiveSlotDurationMinutes({
				defaultSlotDurationHours:
					slotDurationHoursValue ?? DEFAULT_SLOT_DURATION_HOURS,
				daySpecificSlotDurations,
				customCalendarRanges,
			}),
		[slotDurationHoursValue, daySpecificSlotDurations, customCalendarRanges]
	)

	const normalizedDefaultDuration = useMemo(
		() => clampDurationMinutes(eventDurationDefaultMinutes),
		[eventDurationDefaultMinutes]
	)

	const isManualDuration = durationStrategy === 'manual'
	const baseDurationForTotals = isManualDuration
		? normalizedDefaultDuration
		: MIN_EVENT_DURATION_MINUTES

	const totalCapacityCeiling = useMemo(
		() => computeCapacityCeiling(slotDurationMinutes, baseDurationForTotals),
		[slotDurationMinutes, baseDurationForTotals]
	)

	const totalCapacityOptions = useMemo(
		() => buildCapacityOptions(totalCapacityCeiling),
		[totalCapacityCeiling]
	)

	const perTypeCapacityCeilings = useMemo(() => {
		const map: Record<string, number> = {}
		for (const meta of EVENT_TYPE_COLOR_META) {
			const typeKey = String(meta.typeValue)
			const override = perTypeDurationValues[typeKey]
			const duration = isManualDuration
				? clampDurationMinutes(
						typeof override === 'number' ? override : normalizedDefaultDuration
					)
				: MIN_EVENT_DURATION_MINUTES
			map[typeKey] = computeCapacityCeiling(slotDurationMinutes, duration)
		}
		return map
	}, [
		isManualDuration,
		normalizedDefaultDuration,
		perTypeDurationValues,
		slotDurationMinutes,
	])

	useEffect(() => {
		for (const role of ['agent', 'secretary'] as const) {
			const current = form.getValues(`slotCapacitySettings.${role}.totalMax`)
			if (typeof current !== 'number' || Number.isNaN(current)) {
				form.setValue(
					`slotCapacitySettings.${role}.totalMax`,
					totalCapacityCeiling,
					{
						shouldDirty: false,
						shouldValidate: true,
					}
				)
				return
			}
			if (current < 0) {
				form.setValue(`slotCapacitySettings.${role}.totalMax`, 0, {
					shouldDirty: true,
					shouldValidate: true,
				})
				return
			}
			if (current > totalCapacityCeiling) {
				form.setValue(
					`slotCapacitySettings.${role}.totalMax`,
					totalCapacityCeiling,
					{
						shouldDirty: true,
						shouldValidate: true,
					}
				)
			}
		}
	}, [form, totalCapacityCeiling])

	useEffect(() => {
		for (const role of ['agent', 'secretary'] as const) {
			const perTypeValues =
				form.getValues(`slotCapacitySettings.${role}.perTypeMax`) ?? {}
			const totalValue =
				form.getValues(`slotCapacitySettings.${role}.totalMax`) ??
				totalCapacityCeiling
			for (const [typeKey, rawValue] of Object.entries(perTypeValues)) {
				if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
					continue
				}
				if (rawValue <= 0) {
					if (rawValue < 0) {
						form.setValue(
							`slotCapacitySettings.${role}.perTypeMax.${typeKey}`,
							0,
							{
								shouldDirty: true,
								shouldValidate: true,
							}
						)
					}
					continue
				}
				const perTypeLimit =
					totalValue === 0
						? 0
						: Math.min(
								perTypeCapacityCeilings[typeKey] ?? totalCapacityCeiling,
								totalValue
							)
				if (perTypeLimit <= 0) {
					form.setValue(
						`slotCapacitySettings.${role}.perTypeMax.${typeKey}`,
						0,
						{
							shouldDirty: true,
							shouldValidate: true,
						}
					)
					continue
				}
				if (rawValue > perTypeLimit) {
					form.setValue(
						`slotCapacitySettings.${role}.perTypeMax.${typeKey}`,
						perTypeLimit,
						{
							shouldDirty: true,
							shouldValidate: true,
						}
					)
				}
			}
		}
	}, [form, perTypeCapacityCeilings, totalCapacityCeiling])

	const filteredDefaultViewOptions =
		availableViewValues.length > 0
			? CALENDAR_VIEW_OPTIONS.filter((option) =>
					availableViewValues.includes(option.value)
				)
			: CALENDAR_VIEW_OPTIONS

	return (
		<div className={cn('w-full space-y-4', className)}>
			{/* Calendar First Day */}
			<SectionCard
				description="Set which day the week starts on"
				title="Week Start Day"
			>
				<Controller
					control={control}
					name="calendarFirstDay"
					render={({ field }) => (
						<div className="space-y-2">
							<Label>First Day of Week</Label>
							<Select
								onValueChange={(value) => field.onChange(Number(value))}
								value={String(field.value ?? DEFAULT_CALENDAR_FIRST_DAY)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DAYS_OF_WEEK.map((day) => (
										<SelectItem key={day.value} value={String(day.value)}>
											{day.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				/>
			</SectionCard>

			{/* Event Durations */}
			<SectionCard
				description="Control how long reservations appear within each slot."
				title="Event Durations"
			>
				<div className="space-y-4">
					<Controller
						control={control}
						name="eventDurationSettings.strategy"
						render={({ field }) => (
							<div className="space-y-2">
								<Label>Duration Mode</Label>
								<Select
									onValueChange={(value) =>
										field.onChange(value as 'auto' | 'manual')
									}
									value={field.value ?? 'auto'}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto">
											Auto — divide slot length by capacity
										</SelectItem>
										<SelectItem value="manual">
											Manual — use custom durations below
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="eventDurationSettings.defaultMinutes"
						render={({ field }) => (
							<div className="space-y-1">
								<Label className="text-sm">Default Minutes</Label>
								<Input
									disabled={durationStrategy !== 'manual'}
									max={480}
									min={5}
									onChange={(event) => {
										const next = Number(event.target.value)
										field.onChange(
											Number.isNaN(next)
												? DEFAULT_EVENT_DURATION_MINUTES
												: clampDurationMinutes(next)
										)
									}}
									type="number"
									value={field.value ?? ''}
								/>
								<p className="text-muted-foreground text-xs">
									Used whenever a specific event type doesn&apos;t have an
									override.
								</p>
							</div>
						)}
					/>
					{durationStrategy === 'manual' && (
						<div className="space-y-3 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
							<Label className="text-sm">Per-Type Overrides</Label>
							<p className="text-muted-foreground text-xs">
								Clear the field or type 0 to inherit the default minutes. Use
								reset to copy the default value.
							</p>
							{EVENT_TYPE_COLOR_META.map((meta) => (
								<PerTypeDurationOverrideInput
									form={form}
									key={meta.typeValue}
									meta={meta}
									normalizedDefaultDuration={normalizedDefaultDuration}
								/>
							))}
						</div>
					)}
				</div>
			</SectionCard>

			{/* Slot Capacity */}
			<SectionCard
				description="Set the maximum reservations allowed per slot for each persona."
				title="Slot Capacity"
			>
				<div className="grid gap-4 md:grid-cols-2">
					{(['agent', 'secretary'] as const).map((role) => (
						<div
							className="space-y-3 rounded-lg border bg-background/40 p-3 backdrop-blur-sm"
							key={role}
						>
							<div className="space-y-0.5">
								<Label className="font-semibold text-sm">
									{role === 'agent' ? 'AI Agent' : 'Secretary / UI'}
								</Label>
								<p className="text-muted-foreground text-xs">
									{role === 'agent'
										? 'Applies to automated assistant/system agent actions.'
										: 'Applies to humans, undo flows, and calendar operations.'}
								</p>
							</div>
							<Controller
								control={control}
								name={`slotCapacitySettings.${role}.totalMax`}
								render={({ field }) => (
									<div className="space-y-1">
										<Label className="text-xs">Total Max Per Slot</Label>
										<Select
											onValueChange={(value) => {
												if (value === '0') {
													field.onChange(0)
													return
												}
												const parsed = Number(value)
												field.onChange(
													Number.isNaN(parsed) ? totalCapacityCeiling : parsed
												)
											}}
											value={String(
												typeof field.value === 'number'
													? field.value
													: totalCapacityCeiling
											)}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="0">Block (0)</SelectItem>
												{totalCapacityOptions.map((option) => (
													<SelectItem key={option} value={String(option)}>
														{formatCapacityLabel(option)}
														{option === totalCapacityCeiling ? ' (max)' : ''}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-[11px] text-muted-foreground">
											Max {formatCapacityLabel(totalCapacityCeiling)} per{' '}
											{formatSlotDurationLabel(slotDurationMinutes)} slot.
										</p>
									</div>
								)}
							/>
							<div className="space-y-2">
								<Label className="text-xs">Per-Type Limits</Label>
								<p className="text-[11px] text-muted-foreground">
									Select a specific limit, inherit the total, or block a type
									entirely.
								</p>
								{EVENT_TYPE_COLOR_META.map((meta) => {
									const typeKey = String(meta.typeValue)
									return (
										<Controller
											control={control}
											key={`${role}-${typeKey}`}
											name={`slotCapacitySettings.${role}.perTypeMax.${typeKey}`}
											render={({ field }) => {
												const roleTotal =
													typeof roleTotals[role] === 'number' &&
													Number.isFinite(roleTotals[role])
														? roleTotals[role]
														: totalCapacityCeiling
												const perTypeLimit =
													roleTotal === 0
														? 0
														: Math.min(
																perTypeCapacityCeilings[typeKey] ??
																	totalCapacityCeiling,
																roleTotal
															)
												const perTypeOptions =
													buildCapacityOptions(perTypeLimit)
												const selectedValue =
													typeof field.value === 'number'
														? String(field.value)
														: 'inherit'
												const normalizedValue =
													perTypeOptions.length === 0 &&
													selectedValue !== 'inherit' &&
													selectedValue !== '0'
														? 'inherit'
														: selectedValue
												return (
													<div className="flex items-center gap-2">
														<span className="flex-1 text-xs">{meta.label}</span>
														<Select
															onValueChange={(value) => {
																if (value === 'inherit') {
																	field.onChange(undefined)
																	return
																}
																if (value === '0') {
																	field.onChange(0)
																	return
																}
																const parsed = Number(value)
																field.onChange(
																	Number.isNaN(parsed) ? field.value : parsed
																)
															}}
															value={normalizedValue}
														>
															<SelectTrigger className="w-36">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="inherit">
																	Inherit total (
																	{roleTotal === 0
																		? '0 (blocked)'
																		: formatCapacityLabel(roleTotal)}
																	)
																</SelectItem>
																<SelectItem value="0">
																	Block type (0)
																</SelectItem>
																{perTypeOptions.length === 0 ? (
																	<SelectItem disabled value="__none">
																		No capacity available
																	</SelectItem>
																) : (
																	perTypeOptions.map((option) => (
																		<SelectItem
																			key={option}
																			value={String(option)}
																		>
																			{formatCapacityLabel(option)}
																		</SelectItem>
																	))
																)}
															</SelectContent>
														</Select>
													</div>
												)
											}}
										/>
									)
								})}
							</div>
						</div>
					))}
				</div>
			</SectionCard>

			{/* Event Time Format */}
			<SectionCard
				description="Configure how event times are displayed"
				title="Event Time Format"
			>
				<div className="space-y-4">
					<Controller
						control={control}
						name="eventTimeFormat.format"
						render={({ field }) => (
							<div className="space-y-2">
								<Label>Time Format</Label>
								<Select
									onValueChange={field.onChange}
									value={field.value ?? 'auto'}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIME_FORMATS.map((format) => (
											<SelectItem key={format.value} value={format.value}>
												{format.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="eventTimeFormat.showMinutes"
						render={({ field }) => (
							<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
								<div className="space-y-0.5">
									<Label className="font-medium text-sm">Show Minutes</Label>
									<p className="text-muted-foreground text-xs">
										Display minutes in event times
									</p>
								</div>
								<Switch
									checked={field.value ?? true}
									onCheckedChange={field.onChange}
								/>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="eventTimeFormat.showMeridiem"
						render={({ field }) => (
							<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
								<div className="space-y-0.5">
									<Label className="font-medium text-sm">Show AM/PM</Label>
									<p className="text-muted-foreground text-xs">
										Display meridiem for 12-hour format
									</p>
								</div>
								<Switch
									checked={field.value ?? true}
									onCheckedChange={field.onChange}
								/>
							</div>
						)}
					/>
				</div>
			</SectionCard>

			{/* Available Calendar Views */}
			<SectionCard
				description="Choose which FullCalendar views your team can access"
				title="Available Calendar Views"
			>
				<Controller
					control={control}
					name="availableCalendarViews"
					render={({ field }) => {
						const rawValue = Array.isArray(field.value) ? field.value : []
						const dedupedValue = Array.from(new Set(rawValue))
						const orderedValue = CALENDAR_VIEW_OPTIONS.filter((option) =>
							dedupedValue.includes(option.value)
						).map((option) => option.value)
						const isInvalid = orderedValue.length === 0
						const orderViews = (values: string[]) =>
							CALENDAR_VIEW_OPTIONS.filter((option) =>
								values.includes(option.value)
							).map((option) => option.value)

						const handleViewToggle = (viewValue: string) => {
							if (orderedValue.includes(viewValue)) {
								const next = orderedValue.filter((value) => value !== viewValue)
								const normalized = orderViews(next)
								field.onChange(normalized)
								if (next.length === 0) {
									form.setValue('defaultCalendarView', null, {
										shouldDirty: true,
										shouldTouch: true,
									})
								} else {
									const currentDefault = form.getValues('defaultCalendarView')
									if (
										!(currentDefault && normalized.includes(currentDefault))
									) {
										form.setValue(
											'defaultCalendarView',
											normalized[0] ?? null,
											{
												shouldDirty: true,
												shouldTouch: true,
											}
										)
									}
								}
								return
							}
							const next = orderViews([...orderedValue, viewValue])
							field.onChange(next)
							const currentDefault = form.getValues('defaultCalendarView')
							if (!currentDefault) {
								form.setValue('defaultCalendarView', viewValue, {
									shouldDirty: true,
									shouldTouch: true,
								})
							}
						}

						return (
							<div className="space-y-2">
								<Popover onOpenChange={setIsViewsOpen} open={isViewsOpen}>
									<PopoverTrigger asChild>
										<Button
											aria-expanded={isViewsOpen}
											className={cn(
												'w-full justify-between',
												isInvalid && 'border-destructive'
											)}
											role="combobox"
											variant="outline"
										>
											<div className="flex flex-wrap gap-1">
												{orderedValue.length > 0 ? (
													orderedValue.map((value) => {
														const option = CALENDAR_VIEW_OPTIONS.find(
															(view) => view.value === value
														)
														return (
															<Badge
																className="mr-1"
																key={value}
																variant="secondary"
															>
																{option?.label ?? value}
																{/* biome-ignore lint/a11y/useSemanticElements: nested buttons not allowed */}
																<span
																	className="ml-1 cursor-pointer rounded-full outline-none ring-offset-background hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
																	onClick={(e) => {
																		e.preventDefault()
																		e.stopPropagation()
																		handleViewToggle(value)
																	}}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter' || e.key === ' ') {
																			e.preventDefault()
																			e.stopPropagation()
																			handleViewToggle(value)
																		}
																	}}
																	onMouseDown={(e) => {
																		e.preventDefault()
																		e.stopPropagation()
																	}}
																	role="button"
																	tabIndex={0}
																>
																	<X className="size-3 text-muted-foreground hover:text-foreground" />
																</span>
															</Badge>
														)
													})
												) : (
													<span className="text-muted-foreground">
														Select calendar views...
													</span>
												)}
											</div>
											<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-full p-0">
										<Command>
											<CommandInput placeholder="Search views..." />
											<CommandList>
												<CommandEmpty>No view found.</CommandEmpty>
												<CommandGroup>
													{CALENDAR_VIEW_OPTIONS.map((view) => {
														const isChecked = orderedValue.includes(view.value)
														return (
															<CommandItem
																key={view.value}
																onSelect={(selectedValue) => {
																	handleViewToggle(selectedValue)
																}}
																value={view.value}
															>
																<Checkbox
																	checked={isChecked}
																	className="mr-2"
																/>
																{view.label}
															</CommandItem>
														)
													})}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
								{isInvalid ? (
									<p className="text-destructive text-xs">
										Select at least one calendar view *
									</p>
								) : (
									<p className="text-muted-foreground text-xs">
										These options show up in the calendar toolbar and navigation
										menus.
									</p>
								)}
							</div>
						)
					}}
				/>
			</SectionCard>

			{/* Default Calendar View */}
			<SectionCard
				description="Set the default view when opening the calendar"
				title="Default Calendar View"
			>
				<Controller
					control={control}
					name="defaultCalendarView"
					render={({ field }) => (
						<div className="space-y-2">
							<Label>Default View</Label>
							<Select
								disabled={filteredDefaultViewOptions.length === 0}
								onValueChange={field.onChange}
								value={
									filteredDefaultViewOptions.length === 0
										? ''
										: (field.value ??
											filteredDefaultViewOptions[0]?.value ??
											'timeGridWeek')
								}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={
											filteredDefaultViewOptions.length === 0
												? 'Select at least one calendar view first'
												: undefined
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{filteredDefaultViewOptions.map((view) => (
										<SelectItem key={view.value} value={view.value}>
											{view.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				/>
			</SectionCard>

			{/* Calendar Locale & Direction */}
			<SectionCard
				description="Configure calendar language and text direction"
				title="Calendar Locale & Direction"
			>
				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						control={control}
						name="calendarLocale"
						render={({ field }) => (
							<div className="space-y-2">
								<Label>Locale</Label>
								<Select
									onValueChange={(value) =>
										field.onChange(
											value === DEFAULT_LOCALE_VALUE ? null : value
										)
									}
									value={field.value ?? DEFAULT_LOCALE_VALUE}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select locale" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={DEFAULT_LOCALE_VALUE}>
											App Default (English)
										</SelectItem>
										{FULLCALENDAR_LOCALE_OPTIONS.map((locale) => (
											<SelectItem key={locale.value} value={locale.value}>
												{locale.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									Choose from FullCalendar&apos;s locale list or leave empty to
									inherit the default.
								</p>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="calendarDirection"
						render={({ field }) => (
							<div className="space-y-2">
								<Label>Text Direction</Label>
								<Select
									onValueChange={(value) =>
										field.onChange(value as 'ltr' | 'rtl' | 'auto')
									}
									value={field.value ?? 'auto'}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DIRECTION_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					/>
				</div>
			</SectionCard>

			{/* Event Colors */}
			<SectionCard
				description="Configure event color scheme by event type"
				title="Event Colors"
			>
				<div className="space-y-6">
					<div className="space-y-1.5">
						<p className="font-medium text-sm">
							Color coding is always enabled.
						</p>
						<p className="text-muted-foreground text-xs">
							These presets mirror the palette defined in FullCalendar’s CSS
							variables so the config matches what users see in the calendar.
						</p>
					</div>
					<div className="space-y-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
						{EVENT_TYPE_COLOR_META.map((meta) => {
							const typeKey = String(meta.typeValue)
							return (
								<div className="space-y-3" key={typeKey}>
									<div className="space-y-1">
										<Label className="font-medium text-sm">{meta.label}</Label>
										<p className="text-muted-foreground text-xs">
											{meta.description}
										</p>
									</div>
									<Controller
										control={control}
										name={`eventColors.eventColorByType.${typeKey}`}
										render={({ field }) => {
											const currentColors =
												(field.value as EventTypeColorConfig | undefined) ??
												meta.defaultColors
											return (
												<div className="grid gap-3 md:grid-cols-2">
													<div className="space-y-2">
														<Label className="text-xs">Background</Label>
														<div className="flex items-center gap-2">
															<Popover>
																<PopoverTrigger asChild>
																	<Button
																		aria-label={`${meta.label} background color picker`}
																		className="h-9 w-24 border-2 p-1"
																		style={{
																			backgroundColor: currentColors.background,
																		}}
																		variant="outline"
																	>
																		<div
																			className="h-full w-full rounded"
																			style={{
																				backgroundColor:
																					currentColors.background,
																			}}
																		/>
																	</Button>
																</PopoverTrigger>
																<PopoverContent className="w-auto p-4">
																	<ColorPicker
																		className="w-full max-w-[300px]"
																		defaultValue={meta.defaultColors.background}
																		onChange={(hex) => {
																			field.onChange({
																				background: hex,
																				border: currentColors.border,
																			})
																		}}
																		value={currentColors.background}
																	>
																		<ColorPickerSelection />
																		<div className="flex items-center gap-4">
																			<ColorPickerEyeDropper />
																			<div className="grid w-full gap-1">
																				<ColorPickerHue />
																				<ColorPickerAlpha />
																			</div>
																		</div>
																		<div className="flex items-center gap-2">
																			<ColorPickerOutput />
																			<ColorPickerFormat />
																		</div>
																	</ColorPicker>
																</PopoverContent>
															</Popover>
															<Input
																aria-label={`${meta.label} background hex value`}
																className="flex-1"
																onChange={(e) => {
																	field.onChange({
																		background:
																			e.target.value ||
																			meta.defaultColors.background,
																		border: currentColors.border,
																	})
																}}
																placeholder={meta.defaultColors.background}
																type="text"
																value={currentColors.background}
															/>
														</div>
													</div>
													<div className="space-y-2">
														<Label className="text-xs">Border/Stroke</Label>
														<div className="flex items-center gap-2">
															<Popover>
																<PopoverTrigger asChild>
																	<Button
																		aria-label={`${meta.label} border color picker`}
																		className="h-9 w-24 border-2 p-1"
																		style={{
																			backgroundColor: currentColors.border,
																		}}
																		variant="outline"
																	>
																		<div
																			className="h-full w-full rounded"
																			style={{
																				backgroundColor: currentColors.border,
																			}}
																		/>
																	</Button>
																</PopoverTrigger>
																<PopoverContent className="w-auto p-4">
																	<ColorPicker
																		className="w-full max-w-[300px]"
																		defaultValue={meta.defaultColors.border}
																		onChange={(hex) => {
																			field.onChange({
																				background: currentColors.background,
																				border: hex,
																			})
																		}}
																		value={currentColors.border}
																	>
																		<ColorPickerSelection />
																		<div className="flex items-center gap-4">
																			<ColorPickerEyeDropper />
																			<div className="grid w-full gap-1">
																				<ColorPickerHue />
																				<ColorPickerAlpha />
																			</div>
																		</div>
																		<div className="flex items-center gap-2">
																			<ColorPickerOutput />
																			<ColorPickerFormat />
																		</div>
																	</ColorPicker>
																</PopoverContent>
															</Popover>
															<Input
																aria-label={`${meta.label} border hex value`}
																className="flex-1"
																onChange={(e) => {
																	field.onChange({
																		background: currentColors.background,
																		border:
																			e.target.value ||
																			meta.defaultColors.border,
																	})
																}}
																placeholder={meta.defaultColors.border}
																type="text"
																value={currentColors.border}
															/>
														</div>
													</div>
												</div>
											)
										}}
									/>
								</div>
							)
						})}
					</div>
					<div className="space-y-3 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
						<Label className="font-medium text-sm">Document Highlight</Label>
						<p className="text-muted-foreground text-xs">
							Events with uploaded documents automatically receive a colored
							stroke so users can spot paperwork at a glance.
						</p>
						<Controller
							control={control}
							name="eventColors.documentStrokeColor"
							render={({ field }) => {
								const currentValue =
									(field.value as string | undefined) ??
									DOCUMENT_EVENT_STROKE_COLOR
								return (
									<div className="space-y-2">
										<Label className="text-xs">Stroke Color</Label>
										<div className="flex items-center gap-2">
											<Popover>
												<PopoverTrigger asChild>
													<Button
														aria-label="Document stroke color picker"
														className="h-9 w-24 border-2 p-1"
														style={{ backgroundColor: currentValue }}
														variant="outline"
													>
														<div
															className="h-full w-full rounded"
															style={{ backgroundColor: currentValue }}
														/>
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-4">
													<ColorPicker
														className="w-full max-w-[300px]"
														defaultValue={DOCUMENT_EVENT_STROKE_COLOR}
														onChange={(hex) => field.onChange(hex)}
														value={currentValue}
													>
														<ColorPickerSelection />
														<div className="flex items-center gap-4">
															<ColorPickerEyeDropper />
															<div className="grid w-full gap-1">
																<ColorPickerHue />
																<ColorPickerAlpha />
															</div>
														</div>
														<div className="flex items-center gap-2">
															<ColorPickerOutput />
															<ColorPickerFormat />
														</div>
													</ColorPicker>
												</PopoverContent>
											</Popover>
											<Input
												aria-label="Document stroke hex value"
												className="flex-1"
												onChange={(e) =>
													field.onChange(
														e.target.value || DOCUMENT_EVENT_STROKE_COLOR
													)
												}
												placeholder={DOCUMENT_EVENT_STROKE_COLOR}
												type="text"
												value={currentValue}
											/>
										</div>
									</div>
								)
							}}
						/>
					</div>
				</div>
			</SectionCard>

			{/* Event Loading Behavior */}
			<SectionCard
				description="Control how many events appear per day and how the '+X more' link behaves"
				title="Event Display Limits"
			>
				<div className="space-y-4">
					<Controller
						control={control}
						name="eventLoading.dayMaxEvents"
						render={({ field }) => {
							const currentValue = field.value ?? true
							const limitEnabled = currentValue !== false
							const numericValue =
								typeof currentValue === 'number' ? String(currentValue) : ''
							return (
								<div className="space-y-3">
									<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
										<div className="space-y-0.5">
											<Label className="font-medium text-sm">
												Limit Events Per Day
											</Label>
											<p className="text-muted-foreground text-xs">
												Show "+X more" link when day has too many events
											</p>
										</div>
										<Switch
											checked={limitEnabled}
											onCheckedChange={(checked) => {
												if (!checked) {
													field.onChange(false)
													return
												}
												if (
													typeof field.value === 'number' &&
													field.value > 0
												) {
													field.onChange(field.value)
													return
												}
												field.onChange(true)
											}}
										/>
									</div>
									{limitEnabled && (
										<div className="space-y-2">
											<Label>Specific Limit (optional)</Label>
											<Input
												min={1}
												onChange={(e) => {
													if (e.target.value === '') {
														field.onChange(true)
														return
													}
													const num = Number(e.target.value)
													if (num > 0 && Number.isFinite(num)) {
														field.onChange(num)
													}
												}}
												placeholder="Leave blank to let FullCalendar decide"
												type="number"
												value={numericValue}
											/>
											<p className="text-muted-foreground text-xs">
												Provide a concrete number of events before "+X more"
												appears, or leave blank to rely on FullCalendar&apos;s
												automatic behavior.
											</p>
										</div>
									)}
								</div>
							)
						}}
					/>
					<Controller
						control={control}
						name="eventLoading.moreLinkClick"
						render={({ field }) => (
							<div className="space-y-2">
								<Label>More Link Behavior</Label>
								<Select
									onValueChange={(value) =>
										field.onChange(
											value as
												| 'popover'
												| 'week'
												| 'day'
												| 'timeGridWeek'
												| 'timeGridDay'
										)
									}
									value={field.value ?? 'popover'}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="popover">
											Popover (show events in popup)
										</SelectItem>
										<SelectItem value="week">Navigate to Week View</SelectItem>
										<SelectItem value="day">Navigate to Day View</SelectItem>
										<SelectItem value="timeGridWeek">
											Navigate to Time Grid Week
										</SelectItem>
										<SelectItem value="timeGridDay">
											Navigate to Time Grid Day
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									What happens when user clicks "+X more" link
								</p>
							</div>
						)}
					/>
				</div>
			</SectionCard>
		</div>
	)
}
