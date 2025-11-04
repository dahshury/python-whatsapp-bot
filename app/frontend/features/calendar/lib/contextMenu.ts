import type { CalendarEvent } from '@/entities/event'

export function attachContextMenu(
  el: HTMLElement,
  eventApi: any,
  onContextMenu?: (event: CalendarEvent, position: { x: number; y: number }) => void
) {
  if (!onContextMenu) return
  const handler = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const calendarEvent: CalendarEvent = {
        id: String(eventApi.id),
        title: String(eventApi.title || ''),
        start: String(eventApi.startStr || ''),
        end: String(eventApi.endStr || eventApi.startStr || ''),
        backgroundColor: eventApi.backgroundColor || '',
        borderColor: eventApi.borderColor || '',
        editable: true,
        extendedProps: {
          type: eventApi.extendedProps?.type || 0,
          cancelled: eventApi.extendedProps?.cancelled,
          ...(eventApi.extendedProps || {}),
        },
      }
      onContextMenu(calendarEvent, { x: e.clientX, y: e.clientY })
    } catch {}
  }
  el.addEventListener('contextmenu', handler)
}


