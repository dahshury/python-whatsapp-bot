import { create } from "zustand";

export type VacationPeriod = {
	start: Date;
	end: Date;
};

type RecordingState = {
	periodIndex: number | null;
	field: "start" | "end" | null;
};

type VacationEditorStoreState = {
	vacationPeriods: VacationPeriod[];
	recordingState: RecordingState;
	loading: boolean;
	suppressSyncUntil: number; // epoch ms
	setVacationPeriods: (periods: VacationPeriod[]) => void;
	addVacationPeriod: (period?: VacationPeriod) => void;
	removeVacationPeriod: (index: number) => void;
	startRecording: (periodIndex: number, field: "start" | "end") => void;
	stopRecording: () => void;
	setSuppressSyncUntil: (ts: number) => void;
};

export const useVacationEditorStore = create<VacationEditorStoreState>()(
	(set) => ({
		vacationPeriods: [],
		recordingState: { periodIndex: null, field: null },
		loading: false,
		suppressSyncUntil: 0,
		setVacationPeriods: (periods) => set({ vacationPeriods: periods }),
		addVacationPeriod: (period) =>
			set((s) => ({
				vacationPeriods: [
					...s.vacationPeriods,
					period ?? { start: new Date(), end: new Date() },
				],
			})),
		removeVacationPeriod: (index) =>
			set((s) => ({
				vacationPeriods: s.vacationPeriods.filter((_, i) => i !== index),
			})),
		startRecording: (periodIndex, field) =>
			set({ recordingState: { periodIndex, field } }),
		stopRecording: () =>
			set({ recordingState: { periodIndex: null, field: null } }),
		setSuppressSyncUntil: (ts) => set({ suppressSyncUntil: ts }),
	})
);
