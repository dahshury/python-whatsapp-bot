declare global {
  // Global flags and registries used by calendar/data table logic
  var __calendarLocalMoves: Map<string, number> | undefined;
  var __suppressEventChangeDepth: number | undefined;
  var __isCalendarDragging: boolean | undefined;
  var __localOps: Set<string> | undefined;
  var __calendarLastModifyContext:
    | Map<string, Record<string, unknown>>
    | undefined;
}

export {};

// Ambient module declarations to smooth over ESM/CJS typings for third-party libs
declare module "@fullcalendar/timegrid" {
  const plugin: unknown;
  export default plugin;
}

declare module "@/styles/themes/*.css" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}
