"use client";
import * as React from "react";
import { useVacationsData } from "@/lib/websocket-data-provider";

export interface VacationPeriod {
  start: Date;
  end: Date;
}

interface VacationContextValue {
  vacationPeriods: VacationPeriod[];
  recordingState: {
    periodIndex: number | null;
    field: string | null;
  };
  loading: boolean;
  addVacationPeriod: () => void;
  removeVacationPeriod: (index: number) => void;
  startRecording: (periodIndex: number, field: "start" | "end") => void;
  stopRecording: () => void;
  setOnVacationUpdated?: (fn: (periods: VacationPeriod[]) => void) => void;
  handleDateClick?: (date: Date) => void;
}

const VacationContext = React.createContext<VacationContextValue>({
  vacationPeriods: [],
  recordingState: { periodIndex: null, field: null },
  loading: false,
  addVacationPeriod: () => {},
  removeVacationPeriod: (_index: number) => {},
  startRecording: (_i: number, _f: "start" | "end") => {},
  stopRecording: () => {},
  setOnVacationUpdated: () => {},
  handleDateClick: () => {},
});

export const VacationProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [vacationPeriods, setVacationPeriods] = React.useState<VacationPeriod[]>([]);
  const [recordingState, setRecordingState] = React.useState<{ periodIndex: number | null; field: "start" | "end" | null }>({ periodIndex: null, field: null });
  const [loading] = React.useState<boolean>(false);
  const vacationUpdatedRef = React.useRef<((periods: VacationPeriod[]) => void) | null>(null);
  const setOnVacationUpdated = (fn: (periods: VacationPeriod[]) => void) => {
    vacationUpdatedRef.current = fn;
  };
  // Sync with websocket-provided vacations
  const { vacations } = useVacationsData();
  React.useEffect(() => {
    try {
      if (Array.isArray(vacations)) {
        const periods = vacations.map((p: any) => ({ start: new Date(p.start), end: new Date(p.end) }));
        setVacationPeriods(periods);
        vacationUpdatedRef.current?.(periods);
      }
    } catch {}
  }, [vacations]);

  const addVacationPeriod = React.useCallback(() => {
    // Add a 1-day period starting today by default
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    setVacationPeriods((prev) => {
      const next = [...prev, { start, end }];
      vacationUpdatedRef.current?.(next);
      return next;
    });
  }, []);

  const removeVacationPeriod = React.useCallback((index: number) => {
    setVacationPeriods((prev) => {
      const next = prev.filter((_, i) => i !== index);
      vacationUpdatedRef.current?.(next);
      return next;
    });
  }, []);

  const startRecording = React.useCallback((periodIndex: number, field: "start" | "end") => {
    setRecordingState({ periodIndex, field });
  }, []);

  const stopRecording = React.useCallback(() => {
    setRecordingState({ periodIndex: null, field: null });
  }, []);

  return (
    <VacationContext.Provider value={{ vacationPeriods, recordingState, loading, addVacationPeriod, removeVacationPeriod, startRecording, stopRecording, setOnVacationUpdated }}>
      {children}
    </VacationContext.Provider>
  );
};

export const useVacation = (): VacationContextValue => React.useContext(VacationContext);

