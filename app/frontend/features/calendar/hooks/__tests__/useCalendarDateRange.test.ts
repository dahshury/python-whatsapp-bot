import { describe, expect, it } from 'vitest'
import {
	getNewestPeriod,
	getOldestPeriod,
	getPeriodDateRange,
	getPeriodKey,
	getPrefetchPeriods,
} from '../useCalendarDateRange'

// Constants for test values
const WEEK_REGEX = /^\d{4}-W\d{2}$/
const NOVEMBER_MONTH_INDEX = 10 // November is month 10 (0-indexed)
const FIRST_DAY_OF_MONTH = 1
const LAST_DAY_OF_MONTH_THRESHOLD = 28
const DAY_15 = 15
const MIDNIGHT_HOUR = 0
const END_OF_DAY_HOUR = 23
const DAYS_IN_WEEK = 7
const HOURS_IN_DAY = 24
const MINUTES_IN_HOUR = 60
const SECONDS_IN_MINUTE = 60
const MILLISECONDS_IN_SECOND = 1000
const WEEK_IN_MILLISECONDS =
	DAYS_IN_WEEK *
	HOURS_IN_DAY *
	MINUTES_IN_HOUR *
	SECONDS_IN_MINUTE *
	MILLISECONDS_IN_SECOND
const PREFETCH_WINDOW_SIZE = 5
const EXPECTED_PREFETCH_COUNT = 11 // 5 back + current + 5 forward
const SMALL_PREFETCH_WINDOW_SIZE = 2

describe('useCalendarDateRange', () => {
	describe('getPeriodKey', () => {
		it('should generate month period key for month view', () => {
			const date = new Date('2025-11-15')
			const key = getPeriodKey('dayGridMonth', date)
			expect(key).toBe('2025-11')
		})

		it('should generate week period key for week view', () => {
			const date = new Date('2025-11-15')
			const key = getPeriodKey('timeGridWeek', date)
			expect(key).toMatch(WEEK_REGEX)
		})

		it('should generate day period key for day view', () => {
			const date = new Date('2025-11-15')
			const key = getPeriodKey('timeGridDay', date)
			expect(key).toBe('2025-11-15')
		})
	})

	describe('getPeriodDateRange', () => {
		it('should return correct date range for month', () => {
			const { start, end } = getPeriodDateRange('dayGridMonth', '2025-11')
			expect(start.getMonth()).toBe(NOVEMBER_MONTH_INDEX)
			expect(start.getDate()).toBe(FIRST_DAY_OF_MONTH)
			expect(end.getMonth()).toBe(NOVEMBER_MONTH_INDEX)
			expect(end.getDate()).toBeGreaterThan(LAST_DAY_OF_MONTH_THRESHOLD)
		})

		it('should return correct date range for week', () => {
			const { start, end } = getPeriodDateRange('timeGridWeek', '2025-W44')
			expect(end.getTime() - start.getTime()).toBeGreaterThan(0)
			expect(end.getTime() - start.getTime()).toBeLessThan(WEEK_IN_MILLISECONDS)
		})

		it('should return correct date range for day', () => {
			const { start, end } = getPeriodDateRange('timeGridDay', '2025-11-15')
			expect(start.getDate()).toBe(DAY_15)
			expect(end.getDate()).toBe(DAY_15)
			expect(start.getHours()).toBe(MIDNIGHT_HOUR)
			expect(end.getHours()).toBe(END_OF_DAY_HOUR)
		})
	})

	describe('getPrefetchPeriods', () => {
		it('should generate 11 periods (5 back + current + 5 forward) for month view', () => {
			const date = new Date('2025-11-15')
			const periods = getPrefetchPeriods(
				'dayGridMonth',
				date,
				PREFETCH_WINDOW_SIZE
			)
			expect(periods.length).toBeGreaterThanOrEqual(EXPECTED_PREFETCH_COUNT)
			expect(periods).toContain('2025-11') // Current month
		})

		it('should generate periods in correct order', () => {
			const date = new Date('2025-11-15')
			const periods = getPrefetchPeriods(
				'dayGridMonth',
				date,
				SMALL_PREFETCH_WINDOW_SIZE
			)
			const currentIndex = periods.indexOf('2025-11')
			expect(currentIndex).toBeGreaterThanOrEqual(0)
			// Should have periods before and after
			expect(currentIndex).toBeGreaterThan(0)
			expect(currentIndex).toBeLessThan(periods.length - 1)
		})

		it('should generate correct periods for week view', () => {
			const date = new Date('2025-11-15')
			const periods = getPrefetchPeriods(
				'timeGridWeek',
				date,
				PREFETCH_WINDOW_SIZE
			)
			expect(periods.length).toBeGreaterThanOrEqual(EXPECTED_PREFETCH_COUNT)
		})
	})

	describe('getOldestPeriod', () => {
		it('should return oldest period from array', () => {
			const periods = ['2025-12', '2025-10', '2025-11']
			const oldest = getOldestPeriod(periods)
			expect(oldest).toBe('2025-10')
		})

		it('should return null for empty array', () => {
			const oldest = getOldestPeriod([])
			expect(oldest).toBeNull()
		})
	})

	describe('getNewestPeriod', () => {
		it('should return newest period from array', () => {
			const periods = ['2025-10', '2025-12', '2025-11']
			const newest = getNewestPeriod(periods)
			expect(newest).toBe('2025-12')
		})

		it('should return null for empty array', () => {
			const newest = getNewestPeriod([])
			expect(newest).toBeNull()
		})
	})
})
