import type {
	CalendarApi,
	DatesSetArg,
	EventApi,
	EventChangeArg,
	EventClickArg,
	EventHoveringArg,
} from "@fullcalendar/core";
import type { CalendarEvent } from "@/entities/event";

export type CalendarCoreProps = {
	// Data props
	events: CalendarEvent[];

	// State props
	currentView: string;
	currentDate: Date;
	isLocalized: boolean;
	freeRoam: boolean;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	calendarHeight: number | "auto" | "parent";
	// Optional: allow past navigation by disabling validRange
	overrideValidRange?: boolean;

	// Vacation checker
	isVacationDate?: (dateStr: string) => boolean;

	// Event handlers
	onDateClick?: (info: {
		date: Date;
		dateStr: string;
		allDay: boolean;
	}) => void;
	onSelect?: (info: {
		start: Date;
		end: Date;
		startStr: string;
		endStr: string;
		allDay: boolean;
	}) => void;
	onEventClick?: (info: EventClickArg) => void;
	onEventChange?: (info: EventChangeArg) => void;
	onViewDidMount?: (info: {
		view: { type: string; title: string };
		el: HTMLElement;
	}) => void;
	onEventDidMount?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
	}) => void;
	onDatesSet?: (info: DatesSetArg) => void;
	onEventMouseEnter?: (info: EventHoveringArg) => void;
	onEventMouseLeave?: (info: EventHoveringArg) => void;
	onEventDragStart?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
		jsEvent: MouseEvent;
	}) => void;
	onEventDragStop?: (info: {
		event: {
			id: string;
			title: string;
			start: Date;
			end?: Date;
			extendedProps?: Record<string, unknown>;
		};
		el: HTMLElement;
		jsEvent: MouseEvent;
	}) => void;
	onViewChange?: (view: string) => void;

	// Context menu handlers
	onContextMenu?: (
		event: CalendarEvent,
		position: { x: number; y: number }
	) => void;

	// Resize callback
	onUpdateSize?: () => void;

	// Mouse down handler for events
	onEventMouseDown?: () => void;

	// Drag and drop props for dual calendar mode
	droppable?: boolean;
	onEventReceive?: (info: { event: EventApi; draggedEl: HTMLElement }) => void;
	onEventLeave?: (info: { event?: EventApi; draggedEl: HTMLElement }) => void;

	// Add to CalendarCoreProps after onViewChange
	onNavDate?: (date: Date) => void;

	// Toggle FullCalendar navLinks (clickable day/week headers)
	navLinks?: boolean;
};

export type CalendarCoreRef = {
	getApi: () => CalendarApi | undefined;
	updateSize: () => void;
};

export type UseCalendarEventHandlersProps = {
	events: CalendarEvent[];
	conversations: Record<string, unknown>;
	isLocalized?: boolean;
	currentView: string;
	isVacationDate: (date: string) => boolean;
	/** Optional refresh trigger used by some callers; not required by this hook */
	handleRefreshWithBlur?: () => void | Promise<void>;
	openConversation: (id: string) => void;
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
	removeEvent: (id: string) => void;
	dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void };
	calendarRef?: React.RefObject<CalendarCoreRef | null>; // Optional calendar ref for API access
};

export type CalendarEventDetail = {
	type: string;
	data: {
		id?: string | number;
		[key: string]: unknown;
	};
};

export type ConstraintsInput = {
	freeRoam: boolean;
	currentView: string;
};
