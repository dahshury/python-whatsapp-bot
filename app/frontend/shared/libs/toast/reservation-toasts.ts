import { to12HourFormat } from '@shared/libs/date/toast-time-utils'
import { i18n } from '@shared/libs/i18n'
import { themed, themedError, themedUndoable } from './renderers'
import type { ReservationToastPayload } from './types'

export type ReservationUndoData = {
	reservationId?: number
	waId?: string
	originalData?: {
		wa_id: string
		date: string
		time_slot: string
		customer_name?: string
		type?: number
	}
}

export type ReservationToastWithUndoPayload = ReservationToastPayload & {
	undoData?: ReservationUndoData
	onUndo?: () => void
}

export function reservationCreated(payload: ReservationToastWithUndoPayload) {
	const { customer, wa_id, date, time, isLocalized, onUndo } = payload
	const title = i18n.getMessage('toast_reservation_created', isLocalized)
	const name = customer || wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')

	if (onUndo) {
		themedUndoable({
			title,
			subtitle: details,
			actionLabel: i18n.getMessage('toast_undo', isLocalized),
			onClick: onUndo,
		})
	} else {
		themed(title, details)
	}
}

export function reservationModified(payload: ReservationToastWithUndoPayload) {
	const { customer, wa_id, date, time, isLocalized, onUndo } = payload
	const title = i18n.getMessage('toast_reservation_modified', isLocalized)
	const name = customer || wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')

	if (onUndo) {
		themedUndoable({
			title,
			subtitle: details,
			actionLabel: i18n.getMessage('toast_undo', isLocalized),
			onClick: onUndo,
		})
	} else {
		themed(title, details)
	}
}

export function reservationCancelled(payload: ReservationToastWithUndoPayload) {
	const { customer, wa_id, date, time, isLocalized, onUndo } = payload
	const title = i18n.getMessage('toast_reservation_cancelled', isLocalized)
	const name = customer || ''
	const phone = wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, phone, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')

	if (onUndo) {
		themedUndoable({
			title,
			subtitle: details,
			actionLabel: i18n.getMessage('toast_undo', isLocalized),
			onClick: onUndo,
		})
	} else {
		themed(title, details)
	}
}

export function reservationModificationFailed(
	payload: ReservationToastPayload & { error?: string }
) {
	const { customer, wa_id, date, time, isLocalized, error } = payload
	const title = i18n.getMessage(
		'toast_reservation_modification_failed',
		isLocalized
	)
	const name = customer || wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')
	const errorPrefix = i18n.getMessage('toast_error_prefix', isLocalized)
	const subtitle = error ? `${errorPrefix}: ${error}` : details
	themedError(title, subtitle)
}
