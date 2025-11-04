export function createEventChangeHandler(
  onEventChange?: (info: any) => void
) {
  return async (info: any) => {
    const eventId: string | undefined = info?.event?.id
    if (!eventId) return
    try {
      const depth = Number(
        (globalThis as { __suppressEventChangeDepth?: number })
          .__suppressEventChangeDepth ?? 0
      )
      if (depth > 0) return
    } catch {}
    onEventChange?.(info)
  }
}


