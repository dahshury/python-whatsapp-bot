type CalendarApiLike = { updateSize?: () => void }

export function createViewDidMount(
  getApi: () => CalendarApiLike | undefined,
  onViewDidMount?: (info: { view: { type: string; title: string }; el: HTMLElement }) => void
) {
  return (info: { view: { type: string; title?: string }; el?: HTMLElement }) => {
    const isMultiMonth = info.view.type === 'multiMonthYear'
    const delay = isMultiMonth ? 50 : 250

    setTimeout(() => {
      try {
        const api = getApi()
        api?.updateSize?.()
      } catch {}
    }, delay)

    if (onViewDidMount && info.el) {
      onViewDidMount({
        view: { type: info.view.type, title: info.view.title || '' },
        el: info.el,
      })
    }
  }
}


