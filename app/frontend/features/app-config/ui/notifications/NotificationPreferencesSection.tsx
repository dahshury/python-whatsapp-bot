'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { cn } from '@/shared/libs/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import type { AppConfigFormValues } from '../../model'
import { SectionCard } from '../working-hours/components/section-card'

type NotificationPreferencesSectionProps = {
	form: UseFormReturn<AppConfigFormValues>
	className?: string
}

export const NotificationPreferencesSection = ({
	form,
	className,
}: NotificationPreferencesSectionProps) => {
	const { control } = form
	const supportsDesktopNotifications = useMemo(
		() =>
			typeof window !== 'undefined' &&
			typeof window.Notification !== 'undefined',
		[]
	)
	const [desktopPermission, setDesktopPermission] = useState<
		NotificationPermission | 'unsupported'
	>('default')
	const [desktopRequestPending, setDesktopRequestPending] = useState(false)

	useEffect(() => {
		if (!supportsDesktopNotifications) {
			setDesktopPermission('unsupported')
			return
		}
		setDesktopPermission(Notification.permission)
	}, [supportsDesktopNotifications])

	const desktopDisabled =
		desktopPermission === 'unsupported' || desktopPermission === 'denied'
	const quietHours = form.watch('notificationPreferences.quietHours')
	const quietHoursEnabled = Boolean(
		quietHours && (quietHours.start || quietHours.end)
	)

	return (
		<div className={cn('mt-6 w-full space-y-4', className)}>
			<SectionCard
				description="Configure when and how users are notified of calendar changes"
				title="Notification Preferences"
			>
				<div className="space-y-4">
					{/* Event Notifications */}
					<div className="space-y-3">
						<Label className="font-medium text-sm">Event Notifications</Label>
						<Controller
							control={control}
							name="notificationPreferences.notifyOnEventCreate"
							render={({ field }) => (
								<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">On Create</Label>
										<p className="text-muted-foreground text-xs">
											Notify when events are created
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
							name="notificationPreferences.notifyOnEventUpdate"
							render={({ field }) => (
								<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">On Update</Label>
										<p className="text-muted-foreground text-xs">
											Notify when events are updated
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
							name="notificationPreferences.notifyOnEventDelete"
							render={({ field }) => (
								<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">On Delete</Label>
										<p className="text-muted-foreground text-xs">
											Notify when events are deleted
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
							name="notificationPreferences.notifyOnEventReminder"
							render={({ field }) => (
								<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">Reminders</Label>
										<p className="text-muted-foreground text-xs">
											Notify for upcoming events
										</p>
									</div>
									<Switch
										checked={field.value ?? false}
										onCheckedChange={field.onChange}
									/>
								</div>
							)}
						/>
					</div>

					{/* Notification Channels */}
					<div className="space-y-3">
						<Label className="font-medium text-sm">Notification Channels</Label>
						<Controller
							control={control}
							name="notificationPreferences.notificationSound"
							render={({ field }) => (
								<div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">Sound</Label>
										<p className="text-muted-foreground text-xs">
											Play sound for notifications
										</p>
									</div>
									<Switch
										checked={field.value ?? false}
										onCheckedChange={field.onChange}
									/>
								</div>
							)}
						/>
						<Controller
							control={control}
							name="notificationPreferences.notificationDesktop"
							render={({ field }) => (
								<div className="flex flex-col gap-1.5 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
									<div className="space-y-0.5">
										<Label className="font-medium text-sm">Desktop</Label>
										<p className="text-muted-foreground text-xs">
											Show browser desktop notifications
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Switch
											checked={field.value ?? false}
											disabled={
												desktopDisabled ||
												desktopRequestPending ||
												!supportsDesktopNotifications
											}
											onCheckedChange={async (checked) => {
												if (!supportsDesktopNotifications) {
													field.onChange(false)
													return
												}
												if (!checked) {
													field.onChange(false)
													return
												}
												if (desktopPermission === 'granted') {
													field.onChange(true)
													return
												}
												setDesktopRequestPending(true)
												try {
													const result = await Notification.requestPermission()
													setDesktopPermission(result)
													if (result === 'granted') {
														field.onChange(true)
													} else {
														field.onChange(false)
													}
												} catch {
													field.onChange(false)
												} finally {
													setDesktopRequestPending(false)
												}
											}}
										/>
										{desktopRequestPending && (
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										)}
									</div>
									{!supportsDesktopNotifications && (
										<p className="text-muted-foreground text-xs">
											Desktop notifications are not supported in this browser.
										</p>
									)}
									{desktopPermission === 'denied' && (
										<p className="text-destructive text-xs">
											Permission denied. Enable notifications in your browser
											settings to re-activate this option.
										</p>
									)}
								</div>
							)}
						/>
					</div>

					{/* Notification Settings */}
					<div className="space-y-3">
						<Label className="font-medium text-sm">Notification Settings</Label>
						<div className="space-y-4 rounded-lg border bg-background/40 p-4 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="font-medium text-sm">Quiet Hours</Label>
									<p className="text-muted-foreground text-xs">
										Suppress notifications during the selected window
									</p>
								</div>
								<Switch
									checked={quietHoursEnabled}
									onCheckedChange={(checked) => {
										if (checked) {
											const current = form.getValues(
												'notificationPreferences.quietHours'
											) ?? {
												start: '',
												end: '',
											}
											const fallbackStart = current.start || '22:00'
											const fallbackEnd = current.end || '06:00'
											form.setValue(
												'notificationPreferences.quietHours',
												{
													start: fallbackStart,
													end: fallbackEnd,
												},
												{ shouldDirty: true }
											)
										} else {
											form.setValue(
												'notificationPreferences.quietHours',
												null,
												{ shouldDirty: true }
											)
										}
									}}
								/>
							</div>
							{quietHoursEnabled && (
								<div className="flex items-center gap-4">
									<div className="flex-1">
										<Input
											onChange={(e) => {
												const current = form.getValues(
													'notificationPreferences.quietHours'
												) ?? {
													start: '',
													end: '',
												}
												form.setValue(
													'notificationPreferences.quietHours',
													{
														...current,
														start: e.target.value,
													},
													{ shouldDirty: true }
												)
											}}
											placeholder="22:00"
											type="time"
											value={
												form.watch('notificationPreferences.quietHours')
													?.start ?? ''
											}
										/>
									</div>
									<div className="flex-1">
										<Input
											onChange={(e) => {
												const current = form.getValues(
													'notificationPreferences.quietHours'
												) ?? {
													start: '',
													end: '',
												}
												form.setValue(
													'notificationPreferences.quietHours',
													{
														...current,
														end: e.target.value,
													},
													{ shouldDirty: true }
												)
											}}
											placeholder="06:00"
											type="time"
											value={
												form.watch('notificationPreferences.quietHours')?.end ??
												''
											}
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</SectionCard>
		</div>
	)
}
