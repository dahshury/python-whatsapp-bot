'use client'

import { formatTimeAgoString } from '@shared/libs/date/time-ago-utils'
import { calculateTimestamp } from '@shared/libs/date/timestamp-utils'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { getInitials } from '@shared/libs/utils/initials'
import React from 'react'
import { toast as sonner } from 'sonner'
import {
	getUnknownCustomerLabel,
	isSameAsWaId,
} from '@/shared/libs/customer-name'
import { INFO_TOAST_DURATION_MS, MAX_MESSAGE_CONTENT_LENGTH } from './constants'
import type { MessageToastPayload } from './types'

export function newMessage(payload: MessageToastPayload) {
	const { description, customerName, date, time, message, isLocalized } =
		payload
	const waId = String(payload.wa_id || payload.waId || '')
	const normalizedName =
		typeof customerName === 'string' ? customerName.trim() : ''
	const displayName =
		normalizedName && !isSameAsWaId(normalizedName, waId)
			? normalizedName
			: getUnknownCustomerLabel(isLocalized)
	const initials = getInitials(displayName)
	const messageContent = (message || description || '').slice(
		0,
		MAX_MESSAGE_CONTENT_LENGTH
	)
	const timestamp = calculateTimestamp(date, time)
	const timeAgo = formatTimeAgoString(timestamp, isLocalized)

	sonner.custom(
		(id) =>
			React.createElement(
				'div',
				{
					className: 'sonner-description cursor-pointer',
					role: 'button',
					tabIndex: 0,
					onClick: () => {
						try {
							if (waId) {
								useSidebarChatStore.getState().openConversation(waId)
								try {
									;(
										globalThis as unknown as { __chatScrollTarget?: unknown }
									).__chatScrollTarget = {
										waId,
										date,
										time,
										message,
									}
								} catch {
									// Scroll target set failed - continue with event dispatch
								}
								try {
									const evt = new CustomEvent('chat:scrollToMessage', {
										detail: { wa_id: waId, date, time, message },
									})
									window.dispatchEvent(evt)
								} catch {
									// Event dispatch failed - scroll may not work
								}
							}
						} finally {
							try {
								sonner.dismiss(id)
							} catch {
								// Toast dismiss failed - continue execution
							}
						}
					},
					onKeyDown: (e: unknown) => {
						try {
							const ev = e as KeyboardEvent
							if (ev.key === 'Enter' || ev.key === ' ') {
								ev.preventDefault()
								;(document.activeElement as HTMLElement | null)?.click?.()
							}
						} catch {
							// Keyboard event handling failed - continue execution
						}
					},
				},
				React.createElement(
					'div',
					{ className: 'flex items-start gap-3' },
					React.createElement(
						'div',
						{
							className:
								'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground',
						},
						React.createElement(
							'span',
							{ className: 'font-semibold text-sm' },
							initials
						)
					),
					React.createElement(
						'div',
						{ className: 'flex flex-col gap-1' },
						React.createElement(
							'div',
							{ className: 'flex items-center gap-2' },
							React.createElement(
								'strong',
								{ className: 'text-sm' },
								displayName
							),
							React.createElement(
								'span',
								{
									className:
										'rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs',
								},
								'New'
							)
						),
						messageContent
							? React.createElement(
									'p',
									{ className: 'text-sm' },
									messageContent
								)
							: null,
						timeAgo
							? React.createElement(
									'span',
									{ className: 'text-muted-foreground text-xs' },
									timeAgo
								)
							: null
					)
				)
			),
		{ duration: INFO_TOAST_DURATION_MS }
	)
}
