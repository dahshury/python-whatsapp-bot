import { useCustomerData } from '@shared/libs/data/customer-data-context'
import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { parsePhoneNumber } from 'react-phone-number-input'
import type { PhoneOption } from '@/entities/phone'
import GridPhoneCombobox from '@/shared/libs/data-grid/components/ui/GridPhoneCombobox'

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber: string): string => {
	if (!phoneNumber) {
		return ''
	}

	// Ensure it starts with +
	let formattedNumber = phoneNumber
	if (!phoneNumber.startsWith('+')) {
		formattedNumber = `+${phoneNumber}`
	}

	try {
		const parsed = parsePhoneNumber(formattedNumber)
		if (parsed) {
			// Return formatted international number
			return parsed.formatInternational()
		}
	} catch {
		// Return as-is if parsing fails
		return formattedNumber
	}

	return formattedNumber
}

type PhoneCellEditorProps = {
	value: string
	onChange: (value: string) => void
	onFinishedEditing: (save: boolean) => void
}

const PhoneCellEditor: FC<PhoneCellEditorProps> = ({
	value,
	onChange,
	onFinishedEditing: _onFinishedEditing,
}) => {
	// Ensure a sensible default when starting to edit a new/empty cell: '+966 '
	const hasInitializedRef = useRef(false)
	useEffect(() => {
		if (hasInitializedRef.current) {
			return
		}
		const initial = String(value || '')
		if (initial.trim() === '') {
			onChange('+966 ')
		}
		hasInitializedRef.current = true
	}, [value, onChange])
	// Get real customer data
	const { customers, conversations, reservations, loading } = useCustomerData()

	// Create phone options from real customer data
	const phoneOptions: PhoneOption[] = useMemo(() => {
		const getReservationTimestamp = (entry: {
			start?: string
			end?: string
			date?: string
			updated_at?: string
			modified_at?: string
			last_modified?: string
			modified_on?: string
			update_ts?: string
		}) => {
			const candidates = [
				entry?.start,
				entry?.end,
				entry?.date,
				entry?.updated_at,
				entry?.modified_at,
				entry?.last_modified,
				entry?.modified_on,
				entry?.update_ts,
			]
			for (const candidate of candidates) {
				if (candidate && typeof candidate === 'string') {
					const ts = Date.parse(candidate)
					if (!Number.isNaN(ts)) {
						return ts
					}
				}
			}
			return 0
		}

		return customers.map((customer) => {
			const phoneNumber = customer.phone || customer.id
			const formattedPhone = formatPhoneForDisplay(phoneNumber)

			// Extract country from the formatted phone number (with + prefix)
			let country = 'US' // default
			try {
				const parsed = parsePhoneNumber(formattedPhone)
				country = parsed?.country || 'US'
			} catch {
				// Keep default
			}

			const conversationKey = String(customer.phone || customer.id || '')
			const messages = conversations[conversationKey] || []
			const lastMessageAt = messages.reduce<number>((latest, message) => {
				const rawTs = (message as { ts?: string }).ts
				if (!rawTs) {
					return latest
				}
				const timestamp = Date.parse(rawTs)
				if (Number.isNaN(timestamp)) {
					return latest
				}
				return Math.max(latest, timestamp)
			}, 0)

			const reservationEntries = reservations[conversationKey] || []
			const lastReservationAt = reservationEntries.reduce<number>(
				(latest, entry) => {
					const ts = getReservationTimestamp(entry)
					if (!ts) {
						return latest
					}
					return Math.max(latest, ts)
				},
				0
			)

			return {
				number: formattedPhone,
				name: customer.name || 'Unknown Customer',
				country,
				label: country,
				id: customer.id,
				...(lastMessageAt ? { lastMessageAt } : {}),
				...(lastReservationAt ? { lastReservationAt } : {}),
			}
		})
	}, [customers, conversations, reservations])

	// Prevent hydration mismatch and show loading state
	if (loading) {
		return (
			<div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
				<span className="text-muted-foreground">Loading customers...</span>
			</div>
		)
	}

	return (
		<div
			className="glide-data-grid-overlay-editor flex flex-col"
			dir="ltr"
			style={{ direction: 'ltr' }}
		>
			<GridPhoneCombobox
				allowCreateNew={true}
				onChange={onChange}
				phoneOptions={phoneOptions}
				value={value}
			/>
		</div>
	)
}

export { PhoneCellEditor }
