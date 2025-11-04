import type { EventApi, EventChangeArg } from '@fullcalendar/core'
import { getWindowProperty, setWindowProperty } from './window-utils'

const DEDUP_MAP_KEY = '__calendarEventChangeDedupMap'

function ensureDedupMap(): Map<string, number> {
    let map = getWindowProperty(DEDUP_MAP_KEY, null as Map<string, number> | null)
    if (!map) {
        map = new Map<string, number>()
        setWindowProperty(DEDUP_MAP_KEY, map)
    }
    return map
}

export type EventChangeInfo = EventChangeArg | { event: EventApi; draggedEl: HTMLElement }

export function getEventChangeDedupKey(info: EventChangeInfo): string {
    try {
        const ev = (info as { event?: { id?: unknown; startStr?: string; start?: Date | null } }).event
        const id = ev?.id != null ? String(ev.id) : ''
        const startStr = (ev?.startStr as string | undefined) || (ev?.start instanceof Date ? ev.start.toISOString() : '')
        const key = `${id}:${startStr}`
        return key
    } catch {
        return ''
    }
}

/**
 * Returns true if this change should be suppressed as a duplicate within windowMs.
 * Also records the current time for the dedup key if not suppressed.
 */
export function suppressDuplicateEventChange(info: EventChangeInfo, windowMs = 1500): boolean {
    try {
        const key = getEventChangeDedupKey(info)
        if (!key) return false
        const map = ensureDedupMap()
        const last = map.get(key)
        const now = Date.now()
        if (typeof last === 'number' && now - last < windowMs) {
            return true
        }
        map.set(key, now)
        return false
    } catch {
        return false
    }
}

/**
 * If the event start is earlier than now but still on the same day, block the change.
 * Calls info.revert() when available. Returns true if blocked.
 */
export function blockPastTimeWithinToday(info: EventChangeInfo): boolean {
    try {
        const ev = (info as { event?: { start?: Date | null } }).event
        const start = ev?.start as Date | null | undefined
        if (start && typeof start.getTime === 'function' && !Number.isNaN(start.getTime())) {
            const now = new Date()
            if (
                start.getFullYear() === now.getFullYear() &&
                start.getMonth() === now.getMonth() &&
                start.getDate() === now.getDate() &&
                start.getTime() < now.getTime()
            ) {
                if ((info as { revert?: () => void }).revert && typeof (info as { revert?: () => void }).revert === 'function') {
                    ;(info as { revert?: () => void }).revert?.()
                }
                return true
            }
        }
        return false
    } catch {
        return false
    }
}








