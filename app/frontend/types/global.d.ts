declare global {
	// Global flags and registries used by calendar/data table logic
	var __calendarLocalMoves: Map<string, number> | undefined;
	var __suppressEventChangeDepth: number | undefined;
	var __isCalendarDragging: boolean | undefined;
	var __localOps: Set<string> | undefined;
}

export {};
