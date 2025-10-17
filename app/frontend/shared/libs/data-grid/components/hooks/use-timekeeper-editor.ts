import React from "react";
import type {
	TimeKeeperData,
	TimekeeperCellProps,
	TimePickerPosition,
} from "../models/timekeeper-cell-types";
import {
	applyTimeRestrictionMonkeyPatch,
	cleanupTimeRestrictionMonkeyPatch,
	TimeRestrictionService,
} from "../services/time-restriction-service";
import {
	formatTimeForDisplay,
	formatTimeForPicker,
	getSafeTimeValue,
	isValidDate,
	parseTimeFromPicker,
	TIME_REGEX_12,
	TIME_REGEX_24,
} from "../utils/time-utils";

type UseTimekeeperEditorProps = {
	data: TimekeeperCellProps;
	onChange: (value: TimekeeperCellProps) => void;
	onFinishedEditing?: (value: TimekeeperCellProps) => void;
	value: TimekeeperCellProps;
};

// Extracted constants to avoid magic numbers and improve readability
const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const EPOCH_YEAR = 1970;
const EPOCH_MONTH = 0; // January
const EPOCH_DAY = 1;
const BLUR_COMMIT_DELAY_MS = 150;
const PICKER_HEIGHT_PX = 300; // Approximate height of TimeKeeper
const PICKER_WIDTH_PX = 280; // Approximate width of TimeKeeper
const GAP_SMALL_PX = 8;
const VIEWPORT_MARGIN_PX = 20;
const EDGE_MIN_DISTANCE_PX = 10;

export const useTimekeeperEditor = ({
	data,
	onChange,
	onFinishedEditing,
	value,
}: UseTimekeeperEditorProps) => {
	// Refs for DOM elements
	const inputRef = React.useRef<HTMLInputElement>(null);
	const wrapperRef = React.useRef<HTMLDivElement>(null);
	const iconButtonRef = React.useRef<HTMLButtonElement>(null);
	const portalRef = React.useRef<HTMLDivElement>(null);

	// State management
	const [showPicker, setShowPicker] = React.useState(false);
	const [pickerPosition, setPickerPosition] =
		React.useState<TimePickerPosition>({ top: 0, left: 0 });
	const [timekeeperError, setTimekeeperError] = React.useState<string | null>(
		null
	);

	// Local time state to avoid grid re-renders during TimeKeeper interaction
	const [localTime, setLocalTime] = React.useState<Date | undefined>(data.time);
	const [localDisplayTime, setLocalDisplayTime] = React.useState<string>(
		data.displayTime || ""
	);

	// Update local state when props change (external updates)
	React.useEffect(() => {
		setLocalTime(data.time);
		setLocalDisplayTime(data.displayTime || "");
	}, [data.time, data.displayTime]);

	// Clear errors when picker state changes
	React.useEffect(() => {
		setTimekeeperError(null);
	}, []);

	// Create a stable initial time value that doesn't change during interaction
	const initialTimeValue = React.useMemo(
		() => getSafeTimeValue(data.time),
		[data.time]
	); // Only update when external data.time changes

	// Memoized formatted time value based on initial time
	const memoizedTimeValue = React.useMemo(() => {
		try {
			return formatTimeForPicker(initialTimeValue, data.use24Hour);
		} catch (_error) {
			return data.use24Hour ? "12:00" : "12:00pm";
		}
	}, [initialTimeValue, data.use24Hour]);

	// Static key to prevent re-renders during interaction
	const staticTimeKeeperKey = React.useMemo(
		() => `timekeeper-static-${Date.now()}`,
		[]
	); // Only create once when component mounts

	// Handle done click - propagate final changes and close
	const handleDoneClick = React.useCallback(() => {
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
	const handleTimeChange = React.useCallback(
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
	const handleInputChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
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
	const handleBlur = React.useCallback(
		(_e: React.FocusEvent<HTMLInputElement>) => {
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
			}, BLUR_COMMIT_DELAY_MS);
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
	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
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
	React.useEffect(() => {
		if (!showPicker) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [showPicker]);

	// Clean up monkey patch when component unmounts or picker closes
	React.useEffect(() => {
		if (!showPicker) {
			cleanupTimeRestrictionMonkeyPatch();
		}

		// Always cleanup on unmount
		return cleanupTimeRestrictionMonkeyPatch;
	}, [showPicker]);

	// Get time restriction service if date is available
	const timeRestrictionService = React.useMemo(() => {
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
	React.useEffect(() => {
		if (showPicker && timeRestrictionService) {
			// Apply the monkey patch before TimeKeeper renders
			applyTimeRestrictionMonkeyPatch(timeRestrictionService);
		}
	}, [showPicker, timeRestrictionService]);

	// Make sure monkey patch is applied early when picker opens
	const handleIconClickWithPatch = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
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
				const pickerHeight = PICKER_HEIGHT_PX; // Approximate height of TimeKeeper
				const pickerWidth = PICKER_WIDTH_PX; // Approximate width of TimeKeeper

				let top = inputRect.bottom + GAP_SMALL_PX;
				let left = inputRect.left;

				// Check if picker would go off screen bottom
				if (top + pickerHeight > window.innerHeight - VIEWPORT_MARGIN_PX) {
					top = inputRect.top - pickerHeight - GAP_SMALL_PX;
				}

				// Check if picker would go off screen right
				if (left + pickerWidth > window.innerWidth - VIEWPORT_MARGIN_PX) {
					left = window.innerWidth - pickerWidth - VIEWPORT_MARGIN_PX;
				}

				// Ensure minimum distance from edges
				top = Math.max(
					EDGE_MIN_DISTANCE_PX,
					Math.min(
						top,
						window.innerHeight - pickerHeight - EDGE_MIN_DISTANCE_PX
					)
				);
				left = Math.max(
					EDGE_MIN_DISTANCE_PX,
					Math.min(left, window.innerWidth - pickerWidth - EDGE_MIN_DISTANCE_PX)
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
