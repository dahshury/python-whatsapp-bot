declare global {
	// Global flags and registries used by calendar/data table logic
	var __calendarLocalMoves: Map<string, number> | undefined;
	var __suppressEventChangeDepth: number | undefined;
	var __isCalendarDragging: boolean | undefined;
	var __localOps: Set<string> | undefined;

	// Window-level calendar drag/reflow guards
	type Window = {
		__suppressEventChangeDepth?: number;
		__isCalendarDragging?: boolean;
		__calendarLocalMoves?: Map<string, number>;
	};
}

export {};

// Ambient module declarations to smooth over ESM/CJS typings for third-party libs
declare module "@fullcalendar/timegrid" {
	const plugin: unknown;
	export default plugin;
}
