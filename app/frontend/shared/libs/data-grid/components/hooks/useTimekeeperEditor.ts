"use client";

import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  TimeKeeperData,
  TimekeeperCellProps,
  TimePickerPosition,
} from "../models/TimekeeperCellTypes";
import {
  applyTimeRestrictionMonkeyPatch,
  cleanupTimeRestrictionMonkeyPatch,
  TimeRestrictionService,
} from "../services/TimeRestrictionService";
import {
  formatTimeForDisplay,
  formatTimeForPicker,
  getSafeTimeValue,
  isValidDate,
  parseTimeFromPicker,
  TIME_REGEX_12,
  TIME_REGEX_24,
} from "../utils/timeUtils";

type UseTimekeeperEditorProps = {
  data: TimekeeperCellProps;
  onChange: (value: TimekeeperCellProps) => void;
  onFinishedEditing?: (value: TimekeeperCellProps) => void;
  value: TimekeeperCellProps;
};

export const useTimekeeperEditor = ({
  data,
  onChange,
  onFinishedEditing,
  value,
}: UseTimekeeperEditorProps) => {
  const MAX_HOURS = 23;
  const MAX_MINUTES = 59;
  const EPOCH_YEAR = 1970;
  const EPOCH_MONTH = 0;
  const EPOCH_DAY = 1;
  const BLUR_DELAY_MS = 150;
  const PICKER_HEIGHT = 300;
  const PICKER_WIDTH = 280;
  const PICKER_SPACING = 8;
  const VIEWPORT_MARGIN = 20;
  const MIN_EDGE_DISTANCE = 10;

  // Refs for DOM elements
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // State management
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<TimePickerPosition>({
    top: 0,
    left: 0,
  });
  const [timekeeperError, setTimekeeperError] = useState<string | null>(null);

  // Local time state to avoid grid re-renders during TimeKeeper interaction
  const [localTime, setLocalTime] = useState<Date | undefined>(data.time);
  const [localDisplayTime, setLocalDisplayTime] = useState<string>(
    data.displayTime || ""
  );

  // Update local state when props change (external updates)
  useEffect(() => {
    setLocalTime(data.time);
    setLocalDisplayTime(data.displayTime || "");
  }, [data.time, data.displayTime]);

  // Clear errors when picker state changes
  useEffect(() => {
    setTimekeeperError(null);
  }, []);

  // Create a stable initial time value that doesn't change during interaction
  const initialTimeValue = useMemo(
    () => getSafeTimeValue(data.time),
    [data.time]
  ); // Only update when external data.time changes

  // Memoized formatted time value based on initial time
  const memoizedTimeValue = useMemo(() => {
    try {
      return formatTimeForPicker(initialTimeValue, data.use24Hour);
    } catch (_error) {
      return data.use24Hour ? "12:00" : "12:00pm";
    }
  }, [initialTimeValue, data.use24Hour]);

  // Static key to prevent re-renders during interaction
  const staticTimeKeeperKey = useMemo(
    () => `timekeeper-static-${Date.now()}`,
    []
  ); // Only create once when component mounts

  // Handle done click - propagate final changes and close
  const handleDoneClick = useCallback(() => {
    try {
      setShowPicker(false);

      // Propagate final changes to grid
      if (localTime && isValidDate(localTime)) {
        const newCell = {
          ...value,
          data: {
            ...data,
            time: localTime,
            displayTime: localDisplayTime,
          },
        } as typeof value;

        onChange(newCell);
        onFinishedEditing?.(newCell);
      } else {
        onFinishedEditing?.(value);
      }
    } catch (_error) {
      setTimekeeperError("Error closing time picker");
    }
  }, [localTime, localDisplayTime, data, value, onChange, onFinishedEditing]);

  // Handle time change from picker - update local state only, don't trigger grid re-render
  const handleTimeChange = useCallback(
    (timeData: TimeKeeperData) => {
      try {
        // Validate timeData object
        if (!timeData || typeof timeData !== "object") {
          return;
        }

        const timeString =
          timeData.formatted12 || timeData.formatted24 || timeData.time;
        if (!timeString || typeof timeString !== "string") {
          return;
        }

        const newDate = parseTimeFromPicker(timeString);

        // Validate the parsed date more thoroughly
        if (!isValidDate(newDate)) {
          return;
        }

        // Additional validation for reasonable time values
        const hours = newDate.getHours();
        const minutes = newDate.getMinutes();
        if (
          Number.isNaN(hours) ||
          Number.isNaN(minutes) ||
          hours < 0 ||
          hours > MAX_HOURS ||
          minutes < 0 ||
          minutes > MAX_MINUTES
        ) {
          return;
        }

        // Update local state only - don't trigger grid re-render during interaction
        setLocalTime(newDate);
        setLocalDisplayTime(formatTimeForDisplay(newDate, data.use24Hour));
      } catch (_error) {
        setTimekeeperError("Error processing time change");
      }
    },
    [data.use24Hour]
  );

  // Handle input change - update local state
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setLocalDisplayTime(inputValue);

      // Try to parse the input value
      let parsedDate: Date | null = null;

      if (data.use24Hour && TIME_REGEX_24.test(inputValue)) {
        const [hours, minutes] = inputValue.split(":").map(Number);
        if (hours !== undefined && minutes !== undefined) {
          parsedDate = new Date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY);
          parsedDate.setHours(hours, minutes, 0, 0);
        }
      } else if (!data.use24Hour && TIME_REGEX_12.test(inputValue)) {
        parsedDate = parseTimeFromPicker(inputValue);
      }

      if (parsedDate && isValidDate(parsedDate)) {
        setLocalTime(parsedDate);
      }
    },
    [data.use24Hour]
  );

  // Handle blur - disabled when picker is open to prevent dropdown focus issues
  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      // Don't handle blur when picker is open - let click-outside-ignore system handle it
      if (showPicker) {
        return;
      }

      // Only handle blur when picker is closed - for manual text input completion
      setTimeout(() => {
        if (localTime && isValidDate(localTime)) {
          const newCell = {
            ...value,
            data: {
              ...data,
              time: localTime,
              displayTime: localDisplayTime,
            },
          } as typeof value;

          onChange(newCell);
          onFinishedEditing?.(newCell);
        } else {
          onFinishedEditing?.(value);
        }
      }, BLUR_DELAY_MS);
    },
    [
      showPicker,
      localTime,
      localDisplayTime,
      data,
      value,
      onChange,
      onFinishedEditing,
    ]
  );

  // Handle key down - propagate final changes on Enter/Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        setShowPicker(false);

        if (localTime && isValidDate(localTime)) {
          const newCell = {
            ...value,
            data: {
              ...data,
              time: localTime,
              displayTime: localDisplayTime,
            },
          } as typeof value;

          onChange(newCell);
          onFinishedEditing?.(newCell);
        } else {
          onFinishedEditing?.(value);
        }
      }
    },
    [localTime, localDisplayTime, data, value, onChange, onFinishedEditing]
  );

  // Focus input on mount - but don't interfere when picker is open
  useEffect(() => {
    if (!showPicker) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [showPicker]);

  // Clean up monkey patch when component unmounts or picker closes
  useEffect(() => {
    if (!showPicker) {
      cleanupTimeRestrictionMonkeyPatch();
    }

    // Always cleanup on unmount
    return cleanupTimeRestrictionMonkeyPatch;
  }, [showPicker]);

  // Get time restriction service if date is available
  const timeRestrictionService = useMemo(() => {
    const service = data.selectedDate
      ? new TimeRestrictionService(data.selectedDate)
      : null;

    // Apply monkey patch immediately when service is created
    if (service) {
      applyTimeRestrictionMonkeyPatch(service);
    }

    return service;
  }, [data.selectedDate]);

  // Apply monkey patch immediately when we have restrictions and picker is shown
  useEffect(() => {
    if (showPicker && timeRestrictionService) {
      // Apply the monkey patch before TimeKeeper renders
      applyTimeRestrictionMonkeyPatch(timeRestrictionService);
    }
  }, [showPicker, timeRestrictionService]);

  // Make sure monkey patch is applied early when picker opens
  const handleIconClickWithPatch = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!inputRef.current) {
        return;
      }

      if (showPicker) {
        setShowPicker(false);
      } else {
        // Apply monkey patch immediately before showing picker
        if (timeRestrictionService) {
          applyTimeRestrictionMonkeyPatch(timeRestrictionService);
        }

        // Calculate position for the picker
        const inputRect = inputRef.current.getBoundingClientRect();

        let top = inputRect.bottom + PICKER_SPACING;
        let left = inputRect.left;

        // Check if picker would go off screen bottom
        if (top + PICKER_HEIGHT > window.innerHeight - VIEWPORT_MARGIN) {
          top = inputRect.top - PICKER_HEIGHT - PICKER_SPACING;
        }

        // Check if picker would go off screen right
        if (left + PICKER_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
          left = window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN;
        }

        // Ensure minimum distance from edges
        top = Math.max(
          MIN_EDGE_DISTANCE,
          Math.min(top, window.innerHeight - PICKER_HEIGHT - MIN_EDGE_DISTANCE)
        );
        left = Math.max(
          MIN_EDGE_DISTANCE,
          Math.min(left, window.innerWidth - PICKER_WIDTH - MIN_EDGE_DISTANCE)
        );

        setPickerPosition({ top, left });
        setShowPicker(true);
      }
    },
    [showPicker, timeRestrictionService]
  );

  return {
    // Refs
    inputRef,
    wrapperRef,
    iconButtonRef,
    portalRef,

    // State
    showPicker,
    pickerPosition,
    timekeeperError,
    localTime,
    localDisplayTime,

    // Computed values
    memoizedTimeValue,
    staticTimeKeeperKey,
    timeRestrictionService,

    // Handlers
    handleIconClick: handleIconClickWithPatch,
    handleDoneClick,
    handleTimeChange,
    handleInputChange,
    handleBlur,
    handleKeyDown,

    // Actions
    setTimekeeperError,
    setShowPicker,
  };
};
