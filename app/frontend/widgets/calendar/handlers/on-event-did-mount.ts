import type { EventApi } from "@fullcalendar/core";
import type { CalendarEvent } from "@/entities/event";

// Constants for magic numbers and regex patterns
const TEXT_NODE_TYPE = 3;
const TIME_SEPARATOR_REGEX = /[–—-]/;
const TIME_SEPARATOR_SPLIT_REGEX = /\s*[–—-]\s*/;
const EVENT_TYPE_CONVERSATION = 2;
const EVENT_TYPE_RESERVATION_1 = 1;
const EVENT_TYPE_RESERVATION_0 = 0;

type EventDidMountDeps = {
	onContextMenu?: (event: CalendarEvent, pos: { x: number; y: number }) => void;
	onEventDidMount?: (args: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps: Record<string, unknown>;
		};
		el: HTMLElement;
	}) => void;
	onEventMouseDown?: (e: MouseEvent) => void;
};

const addDataAttributes = (event: EventApi, el: HTMLElement) => {
	try {
		if ((event.extendedProps as { cancelled?: boolean })?.cancelled) {
			el.setAttribute("data-cancelled", "true");
		}
	} catch {
		// Error handling
	}
};

const addEventTypeClasses = (event: EventApi, el: HTMLElement) => {
	try {
		if (
			(event.extendedProps as { type?: number })?.type ===
			EVENT_TYPE_CONVERSATION
		) {
			el.classList.add("conversation-event");
		}
	} catch {
		// Error handling
	}

	try {
		const type = (event.extendedProps as { type?: number })?.type;
		if (type === EVENT_TYPE_RESERVATION_1) {
			el.classList.add("reservation-type-1");
		} else if (type === EVENT_TYPE_RESERVATION_0) {
			el.classList.add("reservation-type-0");
		}
	} catch {
		// Error handling
	}
};

const addMouseDownHandler = (
	el: HTMLElement,
	onEventMouseDown?: (e: MouseEvent) => void
) => {
	try {
		if (onEventMouseDown) {
			el.addEventListener("mousedown", onEventMouseDown);
		}
	} catch {
		// Error handling
	}
};

const setWaIdAttribute = (event: EventApi, el: HTMLElement) => {
	try {
		const waId = String(
			(event.extendedProps as { waId?: string; wa_id?: string })?.waId ||
				(event.extendedProps as { waId?: string; wa_id?: string })?.wa_id ||
				""
		).trim();
		if (waId) {
			el.setAttribute("data-wa-id", waId);
		}
	} catch {
		// Error handling
	}
};

const cleanupTextNodes = (cell: HTMLElement) => {
	try {
		for (const node of Array.from(cell.childNodes)) {
			if (node.nodeType === TEXT_NODE_TYPE) {
				const text = (node.textContent || "").trim();
				if (text) {
					cell.removeChild(node);
				}
			}
		}
	} catch {
		// Error handling
	}
};

const normalizeTimeCell = (cell: HTMLElement) => {
	try {
		let raw = (cell.getAttribute("data-raw-time") || "").trim();
		if (!raw) {
			raw = (cell.textContent || "").trim();
		}
		let startText = raw;
		let endText = "";
		let sep = "";

		if (TIME_SEPARATOR_REGEX.test(raw)) {
			const parts = raw.split(TIME_SEPARATOR_SPLIT_REGEX);
			startText = (parts[0] || "").trim();
			endText = (parts[1] || "").trim();
			sep = endText ? " - " : "";
		}

		while (cell.firstChild) {
			cell.removeChild(cell.firstChild);
		}

		const startSpan = document.createElement("span");
		startSpan.className = "fc-event-time-start";
		startSpan.textContent = startText;

		const sepSpan = document.createElement("span");
		sepSpan.className = "fc-event-time-sep";
		sepSpan.textContent = sep;

		const endSpan = document.createElement("span");
		endSpan.className = "fc-event-time-end";
		endSpan.textContent = endText;

		cell.appendChild(startSpan);
		cell.appendChild(sepSpan);
		cell.appendChild(endSpan);

		cell.style.whiteSpace = "nowrap";
		cell.setAttribute("data-structured", "true");
		cell.setAttribute("data-raw-time", raw);
		cleanupTextNodes(cell);
	} catch {
		// Error handling
	}
};

