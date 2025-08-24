import type { CalendarCoreRef } from "@/components/calendar-core";

export interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end?: string;
	type: "reservation" | "conversation" | "cancellation";
	extendedProps?: {
		description?: string;
		customerName?: string;
		phone?: string;
		waId?: string;
		status?: string;
		type?: number;
		cancelled?: boolean;
		reservationId?: number;
	};
}

export interface ReservationData {
	id?: number;
	date: string;
	time: string;
	phone: string;
	type: number;
	name: string;
}

export interface DataTableEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	events: CalendarEvent[];
	selectedDateRange: { start: string; end: string } | null;
	isRTL: boolean;
	slotDurationHours: number;
	onSave: (events: CalendarEvent[]) => void;
	onEventClick: (event: CalendarEvent) => void;
	freeRoam?: boolean;
	data: ReservationData[];
	onDataChange?: (data: ReservationData[]) => void;
	language?: "en" | "ar";
	calendarRef?: React.RefObject<CalendarCoreRef>;
	onEventAdded?: (event: CalendarEvent) => void;
	onEventModified?: (eventId: string, event: CalendarEvent) => void;
	onEventCancelled?: (eventId: string) => void;
}

export interface SuccessfulOperation {
	type: "create" | "modify" | "cancel";
	id: any;
	data?: any;
}

export interface ValidationResult {
	isValid: boolean;
	errors: Array<{
		row: number;
		col: number;
		message: string;
	}>;
}

export interface EditingChanges {
	deleted_rows?: number[];
	edited_rows?: Record<string, Record<string, any>>;
	added_rows?: Array<{
		date: string;
		time: string;
		phone: string;
		type: string;
		name: string;
	}>;
}
