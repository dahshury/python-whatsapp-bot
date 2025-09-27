"use client";

import * as React from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";

export type DockBridgeState = {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
};

type DockBridgeContextValue = {
	state: DockBridgeState;
	setState: (next: DockBridgeState | ((prev: DockBridgeState) => DockBridgeState)) => void;
	reset: () => void;
};

const DockBridgeContext = React.createContext<DockBridgeContextValue | null>(null);

export function DockBridgeProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = React.useState<DockBridgeState>({});

	const value = React.useMemo<DockBridgeContextValue>(
		() => ({ state, setState, reset: () => setState({}) }),
		[state],
	);

	return <DockBridgeContext.Provider value={value}>{children}</DockBridgeContext.Provider>;
}

export function useDockBridge(): DockBridgeContextValue {
	const ctx = React.useContext(DockBridgeContext);
	if (!ctx) throw new Error("useDockBridge must be used within DockBridgeProvider");
	return ctx;
}


