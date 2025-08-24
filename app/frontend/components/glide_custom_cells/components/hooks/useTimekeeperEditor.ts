import * as React from "react";
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

interface UseTimekeeperEditorProps {
	data: TimekeeperCellProps;
	onChange: (value: any) => void;
	onFinishedEditing?: (value: any) => void;
	value: any;
}

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
		null,
	);

	// Local time state to avoid grid re-renders during TimeKeeper interaction
	const [localTime, setLocalTime] = React.useState<Date | undefined>(data.time);
	const [localDisplayTime, setLocalDisplayTime] = React.useState<string>(
		data.displayTime || "",
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
	const initialTimeValue = React.useMemo(() => {
		return getSafeTimeValue(data.time);
	}, [data.time]); // Only update when external data.time changes

	// Memoized formatted time value based on initial time
	const memoizedTimeValue = React.useMemo(() => {
		try {
			return formatTimeForPicker(initialTimeValue, data.use24Hour);
		} catch (error) {
			console.warn("Error in memoized time formatting:", error);
			return data.use24Hour ? "12:00" : "12:00pm";
		}
	}, [initialTimeValue, data.use24Hour]);

	// Static key to prevent re-renders during interaction
	const staticTimeKeeperKey = React.useMemo(() => {
		return `timekeeper-static-${Date.now()}`;
	}, []); // Only create once when component mounts

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
		} catch (error) {
			console.warn("Error handling done click:", error);
			setTimekeeperError("Error closing time picker");
		}
	}, [localTime, localDisplayTime, data, value, onChange, onFinishedEditing]);

	// Handle time change from picker - update local state only, don't trigger grid re-render
	const handleTimeChange = React.useCallback(
		(timeData: TimeKeeperData) => {
			try {
				// Validate timeData object
				if (!timeData || typeof timeData !== "object") {
					console.warn("Invalid timeData received from TimeKeeper:", timeData);
					return;
				}

				const timeString =
					timeData.formatted12 || timeData.formatted24 || timeData.time;
				if (!timeString || typeof timeString !== "string") {
					console.warn(
						"No valid time string received from TimeKeeper:",
						timeData,
					);
					return;
				}

				const newDate = parseTimeFromPicker(timeString);

				// Validate the parsed date more thoroughly
				if (!isValidDate(newDate)) {
					console.warn(
						"Invalid date parsed from TimeKeeper:",
						timeString,
						newDate,
					);
					return;
				}

				// Additional validation for reasonable time values
				const hours = newDate.getHours();
				const minutes = newDate.getMinutes();
				if (
					Number.isNaN(hours) ||
					Number.isNaN(minutes) ||
					hours < 0 ||
					hours > 23 ||
					minutes < 0 ||
					minutes > 59
				) {
					console.warn("Invalid time values:", { hours, minutes });
					return;
				}

				// Update local state only - don't trigger grid re-render during interaction
				setLocalTime(newDate);
				setLocalDisplayTime(formatTimeForDisplay(newDate, data.use24Hour));
			} catch (error) {
				console.error(
					"Error handling time change from TimeKeeper:",
					error,
					timeData,
				);
				setTimekeeperError("Error processing time change");
			}
		},
		[data.use24Hour],
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
				parsedDate = new Date(1970, 0, 1);
				parsedDate.setHours(hours, minutes, 0, 0);
			} else if (!data.use24Hour && TIME_REGEX_12.test(inputValue)) {
				parsedDate = parseTimeFromPicker(inputValue);
			}

			if (parsedDate && isValidDate(parsedDate)) {
				setLocalTime(parsedDate);
			}
		},
		[data.use24Hour],
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
			}, 150);
		},
		[
			showPicker,
			localTime,
			localDisplayTime,
			data,
			value,
			onChange,
			onFinishedEditing,
		],
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
		[localTime, localDisplayTime, data, value, onChange, onFinishedEditing],
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
			console.log(
				"TimeRestrictionService created, applying monkey patch immediately",
			);
			applyTimeRestrictionMonkeyPatch(service);
		}

		return service;
	}, [data.selectedDate]);

	// Apply monkey patch immediately when we have restrictions and picker is shown
	React.useEffect(() => {
		if (showPicker && timeRestrictionService) {
			// Apply the monkey patch before TimeKeeper renders
			applyTimeRestrictionMonkeyPatch(timeRestrictionService);

			console.log(
				"Monkey patch applied for picker with date:",
				timeRestrictionService.selectedDate,
			);
			console.log("Day of week:", timeRestrictionService.selectedDate.getDay());
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
					console.log("Pre-applied monkey patch before showing picker");
				}

				// Calculate position for the picker
				const inputRect = inputRef.current.getBoundingClientRect();
				const pickerHeight = 300; // Approximate height of TimeKeeper
				const pickerWidth = 280; // Approximate width of TimeKeeper

				let top = inputRect.bottom + 8;
				let left = inputRect.left;

				// Check if picker would go off screen bottom
				if (top + pickerHeight > window.innerHeight - 20) {
					top = inputRect.top - pickerHeight - 8;
				}

				// Check if picker would go off screen right
				if (left + pickerWidth > window.innerWidth - 20) {
					left = window.innerWidth - pickerWidth - 20;
				}

				// Ensure minimum distance from edges
				top = Math.max(
					10,
					Math.min(top, window.innerHeight - pickerHeight - 10),
				);
				left = Math.max(
					10,
					Math.min(left, window.innerWidth - pickerWidth - 10),
				);

				setPickerPosition({ top, left });
				setShowPicker(true);
			}
		},
		[showPicker, timeRestrictionService],
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
