import type { EventContentArg } from "@fullcalendar/core";

// Constants for magic numbers and regex patterns
const MOBILE_BREAKPOINT = 640;
const MIN_PARTS_FOR_ELLIPSIS = 3;
const TIME_SEPARATOR_REGEX = /[–—-]/;
const TIME_SEPARATOR_SPLIT_REGEX = /\s*[–—-]\s*/;

/**
 * Custom DOM content builder for FullCalendar events.
 * Returns structured DOM nodes to allow CSS-driven layout and truncation.
 */

// Helper to check if screen is small
const isSmallScreenDisplay = (): boolean =>
	typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

// Helper to create vacation event element
const createVacationElement = (title: string): HTMLDivElement => {
	const wrapper = document.createElement("div");
	wrapper.style.position = "absolute";
	wrapper.style.inset = "0";
	wrapper.style.display = "flex";
	wrapper.style.alignItems = "center";
	wrapper.style.justifyContent = "center";
	wrapper.style.pointerEvents = "none";

	const titleEl = document.createElement("div");
	titleEl.textContent = title;
	titleEl.style.fontWeight = "800";
	titleEl.style.fontSize = "18px";
	titleEl.style.letterSpacing = "0.3px";
	wrapper.appendChild(titleEl);

	return wrapper;
};

// Helper to parse time text into start, end, and separator
const parseTimeText = (
	timeText: string | undefined,
	isSmallScreen: boolean
): { startText: string; endText: string; sep: string } => {
	let startText = isSmallScreen ? "" : timeText || "";
	let endText = "";
	let sep = "";

	if (!isSmallScreen && timeText && TIME_SEPARATOR_REGEX.test(timeText)) {
		const parts = timeText.split(TIME_SEPARATOR_SPLIT_REGEX);
		startText = (parts[0] || "").trim();
		endText = (parts[1] || "").trim();
		sep = endText ? " - " : "";
	}

	return { startText, endText, sep };
};

// Helper to truncate title intelligently
const truncateTitle = (fullTitle: string): string => {
	const parts = fullTitle.replace(/\s+/g, " ").trim().split(" ");
	if (parts.length >= MIN_PARTS_FOR_ELLIPSIS) {
		return `${parts[0]} ${parts[1]} ${parts.at(-1)}`;
	}
	if (parts.length === 2) {
		return `${parts[0]} ${parts[1]}`;
	}
	return fullTitle;
};

// Helper to create time container
const createTimeContainer = (
	startText: string,
	endText: string,
	sep: string
): HTMLDivElement => {
	const container = document.createElement("div");
	container.className = "fc-event-time";

	const startSpan = document.createElement("span");
	startSpan.className = "fc-event-time-start";
	startSpan.textContent = startText;

	const sepSpan = document.createElement("span");
	sepSpan.className = "fc-event-time-sep";
	sepSpan.textContent = sep;

	const endSpan = document.createElement("span");
	endSpan.className = "fc-event-time-end";
	endSpan.textContent = endText;

	container.appendChild(startSpan);
	container.appendChild(sepSpan);
	container.appendChild(endSpan);

	return container;
};

// Helper to create title container
const createTitleContainer = (
	fullTitle: string,
	isSmallScreen: boolean
): HTMLDivElement => {
	const titleSpan = document.createElement("div");
	titleSpan.className = "fc-event-title";

	const shortTitle = truncateTitle(fullTitle);

	const shortSpan = document.createElement("span");
	shortSpan.className = "name-short";
	shortSpan.textContent = shortTitle;

	const fullSpan = document.createElement("span");
	fullSpan.className = "name-full";
	fullSpan.textContent = fullTitle;

	titleSpan.appendChild(shortSpan);
	titleSpan.appendChild(fullSpan);

	// Enforce single-line ellipsis on small screens
	if (isSmallScreen) {
		titleSpan.style.whiteSpace = "nowrap";
		titleSpan.style.overflow = "hidden";
		titleSpan.style.textOverflow = "ellipsis";
	}

	return titleSpan;
};

export function eventContent(arg: EventContentArg) {
	const eventTitle = arg?.event?.title || "";

	// If this is a vacation text overlay, render large centered title only
	if (arg?.event?.classNames?.includes("vacation-text-event")) {
		return { domNodes: [createVacationElement(eventTitle)] };
	}

	const isSmallScreen = isSmallScreenDisplay();
	const { startText, endText, sep } = parseTimeText(
		arg.timeText,
		isSmallScreen
	);

	const container = document.createElement("div");
	container.className = "fc-event-main-frame";

	const titleContainer = createTitleContainer(eventTitle, isSmallScreen);
	container.appendChild(titleContainer);

	if (!isSmallScreen) {
		const timeContainer = createTimeContainer(startText, endText, sep);
		container.appendChild(timeContainer);
	}

	return { domNodes: [container] };
}
