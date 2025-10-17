type PinningState = {
	freezeColumns: number;
	isPinnedColumnsWidthTooLarge: boolean;
	pinnedCount: number;
	totalColumns: number;
	configSize: number;
};

export function logColumnPinningState(_state: PinningState): void {
	if (process.env.NEXT_PUBLIC_DEBUG_GRID !== "1") {
		return;
	}
}
