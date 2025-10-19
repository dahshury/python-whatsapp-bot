type PinningState = {
	freezeColumns: number;
	isPinnedColumnsWidthTooLarge: boolean;
	pinnedCount: number;
	totalColumns: number;
	configSize: number;
};

export function logColumnPinningState(_state: PinningState): void {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const cfg = require("@shared/config") as {
			runtimeConfig?: { gridDebug?: boolean };
		};
		const enabled = Boolean(cfg?.runtimeConfig?.gridDebug);
		if (!enabled) {
			return;
		}
	} catch {
		return;
	}
}
