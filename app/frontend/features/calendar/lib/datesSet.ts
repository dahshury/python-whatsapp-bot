type CalendarApiLike = { updateSize?: () => void }

export function createDatesSet(
  getApi: () => CalendarApiLike | undefined,
  onDatesSet?: (info: any) => void,
  onNavDate?: (date: Date) => void
) {
  return (info: any) => {
    setTimeout(() => {
      try {
        const api = getApi()
        api?.updateSize?.()
      } catch {}
    }, 250)

    if (onDatesSet) onDatesSet(info)

    // Always fire onNavDate for all views (required for TanStack Query period tracking)
    if (onNavDate) {
      onNavDate(info.view.currentStart)
    }
  }
}