const setupTimeCellObserver = (timeCell: HTMLElement) => {
	try {
		if (!timeCell.hasAttribute("data-watch-text")) {
			const observer = new MutationObserver(() => cleanupTextNodes(timeCell));
			observer.observe(timeCell, {
				childList: true,
				characterData: true,
				subtree: false,
				attributes: false,
			});
			try {
				(
					timeCell as unknown as { __fcObserver?: MutationObserver }
				).__fcObserver = observer;
			} catch {
				// Error handling
			}
			timeCell.setAttribute("data-watch-text", "1");
		}
	} catch {
		// Error handling
	}
};

const setupRowHoverCleanup = (row: HTMLElement, timeCell: HTMLElement) => {
	try {
		if (!row.hasAttribute("data-hover-cleanup")) {
			const reclean = () => cleanupTextNodes(timeCell);
			row.addEventListener("mouseenter", reclean);
			row.addEventListener("mousemove", reclean);
			row.addEventListener("mouseleave", reclean);
			row.setAttribute("data-hover-cleanup", "1");
		}
	} catch {
		// Error handling
	}
};

const processListViewTimeCell = (el: HTMLElement, view: { type: string }) => {
	try {
		if (
			String(view?.type || "")
				.toLowerCase()
				.includes("list")
		) {
			const row = el.closest(".fc-list-event") as HTMLElement | null;
			const timeCell = row?.querySelector(
				".fc-list-event-time"
			) as HTMLElement | null;

			if (timeCell) {
				normalizeTimeCell(timeCell);
				queueMicrotask(() => cleanupTextNodes(timeCell));
				requestAnimationFrame(() => cleanupTextNodes(timeCell));

				setupTimeCellObserver(timeCell);

				if (row) {
					setupRowHoverCleanup(row, timeCell);
				}
			}
		}
	} catch {
		// Error handling
	}
};

const addContextMenuHandler = (
	calendarEvent: EventApi,
	el: HTMLElement,
	isMultiMonth: boolean,
	onContextMenu?: (event: CalendarEvent, pos: { x: number; y: number }) => void
) => {
	if (isMultiMonth || !onContextMenu) {
		return;
	}

	const handleContextMenu = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const calendarEventData: CalendarEvent = {
			id: calendarEvent.id,
			title: calendarEvent.title,
			start: calendarEvent.startStr,
			end: calendarEvent.endStr || calendarEvent.startStr,
			backgroundColor: calendarEvent.backgroundColor || "",
			borderColor: calendarEvent.borderColor || "",
			editable: true,
			extendedProps: {
				type: (calendarEvent.extendedProps as { type?: number })?.type || 0,
				cancelled:
					(calendarEvent.extendedProps as { cancelled?: boolean })?.cancelled ??
					false,
				...(calendarEvent.extendedProps || {}),
			},
		};

		onContextMenu(calendarEventData, { x: e.clientX, y: e.clientY });
	};

	el.addEventListener("contextmenu", handleContextMenu);
};

const callOriginalHandler = (
	event: EventApi,
	el: HTMLElement,
	onEventDidMount?: (args: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps: Record<string, unknown>;
		};
		el: HTMLElement;
	}) => void
) => {
	try {
		if (onEventDidMount) {
			const safeStart =
				event.start ?? (event.startStr ? new Date(event.startStr) : new Date());
			onEventDidMount({
				event: {
					id: String(event.id),
					title: String(event.title || ""),
					start: safeStart,
					...(event.end ? { end: event.end } : {}),
					extendedProps: { ...(event.extendedProps || {}) },
				},
				el,
			});
		}
	} catch {
		// Error handling
	}
};

export function createEventDidMount({
	onContextMenu,
	onEventDidMount,
	onEventMouseDown,
}: EventDidMountDeps) {
	return function eventDidMount(info: {
		event: EventApi;
		el: HTMLElement;
		view: { type: string };
	}) {
		const event = info.event;
		const el = info.el;
		const view = info.view;

		// Optimize for multiMonth view - skip heavy operations
		const isMultiMonth = view.type === "multiMonthYear";

		addDataAttributes(event, el);
		addEventTypeClasses(event, el);
		addMouseDownHandler(el, onEventMouseDown);
		setWaIdAttribute(event, el);
		processListViewTimeCell(el, view);
		addContextMenuHandler(event, el, isMultiMonth, onContextMenu);
		callOriginalHandler(event, el, onEventDidMount);
	};
}
