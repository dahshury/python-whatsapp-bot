import { count } from "@shared/libs/dev-profiler";

// Constants for view mount timing
const MULTIMONTH_UPDATE_DELAY_MS = 50;
const DEFAULT_UPDATE_DELAY_MS = 250;

type ViewDidMountDeps = {
	onViewDidMount?: (args: {
		view: { type: string; title: string };
		el: HTMLElement;
	}) => void;
	getApi?: () => { updateSize?: () => void } | undefined;
};

export function createViewDidMount({
	onViewDidMount,
	getApi,
}: ViewDidMountDeps) {
	return function viewDidMount(info: {
		view: { type: string; title?: string };
		el?: HTMLElement;
	}) {
		count("fc:viewDidMount");
		const isMultiMonth = info.view.type === "multiMonthYear";
		const delay = isMultiMonth
			? MULTIMONTH_UPDATE_DELAY_MS
			: DEFAULT_UPDATE_DELAY_MS;

		setTimeout(() => {
			try {
				const api = getApi?.();
				api?.updateSize?.();
			} catch {
				// Size update may fail in some contexts
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
