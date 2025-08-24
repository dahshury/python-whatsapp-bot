import {
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import * as ReactDOM from "react-dom";
import TimeKeeper from "react-timekeeper";
import { useClickOutsideIgnore } from "./hooks/useClickOutsideIgnore";
import { useTimekeeperEditor } from "./hooks/useTimekeeperEditor";
// Import our refactored modules
import type {
	TimekeeperCell,
	TimekeeperCellProps,
} from "./models/TimekeeperCellTypes";
import {
	ensureFadeInAnimation,
	timekeeperClassNames,
} from "./styles/timekeeperStyles";
import { TIME_REGEX_12, TIME_REGEX_24 } from "./utils/timeUtils";

// Clock Icon Component
const ClockIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
);

// TimeKeeper Renderer Component
const TimeKeeperRenderer = ({
	timeRestrictionService,
	memoizedTimeValue,
	staticTimeKeeperKey,
	handleTimeChange,
	handleDoneClick,
	data,
	timekeeperError,
	setTimekeeperError,
}: any) => {
	if (timekeeperError) {
		return (
			<div className={timekeeperClassNames.errorContainer}>
				<p>Time picker unavailable</p>
				<button
					onClick={() => setTimekeeperError(null)}
					className={timekeeperClassNames.retryButton}
				>
					Retry
				</button>
			</div>
		);
	}

	try {
		// Validate all props before passing to TimeKeeper
		const validatedTime = memoizedTimeValue;
		const validatedHour24Mode = Boolean(data.use24Hour);

		if (!validatedTime || typeof validatedTime !== "string") {
			throw new Error("Invalid time value for TimeKeeper");
		}

		// Debug logging
		console.log("TimeKeeper restrictions:", {
			selectedDate: data.selectedDate,
			dateString: data.selectedDate
				? data.selectedDate.toDateString()
				: "No date",
			dayOfWeek: data.selectedDate ? data.selectedDate.getDay() : "No date",
			hasCustomValidator: !!timeRestrictionService,
			cellData: data,
		});

		// Pass a dummy disabledTimeRange to trigger validation (if we have a custom validator)
		const disabledTimeRange = timeRestrictionService
			? { from: "00:00", to: "00:01" }
			: undefined;

		if (timeRestrictionService) {
			const dayOfWeek = data.selectedDate?.getDay();
			if (dayOfWeek === 6) {
				console.log(
					"Using time restrictions for Saturday - 4PM-8PM enabled, 9PM+ disabled",
				);
			} else if (dayOfWeek === 0) {
				console.log("Using time restrictions for Sunday - 11AM-3PM enabled");
			} else {
				console.log("Using time restrictions for weekday - 12PM-3PM enabled");
			}
			console.log("DisabledTimeRange will be passed as:", disabledTimeRange);
		}

		return (
			<TimeKeeper
				key={staticTimeKeeperKey}
				time={validatedTime}
				onChange={handleTimeChange}
				hour24Mode={validatedHour24Mode}
				switchToMinuteOnHourSelect={true}
				closeOnMinuteSelect={false}
				doneButton={(timeData) => (
					<div
						className={`${timekeeperClassNames.doneButton} ${timekeeperClassNames.clickOutsideIgnore}`}
						onClick={() => {
							console.log("Custom done button clicked!", timeData);
							handleDoneClick();
						}}
					>
						Done
					</div>
				)}
				coarseMinutes={120}
				disabledTimeRange={disabledTimeRange}
			/>
		);
	} catch (error) {
		console.error("Error in TimeKeeperRenderer:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		setTimekeeperError("Failed to load time picker");
		return (
			<div className={timekeeperClassNames.errorContainer}>
				<p>Error: {errorMessage}</p>
				<button
					onClick={() => setTimekeeperError(null)}
					className={timekeeperClassNames.retryButton}
				>
					Retry
				</button>
			</div>
		);
	}
};

// Main renderer definition
const renderer: CustomRenderer<TimekeeperCell> = {
	kind: GridCellKind.Custom,
	isMatch: (c): c is TimekeeperCell =>
		(c.data as any).kind === "timekeeper-cell",

	draw: (args, cell) => {
		const { displayTime } = cell.data;
		drawTextCell(args, displayTime || "", cell.contentAlign);
		return true;
	},

	measure: (ctx, cell, theme) => {
		const { displayTime } = cell.data;
		return (
			ctx.measureText(displayTime || "").width + theme.cellHorizontalPadding * 2
		);
	},

	provideEditor: () => ({
		editor: (props) => {
			const { data } = props.value;

			// Use our custom hook for all editor logic
			const {
				inputRef,
				wrapperRef,
				iconButtonRef,
				portalRef,
				showPicker,
				pickerPosition,
				timekeeperError,
				localDisplayTime,
				memoizedTimeValue,
				staticTimeKeeperKey,
				timeRestrictionService,
				handleIconClick,
				handleDoneClick,
				handleTimeChange,
				handleInputChange,
				handleBlur,
				handleKeyDown,
				setTimekeeperError,
			} = useTimekeeperEditor({
				data,
				onChange: props.onChange,
				onFinishedEditing: props.onFinishedEditing,
				value: props.value,
			});

			// Use click outside ignore hook
			useClickOutsideIgnore({
				showPicker,
				wrapperRef,
				iconButtonRef,
				portalRef,
			});

			return (
				<div ref={wrapperRef} className={timekeeperClassNames.wrapper}>
					<input
						ref={inputRef}
						type="text"
						value={localDisplayTime || ""}
						onChange={handleInputChange}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						className={timekeeperClassNames.editor}
						placeholder={data.use24Hour ? "HH:MM" : "h:mm am/pm"}
					/>
					<button
						ref={iconButtonRef}
						type="button"
						onClick={handleIconClick}
						onMouseDown={(e) => {
							e.preventDefault();
						}}
						className={timekeeperClassNames.iconButton}
						style={{
							backgroundColor: showPicker
								? "rgba(0, 0, 0, 0.1)"
								: "transparent",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.opacity = "1";
							e.currentTarget.style.backgroundColor = showPicker
								? "rgba(0, 0, 0, 0.1)"
								: "transparent";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.opacity = "0.7";
							e.currentTarget.style.backgroundColor = showPicker
								? "rgba(0, 0, 0, 0.1)"
								: "transparent";
						}}
					>
						<ClockIcon />
					</button>

					{showPicker &&
						ReactDOM.createPortal(
							<div
								ref={portalRef}
								data-timekeeper-portal="true"
								className={`${timekeeperClassNames.portal} ${timekeeperClassNames.clickOutsideIgnore}`}
								style={{
									top: `${pickerPosition.top}px`,
									left: `${pickerPosition.left}px`,
								}}
							>
								<TimeKeeperRenderer
									timeRestrictionService={timeRestrictionService}
									memoizedTimeValue={memoizedTimeValue}
									staticTimeKeeperKey={staticTimeKeeperKey}
									handleTimeChange={handleTimeChange}
									handleDoneClick={handleDoneClick}
									data={data}
									timekeeperError={timekeeperError}
									setTimekeeperError={setTimekeeperError}
								/>
							</div>,
							document.body,
						)}
				</div>
			);
		},
	}),

	onPaste: (val, data) => {
		// Try to parse pasted time
		if (TIME_REGEX_24.test(val) || TIME_REGEX_12.test(val)) {
			const date = new Date(1970, 0, 1);

			if (TIME_REGEX_24.test(val)) {
				const [hours, minutes] = val.split(":").map(Number);
				date.setHours(hours, minutes, 0, 0);
			} else {
				const match = val.match(TIME_REGEX_12);
				if (match) {
					let hours = parseInt(match[1], 10);
					const minutes = parseInt(match[2], 10);
					const isPM = match[3].toLowerCase() === "pm";

					if (hours === 12 && !isPM) {
						hours = 0;
					} else if (hours !== 12 && isPM) {
						hours += 12;
					}

					date.setHours(hours, minutes, 0, 0);
				}
			}

			return {
				...data,
				time: date,
				displayTime: val,
			};
		}

		return undefined;
	},
};

// Ensure animations are loaded
ensureFadeInAnimation();

export default renderer;
export type { TimekeeperCell, TimekeeperCellProps };
