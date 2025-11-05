type EventLike = {
  classNames?: string[];
  extendedProps?: { type?: number; __vacation?: boolean };
};

type ArgLike = { event?: EventLike };

/**
 * Resolve CSS classes for a calendar event based on its type and flags.
 */
export function getEventClassNames(arg: ArgLike): string[] {
  const event = arg?.event;
  const classes: string[] = ["text-xs"];
  const type = event?.extendedProps?.type;
  const isVacation =
    Boolean(event?.extendedProps?.__vacation) ||
    event?.classNames?.includes("vacation-event") ||
    event?.classNames?.includes("vacation-background-event");

  if (isVacation) {
    classes.push("vacation-event");
    return classes;
  }

  if (type === 2) {
    classes.push("conversation-event");
  } else {
    classes.push("reservation-event");
    if (type === 1) {
      classes.push("reservation-type-1");
    } else {
      classes.push("reservation-type-0");
    }
  }

  return classes;
}
