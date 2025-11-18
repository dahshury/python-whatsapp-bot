'use client'

import { useMemo } from 'react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/select'

// Regex patterns for timezone parsing - defined at top level for performance
const TIMEZONE_OFFSET_PREFIX_REGEX = /\([^)]+\)\s*(.+)$/
const GMT_OFFSET_REGEX = /GMT([+-]?\d+)/
const ISO_OFFSET_REGEX = /([+-])(\d{1,2}):?(\d{0,2})/

type TimezoneSelectorProps = {
	value?: string
	onValueChange?: (value: string) => void
}

export function TimezoneSelector({
	value,
	onValueChange,
}: TimezoneSelectorProps) {
	const timezones = Intl.supportedValuesOf('timeZone')

	// Safeguard: Strip any offset prefix if somehow included in the value
	// This ensures we always work with just the timezone identifier (e.g., "Asia/Riyadh")
	const normalizeTimezoneValue = (
		tz: string | undefined
	): string | undefined => {
		if (!tz) {
			return
		}
		// Check if value contains offset prefix like "(GMT+3) Asia/Riyadh" or "(GMT+3) Asia Riyadh"
		// If so, extract just the timezone part and normalize spaces to underscores
		const match = tz.match(TIMEZONE_OFFSET_PREFIX_REGEX)
		if (match?.[1]) {
			// Extract timezone and normalize spaces to underscores for IANA format
			return match[1].trim().replace(/\s+/g, '_')
		}
		// If it's already a valid timezone identifier (contains /), return as-is
		if (tz.includes('/')) {
			return tz
		}
		// If it's a space-separated timezone name, convert to IANA format
		return tz.trim().replace(/\s+/g, '_')
	}

	const normalizedValue = normalizeTimezoneValue(value)

	const formattedTimezones = useMemo(() => {
		return timezones
			.map((timezone) => {
				try {
					const formatter = new Intl.DateTimeFormat('en', {
						timeZone: timezone,
						timeZoneName: 'shortOffset',
					})
					const parts = formatter.formatToParts(new Date())
					const offset =
						parts.find((part) => part.type === 'timeZoneName')?.value || ''
					const modifiedOffset = offset === 'GMT' ? 'GMT+0' : offset

					// Parse numeric offset for sorting
					// Handle formats like "GMT+5", "GMT-5", "+05:00", "-05:00"
					let numericOffset = 0
					if (offset.includes('GMT')) {
						const match = offset.match(GMT_OFFSET_REGEX)
						if (match?.[1]) {
							numericOffset = Number.parseInt(match[1], 10)
						}
					} else {
						// Handle ISO offset format like "+05:00" or "-05:00"
						const match = offset.match(ISO_OFFSET_REGEX)
						if (match) {
							const sign = match[1] === '+' ? 1 : -1
							const hours = Number.parseInt(match[2] || '0', 10)
							const minutes = Number.parseInt(match[3] || '0', 10)
							numericOffset = sign * (hours + minutes / 60)
						}
					}

					return {
						value: timezone,
						label: `(${modifiedOffset}) ${timezone.replace(/_/g, ' ')}`,
						numericOffset,
					}
				} catch {
					// Fallback for timezones that can't be formatted
					return {
						value: timezone,
						label: timezone.replace(/_/g, ' '),
						numericOffset: 0,
					}
				}
			})
			.sort((a, b) => a.numericOffset - b.numericOffset)
	}, [timezones])

	// Ensure onValueChange always receives just the timezone identifier (no offset prefix)
	const handleValueChange = (selectedValue: string) => {
		// The selectedValue from SelectItem is already just the timezone identifier,
		// but add safeguard in case something unexpected happens
		const cleanValue = normalizeTimezoneValue(selectedValue) ?? selectedValue
		onValueChange?.(cleanValue)
	}

	return (
		<Select onValueChange={handleValueChange} value={normalizedValue ?? ''}>
			<SelectTrigger>
				<SelectValue placeholder="Select timezone" />
			</SelectTrigger>
			<SelectContent>
				{formattedTimezones.map(({ value: tzValue, label }) => (
					<SelectItem key={tzValue} value={tzValue}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
