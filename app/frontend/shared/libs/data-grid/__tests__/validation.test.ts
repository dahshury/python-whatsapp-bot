import { describe, expect, it } from 'vitest'
import { validatePersonName } from '@/shared/validation/name'

describe('validatePersonName', () => {
	it('rejects empty', () => {
		expect(validatePersonName('')).toEqual({
			isValid: false,
			code: 'nameRequired',
		})
	})

	it('rejects too-short words', () => {
		expect(validatePersonName('A B')).toEqual({
			isValid: false,
			code: 'nameWordsTooShort',
		})
	})

	it('auto-adds last name when single valid word', () => {
		const res = validatePersonName('john')
		expect(res.isValid).toBe(true)
		expect(res.correctedValue?.split(' ').length).toBe(2)
	})

	it('capitalizes words and strips invalid chars', () => {
		const res = validatePersonName('maria@@ garcia!!')
		expect(res.isValid).toBe(true)
		expect(res.correctedValue).toBe('Maria Garcia')
	})
})
