'use client'

import React from 'react'
import { toast as sonner } from 'sonner'
import { UNDOABLE_TOAST_DURATION_MS } from '../constants'

export type ThemedUndoableOptions = {
	title: string
	subtitle: string | undefined
	actionLabel: string
	onClick: () => void
	duration?: number
}

export function themedUndoable({
	title,
	subtitle,
	actionLabel,
	onClick,
	duration = UNDOABLE_TOAST_DURATION_MS,
}: ThemedUndoableOptions) {
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
							title
						),
						subtitle
							? React.createElement(
									'div',
									{ className: 'fancy-toast-sub' },
									subtitle
								)
							: null
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
										onClick()
									} finally {
										try {
											sonner.dismiss(id)
										} catch {
											// Toast dismiss failed - continue execution
										}
									}
								},
							},
							actionLabel
						),
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
							'Dismiss'
						)
					)
				)
			),
		{ duration }
	)
}
