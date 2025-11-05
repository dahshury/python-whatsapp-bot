/**
 * FullCalendar custom event content renderer producing structured time/title DOM.
 */
import type { EventContentArg } from "@fullcalendar/core";

const SMALL_SCREEN_MAX_WIDTH = 640;
const PARTS_AT_LEAST_THREE = 3;
const PARTS_EXACTLY_TWO = 2;
const TIME_RANGE_SEPARATOR_REGEX = /\s*[–—-]\s*/;
type EventContentArgLike = Pick<EventContentArg, "timeText" | "event">;

export function eventContent(
  arg: EventContentArgLike
): { domNodes: Node[] } | undefined {
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < SMALL_SCREEN_MAX_WIDTH;
  const timeText: string = arg?.timeText || "";
  let startText = isSmallScreen ? "" : timeText || "";
  let endText = "";
  let sep = "";
  if (!isSmallScreen && timeText && TIME_RANGE_SEPARATOR_REGEX.test(timeText)) {
    const parts = timeText.split(TIME_RANGE_SEPARATOR_REGEX);
    startText = (parts[0] || "").trim();
    endText = (parts[1] || "").trim();
    sep = endText ? " - " : "";
  }

  const container = document.createElement("div");
  container.className = "fc-event-main-frame";

  const timeContainer = document.createElement("div");
  timeContainer.className = "fc-event-time";
  if (!isSmallScreen) {
    const startSpan = document.createElement("span");
    startSpan.className = "fc-event-time-start";
    startSpan.textContent = startText;
    const sepSpan = document.createElement("span");
    sepSpan.className = "fc-event-time-sep";
    sepSpan.textContent = sep;
    const endSpan = document.createElement("span");
    endSpan.className = "fc-event-time-end";
    endSpan.textContent = endText;
    timeContainer.appendChild(startSpan);
    timeContainer.appendChild(sepSpan);
    timeContainer.appendChild(endSpan);
  }

  const titleSpan = document.createElement("div");
  titleSpan.className = "fc-event-title";
  const fullTitle = String(arg?.event?.title || "");
  const parts = fullTitle.replace(/\s+/g, " ").trim().split(" ");
  let shortTitle = fullTitle;
  if (parts.length >= PARTS_AT_LEAST_THREE) {
    shortTitle = `${parts[0]} ${parts[1]} ${parts.at(-1) ?? ""}`;
  } else if (parts.length === PARTS_EXACTLY_TWO) {
    shortTitle = `${parts[0]} ${parts[1]}`;
  }
  const shortSpan = document.createElement("span");
  shortSpan.className = "name-short";
  shortSpan.textContent = shortTitle;
  const fullSpan = document.createElement("span");
  fullSpan.className = "name-full";
  fullSpan.textContent = fullTitle;
  titleSpan.appendChild(shortSpan);
  titleSpan.appendChild(fullSpan);
  if (isSmallScreen) {
    titleSpan.style.whiteSpace = "nowrap";
    titleSpan.style.overflow = "hidden";
    titleSpan.style.textOverflow = "ellipsis";
  }

  container.appendChild(titleSpan);
  if (!isSmallScreen) {
    container.appendChild(timeContainer);
  }

  return { domNodes: [container] };
}
