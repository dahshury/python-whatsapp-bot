'use client'

import { i18n } from '@shared/libs/i18n'
import React from 'react'
import { toast as sonner } from 'sonner'
import {
	DEFAULT_TOAST_DURATION_MS,
	ERROR_TOAST_DURATION_MS,
	INFO_TOAST_DURATION_MS,
	PROMISE_LOADING_DURATION_MS,
	UNDOABLE_TOAST_DURATION_MS,
} from './constants'
import { newMessage } from './message-toast'
import { themed, themedError, themedUndoable } from './renderers'
import {
	reservationCancelled,
	reservationCreated,
	reservationModificationFailed,
	reservationModified,
} from './reservation-toasts'

// Re-export types for backward compatibility
export type { MessageToastPayload, ReservationToastPayload } from './types'

export const toastService = {
	reservationCreated,
	reservationModified,
	reservationCancelled,
	reservationModificationFailed,
	success(
		title: string,
		description?: string,
		duration = DEFAULT_TOAST_DURATION_MS
	) {
		themed(title, description, duration)
	},
	error(
		title: string,
		description?: string,
		duration = ERROR_TOAST_DURATION_MS
	) {
		themedError(title, description, duration)
	},
	promise<T>(
		promise: Promise<T>,
		messages: {
			loading: string
			success: string | ((value: T) => string | React.ReactNode)
			error: string | ((error: unknown) => string | React.ReactNode)
			duration?: number
		}
	) {
		const { loading, success, error, duration } = messages
		const dismissLabel = i18n.getMessage('toast_dismiss')
		// Show a themed loading toast first, then update it with success/error
		const loadingId = sonner.custom(
			(id) =>
				React.createElement(
					'div',
					{ className: 'sonner-description fancy-toast' },
					React.createElement('div', { className: 'fancy-toast-bg' }),
					React.createElement(
						'div',
						{
							className:
								'fancy-toast-content flex items-center justify-between gap-4',
						},
						React.createElement(
							'div',
							{ className: 'flex flex-col gap-0.5' },
							React.createElement(
								'div',
								{ className: 'fancy-toast-title' },
								loading
							)
						),
						React.createElement(
							'div',
							{ className: 'flex shrink-0 gap-2' },
							React.createElement(
								'button',
								{
									type: 'button',
									className:
										'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
									onClick: () => {
										try {
											sonner.dismiss(id)
										} catch {
											// ignore
										}
									},
								},
								dismissLabel
							)
						)
					)
				),
			{ duration: PROMISE_LOADING_DURATION_MS }
		)

		// When the promise resolves/rejects, update the same toast using the same id
		promise
			.then((value) => {
				const successText =
					typeof success === 'function'
						? (success as (v: T) => React.ReactNode)(value)
						: success
				try {
					sonner.custom(
						(id) =>
							React.createElement(
								'div',
								{ className: 'sonner-description fancy-toast' },
								React.createElement('div', { className: 'fancy-toast-bg' }),
								React.createElement(
									'div',
									{
										className:
											'fancy-toast-content flex items-center justify-between gap-4',
									},
									React.createElement(
										'div',
										{ className: 'flex flex-col gap-0.5' },
										React.createElement(
											'div',
											{ className: 'fancy-toast-title' },
											successText as React.ReactNode
										)
									),
									React.createElement(
										'div',
										{ className: 'flex shrink-0 gap-2' },
										React.createElement(
											'button',
											{
												type: 'button',
												className:
													'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
												onClick: () => {
													try {
														sonner.dismiss(id)
													} catch {
														// ignore
													}
												},
											},
											dismissLabel
										)
									)
								)
							),
						{
							id: loadingId,
							duration:
								typeof duration === 'number'
									? duration
									: DEFAULT_TOAST_DURATION_MS,
						}
					)
				} catch {
					try {
						sonner.dismiss(loadingId)
					} catch {
						// Toast dismiss failed - continue with fallback
					}
					themed(String(successText))
				}
				return value
			})
			.catch((err) => {
				const errorText =
					typeof error === 'function'
						? (error as (e: unknown) => React.ReactNode)(err)
						: error
				try {
					sonner.custom(
						(id) =>
							React.createElement(
								'div',
								{
									className: 'sonner-description fancy-toast fancy-toast-error',
								},
								React.createElement('div', { className: 'fancy-toast-bg' }),
								React.createElement(
									'div',
									{
										className:
											'fancy-toast-content flex items-center justify-between gap-4',
									},
									React.createElement(
										'div',
										{ className: 'flex flex-col gap-0.5' },
										React.createElement(
											'div',
											{ className: 'fancy-toast-title' },
											errorText as React.ReactNode
										)
									),
									React.createElement(
										'div',
										{ className: 'flex shrink-0 gap-2' },
										React.createElement(
											'button',
											{
												type: 'button',
												className:
													'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
												onClick: () => {
													try {
														sonner.dismiss(id)
													} catch {
														// ignore
													}
												},
											},
											dismissLabel
										)
									)
								)
							),
						{
							id: loadingId,
							duration:
								typeof duration === 'number'
									? duration
									: ERROR_TOAST_DURATION_MS,
						}
					)
				} catch {
					try {
						sonner.dismiss(loadingId)
					} catch {
						// Toast dismiss failed - continue with fallback
					}
					themedError(String(errorText))
				}
				// Re-throw to preserve promise semantics if caller awaits
				throw err
			})

		return promise
	},
	undoable(options: {
		title: string
		description: string | undefined
		actionLabel: string
		onClick: () => void
		duration?: number
	}) {
		themedUndoable({
			title: options.title,
			subtitle: options.description,
			actionLabel: options.actionLabel,
			onClick: options.onClick,
			duration: options.duration ?? UNDOABLE_TOAST_DURATION_MS,
		})
	},
	newMessage,
	info(title: string, description?: string, duration = INFO_TOAST_DURATION_MS) {
		themed(title, description, duration)
	},
}
