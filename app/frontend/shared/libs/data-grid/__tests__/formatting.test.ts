import { describe, expect, it } from 'vitest'
import { FormattingService } from '@/shared/libs/data-grid/components/services/FormattingService'

describe('FormattingService number presets', () => {
	const TWENTY_FIVE = 25
	const ONE_THOUSAND_TWO_HUNDRED_THIRTY_FOUR = 1234
	it('formats percentage (0-100) with one decimal when using percentage', () => {
		expect(
			FormattingService.formatValue(TWENTY_FIVE, 'number', 'percentage')
		).toContain('%')
	})

	it('formats scientific', () => {
		expect(
			FormattingService.formatValue(
				ONE_THOUSAND_TWO_HUNDRED_THIRTY_FOUR,
				'number',
				'scientific'
			)
		).toContain('e+')
	})
})

describe('FormattingService date/time', () => {
	it('formats date localized', () => {
		const d = new Date('2025-01-02T00:00:00Z')
		expect(FormattingService.formatValue(d, 'date', 'localized')).toBeTypeOf(
			'string'
		)
	})

	it('formats time automatic', () => {
		const d = new Date('2000-01-01T15:45:00')
		expect(FormattingService.formatValue(d, 'time', 'automatic')).toBeTypeOf(
			'string'
		)
	})
})
