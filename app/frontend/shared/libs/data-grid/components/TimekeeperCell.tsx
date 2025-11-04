import {
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from '@glideapps/glide-data-grid'
import { createPortal } from 'react-dom'
import TimeKeeper from 'react-timekeeper'
import { useClickOutsideIgnore } from './hooks/useClickOutsideIgnore'
import { useTimekeeperEditor } from './hooks/useTimekeeperEditor'
import type {
	TimekeeperCell,
	TimekeeperCellProps,
} from './models/TimekeeperCellTypes'
import {
	ensureFadeInAnimation,
	timekeeperClassNames,
} from './styles/timekeeperStyles'
import { TIME_REGEX_12, TIME_REGEX_24 } from './utils/timeUtils'

// Clock Icon Component
const ClockIcon = () => (
	<svg
		aria-label="Clock icon"
		fill="none"
		height="16"
		role="img"
		stroke="currentColor"
		strokeWidth="2"
		viewBox="0 0 24 24"
		width="16"
	>
		<title>Clock</title>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
)

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
	timeRestrictionService?: unknown
	memoizedTimeValue?: string
	staticTimeKeeperKey?: string
	handleDoneClick: () => void
	data?: unknown
	timekeeperError?: string
	setTimekeeperError: (error?: string) => void
}) => {
	if (timekeeperError) {
		return (
			<div className={timekeeperClassNames.errorContainer}>
				<p>Time picker unavailable</p>
				<button
					className={timekeeperClassNames.retryButton}
					onClick={() => setTimekeeperError(undefined)}
					type="button"
				>
					Retry
				</button>
			</div>
		)
	}

	try {
		// Validate all props before passing to TimeKeeper
		const validatedTime = memoizedTimeValue
		const timekeeperData = data as { use24Hour?: boolean; selectedDate?: Date }
		const validatedHour24Mode = Boolean(timekeeperData.use24Hour)

		if (!validatedTime || typeof validatedTime !== 'string') {
			throw new Error('Invalid time value for TimeKeeper')
		}

		// Pass a dummy disabledTimeRange to trigger validation (if we have a custom validator)
		const disabledTimeRange = timeRestrictionService
			? { from: '00:00', to: '00:01' }
			: undefined

		if (timeRestrictionService) {
			const SATURDAY = 6
			const SUNDAY = 0
			const dayOfWeek = timekeeperData.selectedDate?.getDay()
			if (dayOfWeek === SATURDAY) {
				// Saturday time restrictions handled by service
			} else if (dayOfWeek === SUNDAY) {
				// Sunday time restrictions handled by service
			} else {
				// Weekday time restrictions handled by service
			}
		}

		return (
			<TimeKeeper
				closeOnMinuteSelect={false}
				coarseMinutes={(() => {
					const COARSE_MINUTES_INTERVAL = 120
					return COARSE_MINUTES_INTERVAL
				})()}
				disabledTimeRange={disabledTimeRange || null} // No-op since we handle time changes via done button
				doneButton={(_timeData) => (
					<button
						className={`${timekeeperClassNames.doneButton} ${timekeeperClassNames.clickOutsideIgnore}`}
						onClick={() => {
							handleDoneClick()
						}}
						type="button"
					>
						Done
					</button>
				)}
				hour24Mode={validatedHour24Mode}
				key={staticTimeKeeperKey}
				onChange={() => {
					// TimeKeeper onChange intentionally ignored; we handle changes via done button
				}}
				switchToMinuteOnHourSelect={true}
				time={validatedTime}
			/>
		)
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		setTimekeeperError('Failed to load time picker')
		return (
			<div className={timekeeperClassNames.errorContainer}>
				<p>Error: {errorMessage}</p>
				<button
					className={timekeeperClassNames.retryButton}
					onClick={() => setTimekeeperError(undefined)}
					type="button"
				>
					Retry
				</button>
			</div>
		)
	}
}

