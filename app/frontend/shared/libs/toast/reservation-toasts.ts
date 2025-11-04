import { to12HourFormat } from '@shared/libs/date/toast-time-utils'
import { i18n } from '@shared/libs/i18n'
import { themed, themedError } from './renderers'
import type { ReservationToastPayload } from './types'

export function reservationCreated(payload: ReservationToastPayload) {
	const { customer, wa_id, date, time, isLocalized } = payload
	const title = i18n.getMessage('toast_reservation_created', isLocalized)
	const name = customer || wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')
	themed(title, details)
}

export function reservationModified(payload: ReservationToastPayload) {
	const { customer, wa_id, date, time, isLocalized } = payload
	const title = i18n.getMessage('toast_reservation_modified', isLocalized)
	const name = customer || wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')
	themed(title, details)
}

export function reservationCancelled(payload: ReservationToastPayload) {
	const { customer, wa_id, date, time, isLocalized } = payload
	const title = i18n.getMessage('toast_reservation_cancelled', isLocalized)
	const name = customer || ''
	const phone = wa_id || ''
	const displayTime = to12HourFormat(time)
	const details = [name, phone, date, displayTime]
		.filter(Boolean)
		.join(isLocalized ? ' • ' : ' • ')
	themed(title, details)
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
