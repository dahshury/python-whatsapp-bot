import {
	type CustomRenderer,
	GridCellKind,
	drawTextCell,
} from "@glideapps/glide-data-grid";
import * as ReactDOM from "react-dom";
import TimeKeeper from "react-timekeeper";
import { useClickOutsideIgnore } from "./hooks/useClickOutsideIgnore";
import { useTimekeeperEditor } from "./hooks/useTimekeeperEditor";
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
		role="img"
		aria-label="Clock icon"
	>
		<title>Clock</title>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
);

// TimeKeeper Renderer Component
const TimeKeeperRenderer = ({
	timeRestrictionService,
	memoizedTimeValue,
	staticTimeKeeperKey,
	handleDoneClick,
	data,
	timekeeperError,
	setTimekeeperError,
}: {
	timeRestrictionService?: unknown;
	memoizedTimeValue?: string;
	staticTimeKeeperKey?: string;
	handleDoneClick: () => void;
	data?: unknown;
	timekeeperError?: string;
	setTimekeeperError: (error?: string) => void;
}) => {
	if (timekeeperError) {
		return (
			<div className={timekeeperClassNames.errorContainer}>
				<p>Time picker unavailable</p>
				<button
					type="button"
					onClick={() => setTimekeeperError(undefined)}
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
		const timekeeperData = data as { use24Hour?: boolean; selectedDate?: Date };
		const validatedHour24Mode = Boolean(timekeeperData.use24Hour);

		if (!validatedTime || typeof validatedTime !== "string") {
			throw new Error("Invalid time value for TimeKeeper");
		}

		// Debug logging
		console.log("TimeKeeper restrictions:", {
			selectedDate: timekeeperData.selectedDate,
			dateString: timekeeperData.selectedDate
				? timekeeperData.selectedDate.toDateString()
				: "No date",
			dayOfWeek: timekeeperData.selectedDate
				? timekeeperData.selectedDate.getDay()
				: "No date",
			hasCustomValidator: !!timeRestrictionService,
			cellData: data,
		});

		// Pass a dummy disabledTimeRange to trigger validation (if we have a custom validator)
		const disabledTimeRange = timeRestrictionService
			? { from: "00:00", to: "00:01" }
			: undefined;

		if (timeRestrictionService) {
			const dayOfWeek = timekeeperData.selectedDate?.getDay();
			if (dayOfWeek === 6) {
				console.log(
					"Using time restrictions for Saturday - 4PM-9PM enabled, 10PM+ disabled",
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
				onChange={() => {}} // No-op since we handle time changes via done button
				hour24Mode={validatedHour24Mode}
				switchToMinuteOnHourSelect={true}
				closeOnMinuteSelect={false}
				doneButton={(timeData) => (
					<button
						type="button"
						className={`${timekeeperClassNames.doneButton} ${timekeeperClassNames.clickOutsideIgnore}`}
						onClick={() => {
							console.log("Custom done button clicked!", timeData);
							handleDoneClick();
						}}
					>
						Done
					</button>
				)}
				coarseMinutes={120}
				disabledTimeRange={disabledTimeRange || null}
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
					type="button"
					onClick={() => setTimekeeperError(undefined)}
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
		(c.data as { kind?: string }).kind === "timekeeper-cell",

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
				handleInputChange,
				handleBlur,
				handleKeyDown,
				setTimekeeperError,
			} = useTimekeeperEditor({
				data,
				onChange: props.onChange as unknown as (
					value: TimekeeperCellProps,
				) => void,
				onFinishedEditing: props.onFinishedEditing as unknown as (
					value: TimekeeperCellProps,
				) => void,
				value: props.value as unknown as TimekeeperCellProps,
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
									handleDoneClick={handleDoneClick}
									data={data}
									{...(timekeeperError && { timekeeperError: timekeeperError })}
									setTimekeeperError={(e?: string) =>
										setTimekeeperError(e ?? null)
									}
								/>
							</div>,
							document.body,
						)}
				</div>
			);
		},
	}),

	onPaste: (val, data) => {
		if (TIME_REGEX_24.test(val) || TIME_REGEX_12.test(val)) {
			const date = new Date(1970, 0, 1);
			if (TIME_REGEX_24.test(val)) {
				const [hours, minutes] = val.split(":").map(Number);
				if (hours !== undefined && minutes !== undefined) {
					date.setHours(hours, minutes, 0, 0);
				}
			} else {
				const match = val.match(TIME_REGEX_12);
				if (match?.[1] && match[2] && match[3]) {
					let hours = Number.parseInt(match[1], 10);
					const minutes = Number.parseInt(match[2], 10);
					const isPM = match[3].toLowerCase() === "pm";
					if (hours === 12 && !isPM) hours = 0;
					else if (hours !== 12 && isPM) hours += 12;
					date.setHours(hours, minutes, 0, 0);
				}
			}
			const displayTime = val;
			return {
				...(data as TimekeeperCellProps),
				kind: "timekeeper-cell",
				time: date,
				displayTime,
			};
		}
		return undefined;
	},
};

// Ensure animations are loaded
ensureFadeInAnimation();

export default renderer;
export type { TimekeeperCell, TimekeeperCellProps };
