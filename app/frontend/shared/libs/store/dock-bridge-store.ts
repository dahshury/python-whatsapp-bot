import { create } from "zustand";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

export type DockBridgeState = {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
	rightCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	rightCalendarView?: string;
	onRightCalendarViewChange?: (view: string) => void;
};

type DockBridgeStore = {
	state: DockBridgeState;
	setState: (
		next: DockBridgeState | ((prev: DockBridgeState) => DockBridgeState)
	) => void;
	reset: () => void;
};

export const useDockBridgeStore = create<DockBridgeStore>()((set) => ({
	state: {},
	setState: (next) =>
		set((s) => ({
			state:
				typeof next === "function"
					? (next as (p: DockBridgeState) => DockBridgeState)(s.state)
					: next,
		})),
	reset: () => set({ state: {} }),
}));
