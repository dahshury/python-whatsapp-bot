import { describe, expect, it } from 'vitest'
import { createNewDocument } from '@/entities/document'

describe('DocumentDomain', () => {
	it('updates snapshot and sets updatedAt', () => {
		const TEST_AGE = 30
		const d = createNewDocument('wa-1', { name: 'A' })
		d.update({ age: TEST_AGE })
		expect(d.snapshot.name).toBe('A')
		expect(d.snapshot.age).toBe(TEST_AGE)
		expect(typeof d.snapshot.updatedAt).toBe('number')
	})
})
