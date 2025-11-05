type CalendarApiLike = { updateSize?: () => void };

const MULTIMONTH_UPDATE_DELAY_MS = 50;
const STANDARD_UPDATE_DELAY_MS = 250;

export function createViewDidMount(
  getApi: () => CalendarApiLike | undefined,
  onViewDidMount?: (info: {
    view: { type: string; title: string };
    el: HTMLElement;
  }) => void
) {
  return (info: {
    view: { type: string; title?: string };
    el?: HTMLElement;
  }) => {
    const isMultiMonth = info.view.type === "multiMonthYear";
    const delay = isMultiMonth
      ? MULTIMONTH_UPDATE_DELAY_MS
      : STANDARD_UPDATE_DELAY_MS;

    setTimeout(() => {
      try {
        const api = getApi();
        api?.updateSize?.();
      } catch {
        // Ignore errors in calendar API size update
      }
    }, delay);

    if (onViewDidMount && info.el) {
      onViewDidMount({
        view: { type: info.view.type, title: info.view.title || "" },
        el: info.el,
      });
    }
  };
}
