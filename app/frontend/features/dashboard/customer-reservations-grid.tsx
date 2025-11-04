'use client'

import {
	DataEditor,
	type GridCell,
	GridCellKind,
	type GridColumn,
	type Item,
} from '@glideapps/glide-data-grid'
import { i18n } from '@shared/libs/i18n'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Reservation } from '@/entities/event'
import { createGlideTheme } from '@/shared/libs/data-grid/components/utils/streamlitGlideTheme'

const DEFAULT_CONTAINER_WIDTH = 240
const THEME_UPDATE_DELAY_MS = 50
const DATE_MIN_WIDTH_PX = 85
const TIME_MIN_WIDTH_PX = 70
const TYPE_MIN_WIDTH_PX = 85
const DATE_WIDTH_RATIO = 0.35
const TIME_WIDTH_RATIO = 0.3
const HOURS_PER_HALF_DAY = 12
const GRID_HEADER_HEIGHT_PX = 22
const GRID_ROW_HEIGHT_PX = 24
const GRID_MAX_HEIGHT_PX = 300

type CustomerReservationsGridProps = {
	reservations: Reservation[]
	isLocalized: boolean
}

export function CustomerReservationsGrid({
	reservations,
	isLocalized,
}: CustomerReservationsGridProps) {
	const { theme: currentTheme } = useTheme()
	const isDarkMode = currentTheme === 'dark'

	// Container ref for measuring width
	const containerRef = useRef<HTMLDivElement>(null)
	const [containerWidth, setContainerWidth] = useState<number>(
		DEFAULT_CONTAINER_WIDTH
	)

	// Force grid to re-render when theme changes by using a key
	const [themeKey, setThemeKey] = useState(0)

	// Update theme key when theme changes
	useEffect(() => {
		// Small delay to ensure CSS variables are updated
		const timer = setTimeout(() => {
			setThemeKey((prev) => prev + 1)
		}, THEME_UPDATE_DELAY_MS)
		return () => clearTimeout(timer)
	}, [])

	// Measure container width
	useEffect(() => {
		if (!containerRef.current) {
			return
		}

		// Use requestAnimationFrame to prevent ResizeObserver loop errors
		const observer = new ResizeObserver((entries) => {
			requestAnimationFrame(() => {
				for (const entry of entries) {
					const width = entry.contentRect.width
					if (width > 0) {
						setContainerWidth(width)
					}
				}
			})
		})

		// Initial measurement
		const initialWidth = containerRef.current.offsetWidth
		if (initialWidth > 0) {
			setContainerWidth(initialWidth)
		}

		observer.observe(containerRef.current)

		return () => observer.disconnect()
	}, [])

	// Re-create theme when either light/dark mode or style theme changes
	const gridTheme = useMemo(() => {
		const baseTheme = createGlideTheme(isDarkMode ? 'dark' : 'light')
		return {
			...baseTheme,
			// Customize for smaller size in customer card
			cellHorizontalPadding: 6,
			cellVerticalPadding: 2,
			headerHeight: GRID_HEADER_HEIGHT_PX,
			rowHeight: GRID_ROW_HEIGHT_PX,
			baseFontStyle: '12px',
		}
	}, [isDarkMode])

	const columns: GridColumn[] = useMemo(() => {
		// Calculate column widths based on container width
		const totalWidth = containerWidth
		const dateWidth = Math.max(
			DATE_MIN_WIDTH_PX,
			Math.floor(totalWidth * DATE_WIDTH_RATIO)
		)
		const timeWidth = Math.max(
			TIME_MIN_WIDTH_PX,
			Math.floor(totalWidth * TIME_WIDTH_RATIO)
		)
		const typeWidth = Math.max(
			TYPE_MIN_WIDTH_PX,
			totalWidth - dateWidth - timeWidth
		)

		return [
			{
				title: i18n.getMessage('date_label', isLocalized),
				id: 'date',
				width: dateWidth,
			},
			{
				title: i18n.getMessage('time_label', isLocalized),
				id: 'time',
				width: timeWidth,
			},
			{
				title: i18n.getMessage('field_type', isLocalized),
				id: 'type',
				width: typeWidth,
			},
		]
	}, [isLocalized, containerWidth])

	const formatTime = useCallback((timeStr: string) => {
		try {
			// Handle various time formats
			if (timeStr.includes('AM') || timeStr.includes('PM')) {
				return timeStr
			}
			// Convert 24-hour format to 12-hour format
			const [hours, minutes] = timeStr.split(':')
			const hour = Number.parseInt(hours || '0', 10)
			const ampm = hour >= HOURS_PER_HALF_DAY ? 'PM' : 'AM'
			const hour12 = hour % HOURS_PER_HALF_DAY || HOURS_PER_HALF_DAY
			return `${hour12}:${minutes} ${ampm}`
		} catch {
			return timeStr
		}
	}, [])

	const formatDate = useCallback(
		(dateStr: string) => {
			try {
				const date = new Date(dateStr)
				return date.toLocaleDateString(isLocalized ? 'ar-SA' : 'en-US', {
					month: 'short',
					day: 'numeric',
				})
			} catch {
				return dateStr
			}
		},
		[isLocalized]
	)

	const getServiceType = useCallback(
		(reservation: Reservation) => {
			// Map reservation types to display names - same as drawer implementation
			const typeValue = reservation.type || 0
			return typeValue === 0
				? i18n.getMessage('appt_checkup', isLocalized)
				: i18n.getMessage('appt_followup', isLocalized)
		},
		[isLocalized]
	)

	const getCellContent = useCallback(
		(cell: Item): GridCell => {
			const [col, row] = cell
			const reservation = reservations[row]

			if (!reservation) {
				return {
					kind: GridCellKind.Text,
					data: '',
					displayData: '',
					allowOverlay: false,
				}
			}

			const column = columns[col]
			if (!column) {
				return {
					kind: GridCellKind.Text,
					data: '',
					displayData: '',
					allowOverlay: false,
				}
			}
			switch (column.id) {
				case 'date':
					return {
						kind: GridCellKind.Text,
						data: reservation.date,
						displayData: formatDate(reservation.date),
						allowOverlay: false,
					}
				case 'time':
					return {
						kind: GridCellKind.Text,
						data: reservation.time_slot,
						displayData: formatTime(reservation.time_slot),
						allowOverlay: false,
					}
				case 'type':
					return {
						kind: GridCellKind.Text,
						data: reservation.type?.toString() || '0',
						displayData: getServiceType(reservation),
						allowOverlay: false,
					}
				default:
					return {
						kind: GridCellKind.Text,
						data: '',
						displayData: '',
						allowOverlay: false,
					}
			}
		},
		[reservations, columns, formatDate, formatTime, getServiceType]
	)

	if (reservations.length === 0) {
		return (
			<div className="py-2 text-center text-muted-foreground text-xs">
				{i18n.getMessage('customer_no_reservations', isLocalized)}
			</div>
		)
	}

	return (
		<div
			className="glide-grid-wrapper mt-1 w-full overflow-hidden rounded-sm"
			data-fullwidth="true"
			ref={containerRef}
		>
			<div className="glide-grid-inner glide-grid-inner-full glide-grid-fullwidth">
				<DataEditor
					className="gdg-wmyidgi"
					columns={columns}
					getCellContent={getCellContent}
					headerHeight={GRID_HEADER_HEIGHT_PX}
					height={Math.min(
						GRID_MAX_HEIGHT_PX,
						reservations.length * GRID_ROW_HEIGHT_PX + GRID_HEADER_HEIGHT_PX
					)}
					key={`customer-grid-${themeKey}`} // Header + rows (increased max height)
					rowHeight={GRID_ROW_HEIGHT_PX}
					rowMarkers="none"
					rows={reservations.length}
					smoothScrollX={false}
					smoothScrollY={false}
					theme={gridTheme}
					width={containerWidth}
				/>
			</div>
		</div>
	)
}
