import { describe, it, expect, vi } from 'vitest'
import {
    suppressDuplicateEventChange,
    blockPastTimeWithinToday,
} from '@/features/calendar/lib/event-change-guards'

describe('event-change-guards', () => {
    it('suppressDuplicateEventChange returns false on first call and true on immediate second call', () => {
        const now = new Date()
        const info = {
            event: {
                id: '1',
                start: now,
                startStr: now.toISOString(),
            },
        }
        const first = suppressDuplicateEventChange(info)
        const second = suppressDuplicateEventChange(info)
        expect(first).toBe(false)
        expect(second).toBe(true)
    })

    it('blockPastTimeWithinToday returns true and calls revert for past times today', () => {
        const earlier = new Date(Date.now() - 60_000)
        const revert = vi.fn()
        const info = {
            event: {
                id: '2',
                start: earlier,
                startStr: earlier.toISOString(),
            },
            revert,
        }
        const blocked = blockPastTimeWithinToday(info as unknown as import('@fullcalendar/core').EventChangeArg)
        expect(blocked).toBe(true)
        expect(revert).toHaveBeenCalled()
    })
})

















