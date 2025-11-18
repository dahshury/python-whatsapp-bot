'use client'

import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
	type Rectangle,
} from '@glideapps/glide-data-grid'
import {
	WheelPicker,
	type WheelPickerOption,
	WheelPickerWrapper,
} from '@ncdai/react-wheel-picker'
import { useCallback, useMemo, useState } from 'react'
import { MAX_AGE } from '@/features/documents/model/age-validation.constants'

const MIN_AGE_WHEEL_WIDTH_PX = 120

type AgeWheelCellData = {
	kind: 'age-wheel-cell'
	value: number | null
	/** Optional preformatted display string */
	display?: string
	/** Inclusive range for options */
	min?: number
	max?: number
	/** Optional visual tweaks */
	visibleCount?: number
	optionItemHeight?: number
	infinite?: boolean
}

export type AgeWheelCell = CustomCell<AgeWheelCellData> & {
	kind: typeof GridCellKind.Custom
}

function buildOptions(min: number, max: number): WheelPickerOption[] {
	const options: WheelPickerOption[] = []
	const DEFAULT_MIN = 0
	const start = Number.isFinite(min) ? Math.floor(min) : DEFAULT_MIN
	const end = Number.isFinite(max) ? Math.floor(max) : MAX_AGE
	const INCREMENT = 1
	for (let i = start; i <= end; i += INCREMENT) {
		options.push({ label: String(i), value: String(i) })
	}
	return options
}

const AgeWheelCellRenderer: CustomRenderer<AgeWheelCell> = {
	kind: GridCellKind.Custom,
	isMatch: (cell): cell is AgeWheelCell =>
		cell.kind === GridCellKind.Custom &&
		typeof (cell as { data?: unknown }).data === 'object' &&
		(cell as { data?: { kind?: string } }).data?.kind === 'age-wheel-cell',

	draw: (args, cell) => {
		const data = cell.data
		const display = (data.display ?? data.value ?? '').toString()
		drawTextCell(args, display, cell.contentAlign)
		return true
	},

	measure: (ctx, cell, theme) => {
		const display = (cell.data.display ?? cell.data.value ?? '').toString()
		return ctx.measureText(display).width + theme.cellHorizontalPadding * 2
	},

	provideEditor: () => ({
		editor: (props: {
			value: AgeWheelCell
			onChange: (newValue: AgeWheelCell) => void
			onFinishedEditing: (
				newValue?: AgeWheelCell,
				movement?: readonly [-1 | 0 | 1, -1 | 0 | 1]
			) => void
			target: Rectangle
		}) => {
			const { value, onChange, onFinishedEditing } = props
			const DEFAULT_MIN_AGE = 10
			const DEFAULT_VISIBLE_COUNT = 20
			const DEFAULT_OPTION_ITEM_HEIGHT = 30
			const {
				min = DEFAULT_MIN_AGE,
				max = MAX_AGE,
				visibleCount = DEFAULT_VISIBLE_COUNT,
				optionItemHeight = DEFAULT_OPTION_ITEM_HEIGHT,
				infinite = false,
			} = value.data || {}

			const [effectiveMin, effectiveMax] = useMemo(() => {
				const a = Number.isFinite(min) ? Math.floor(min) : DEFAULT_MIN_AGE
				const b = Number.isFinite(max) ? Math.floor(max) : MAX_AGE
				return a <= b ? [a, b] : [DEFAULT_MIN_AGE, MAX_AGE]
			}, [min, max])

			const options = useMemo(
				() => buildOptions(effectiveMin, effectiveMax),
				[effectiveMin, effectiveMax]
			)

			const [localValue, setLocalValue] = useState<string>(
				value.data.value != null ? String(value.data.value) : String(min)
			)

			const commit = useCallback(
				(nextStr: string | null, finish = false) => {
					let parsed: number | null = null
					if (nextStr != null && nextStr !== '') {
						const n = Number(nextStr)
						parsed = Number.isFinite(n) ? n : null
					}
					const nextCell: AgeWheelCell = {
						...value,
						data: {
							...value.data,
							value: parsed,
							display: parsed == null ? '' : String(parsed),
						},
					}
					onChange(nextCell)
					if (finish) {
						onFinishedEditing(nextCell)
					}
				},
				[onChange, onFinishedEditing, value]
			)

			const handleValueChange = useCallback(
				(v: string) => {
					setLocalValue(v)
					commit(v, false)
				},
				[commit]
			)

			const isUnselected = value.data.value == null

			return (
				<fieldset
					aria-label="Age selector"
					className="age-wheel-cell-fieldset"
					style={
						{
							'--gdg-age-wheel-width': `${Math.max(MIN_AGE_WHEEL_WIDTH_PX, props.target?.width ?? MIN_AGE_WHEEL_WIDTH_PX)}px`,
						} as React.CSSProperties
					}
				>
					<WheelPickerWrapper className="w-full">
						<WheelPicker
							options={options}
							{...(isUnselected
								? { defaultValue: String(effectiveMin) }
								: { value: localValue })}
							classNames={{
								optionItem: 'text-muted-foreground',
								highlightWrapper: 'bg-muted text-foreground',
								highlightItem: 'text-foreground',
							}}
							infinite={infinite}
							onValueChange={handleValueChange}
							optionItemHeight={optionItemHeight}
							visibleCount={visibleCount}
						/>
					</WheelPickerWrapper>
				</fieldset>
			)
		},
		disablePadding: true,
	}),
}

export default AgeWheelCellRenderer