// Main renderer definition
const renderer: CustomRenderer<TimekeeperCell> = {
	kind: GridCellKind.Custom,
	isMatch: (c): c is TimekeeperCell =>
		(c.data as { kind?: string }).kind === 'timekeeper-cell',

	draw: (args, cell) => {
		const { displayTime } = cell.data
		drawTextCell(args, displayTime || '', cell.contentAlign)
		return true
	},

	measure: (ctx, cell, theme) => {
		const { displayTime } = cell.data
		return (
			ctx.measureText(displayTime || '').width + theme.cellHorizontalPadding * 2
		)
	},

	provideEditor: () => ({
		editor: (props) => {
			const { data } = props.value

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
					value: TimekeeperCellProps
				) => void,
				onFinishedEditing: props.onFinishedEditing as unknown as (
					value: TimekeeperCellProps
				) => void,
				value: props.value as unknown as TimekeeperCellProps,
			})

			// Use click outside ignore hook
			useClickOutsideIgnore({
				showPicker,
				wrapperRef,
				iconButtonRef,
				portalRef,
			})

			return (
				<div className={timekeeperClassNames.wrapper} ref={wrapperRef}>
					<input
						className={timekeeperClassNames.editor}
						onBlur={handleBlur}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder={data.use24Hour ? 'HH:MM' : 'h:mm am/pm'}
						ref={inputRef}
						type="text"
						value={localDisplayTime || ''}
					/>
					<button
						className={timekeeperClassNames.iconButton}
						onClick={handleIconClick}
						onMouseDown={(e) => {
							e.preventDefault()
						}}
						onMouseEnter={(e) => {
							const OPACITY_FULL = '1'
							const BACKGROUND_ALPHA = 0.1
							e.currentTarget.style.opacity = OPACITY_FULL
							e.currentTarget.style.backgroundColor = showPicker
								? `rgba(0, 0, 0, ${BACKGROUND_ALPHA})`
								: 'transparent'
						}}
						onMouseLeave={(e) => {
							const OPACITY_NORMAL = 0.7
							const BACKGROUND_ALPHA = 0.1
							e.currentTarget.style.opacity = String(OPACITY_NORMAL)
							e.currentTarget.style.backgroundColor = showPicker
								? `rgba(0, 0, 0, ${BACKGROUND_ALPHA})`
								: 'transparent'
						}}
						ref={iconButtonRef}
						style={{
							backgroundColor: (() => {
								const BACKGROUND_ALPHA = 0.1
								return showPicker
									? `rgba(0, 0, 0, ${BACKGROUND_ALPHA})`
									: 'transparent'
							})(),
						}}
						type="button"
					>
						<ClockIcon />
					</button>

					{showPicker &&
						createPortal(
							<div
								className={`${timekeeperClassNames.portal} ${timekeeperClassNames.clickOutsideIgnore}`}
								data-timekeeper-portal="true"
								ref={portalRef}
								style={{
									top: `${pickerPosition.top}px`,
									left: `${pickerPosition.left}px`,
								}}
							>
								<TimeKeeperRenderer
									data={data}
									handleDoneClick={handleDoneClick}
									memoizedTimeValue={memoizedTimeValue}
									staticTimeKeeperKey={staticTimeKeeperKey}
									timeRestrictionService={timeRestrictionService}
									{...(timekeeperError && { timekeeperError })}
									setTimekeeperError={(e?: string) =>
										setTimekeeperError(e ?? null)
									}
								/>
							</div>,
							document.body
						)}
				</div>
			)
		},
	}),

	onPaste: (val, data) => {
		if (TIME_REGEX_24.test(val) || TIME_REGEX_12.test(val)) {
			const EPOCH_YEAR = 1970
			const EPOCH_MONTH = 0
			const EPOCH_DAY = 1
			const SECONDS_DEFAULT = 0
			const MILLISECONDS_DEFAULT = 0
			const date = new Date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY)
			if (TIME_REGEX_24.test(val)) {
				const [hours, minutes] = val.split(':').map(Number)
				if (hours !== undefined && minutes !== undefined) {
					date.setHours(hours, minutes, SECONDS_DEFAULT, MILLISECONDS_DEFAULT)
				}
			} else {
				const match = val.match(TIME_REGEX_12)
				if (match?.[1] && match[2] && match[3]) {
					const NOON_HOUR = 12
					const MIDNIGHT_HOUR = 0
					const HOURS_IN_HALF_DAY = 12
					let hours = Number.parseInt(match[1], 10)
					const minutes = Number.parseInt(match[2], 10)
					const isPM = match[3].toLowerCase() === 'pm'
					if (hours === NOON_HOUR && !isPM) {
						hours = MIDNIGHT_HOUR
					} else if (hours !== NOON_HOUR && isPM) {
						hours += HOURS_IN_HALF_DAY
					}
					date.setHours(hours, minutes, SECONDS_DEFAULT, MILLISECONDS_DEFAULT)
				}
			}
			const displayTime = val
			return {
				...(data as TimekeeperCellProps),
				kind: 'timekeeper-cell',
				time: date,
				displayTime,
			}
		}
		return
	},
}

// Ensure animations are loaded
ensureFadeInAnimation()

export default renderer
