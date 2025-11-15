/**
 * FullCalendar event color defaults to keep TS/JS logic in sync with CSS variables.
 * These values mirror the palette defined in `styles/fullcalendar/_variables.css`.
 */
export const EVENT_TYPE_COLOR_DEFAULTS = {
  "0": {
    background: "#e2eee9", // Check-up background
    border: "#12b981", // Check-up border/stroke
  },
  "1": {
    background: "#e2e8f4", // Follow-up background
    border: "#3c82f6", // Follow-up border/stroke
  },
  "2": {
    background: "#edae49", // Conversation background
    border: "#edae49", // Conversation border (same as background)
  },
} as const;

export const DOCUMENT_EVENT_STROKE_COLOR = "#facc15";
