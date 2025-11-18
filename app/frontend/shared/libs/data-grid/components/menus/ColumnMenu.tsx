'use client'

import {
	ArrowDownward,
	ArrowUpward,
	ChevronRight,
	Close,
	FormatListNumbered,
	PushPin,
	UnfoldMore,
	VisibilityOff,
} from '@emotion-icons/material-outlined'
import type { GridColumn } from '@glideapps/glide-data-grid'
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { useLanguageStore } from '@/infrastructure/store/app-store'
import { i18n } from '@/shared/libs/i18n'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover'
import { useGridPortal } from '../contexts/GridPortalContext'
import type { BaseColumnProps } from '../core/types'
import { FormattingMenu } from './FormattingMenu'

export type ColumnMenuProps = {
	column: BaseColumnProps
	position: { x: number; y: number }
	onClose: () => void
	onSort?: (columnId: string, direction: 'asc' | 'desc') => void
	onPin?: (columnId: string, side: 'left' | 'right') => void
	onUnpin?: (columnId: string) => void
	onHide?: (columnId: string) => void
	onAutosize?: (columnId: string) => void
	onChangeFormat?: (columnId: string, format: string) => void
	isPinned?: 'left' | 'right' | false
	sortDirection?: 'asc' | 'desc' | null
	isDarkTheme?: boolean
}

export function ColumnMenu({
	column,
	position,
	onClose,
	onSort,
	onPin,
	onUnpin,
	onHide,
	onAutosize,
	onChangeFormat,
	isPinned = false,
	sortDirection = null,
	isDarkTheme = false,
}: ColumnMenuProps) {
	const [formatMenuOpen, setFormatMenuOpen] = useState(false)
	const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
	const portalContainer = useGridPortal()
	const menuId = React.useId()
	const { isLocalized } = useLanguageStore()

	const FORMAT_MENU_CLOSE_DELAY_MS = 150
	const MENU_PADDING = 8
	const SUBMENU_SPACING_NORMAL = 18

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement
			const menu = document.getElementById(menuId)
			const formatMenu = document.getElementById('formatting-menu')
			if (menu && !menu.contains(target) && !formatMenu?.contains(target)) {
				onClose()
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		document.addEventListener('mousedown', handleOutsideClick)
		document.addEventListener('keydown', handleEscape)

		return () => {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current)
			}
			document.removeEventListener('mousedown', handleOutsideClick)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [onClose, menuId])

	const handleSort = useCallback(
		(direction: 'asc' | 'desc') => {
			if (onSort) {
				onSort(column.id, direction)
			}
			onClose()
		},
		[onSort, column.id, onClose]
	)

	const handlePin = useCallback(
		(side: 'left' | 'right') => {
			if (onPin) {
				onPin(column.id, side)
			}
			onClose()
		},
		[onPin, column.id, onClose]
	)

	const handleUnpin = useCallback(() => {
		if (onUnpin) {
			onUnpin(column.id)
		}
		onClose()
	}, [onUnpin, column.id, onClose])

	const handleHide = useCallback(() => {
		if (onHide) {
			onHide(column.id)
		}
		onClose()
	}, [onHide, column.id, onClose])

	const handleAutosize = useCallback(() => {
		if (onAutosize) {
			onAutosize(column.id)
		}
		onClose()
	}, [onAutosize, column.id, onClose])

	const handleFormatChange = useCallback(
		(format: string) => {
			if (onChangeFormat) {
				onChangeFormat(column.id, format)
			}
			onClose()
		},
		[onChangeFormat, column.id, onClose]
	)

	const handleFormatMenuEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
		setFormatMenuOpen(true)
	}

	const handleFormatMenuLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setFormatMenuOpen(false)
		}, FORMAT_MENU_CLOSE_DELAY_MS)
	}

	/* ---------- adaptive positioning ---------- */
	const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0

	// Position is now the right edge of the header cell (where the arrow is)
	// We want the menu to align to the right edge, so position the container there
	// The PopoverContent with align="end" will align its right edge to the anchor
	const menuLeft = Math.min(position.x, viewportW - MENU_PADDING)

	// Compute container-relative offsets if portal inside dialog
	const containerRect =
		portalContainer && portalContainer !== document.body
			? portalContainer.getBoundingClientRect()
			: null
	const adjustedY = containerRect ? position.y - containerRect.top : position.y
	const adjustedMenuLeft = containerRect
		? menuLeft - containerRect.left
		: menuLeft
	// Helper to compute submenu left - position it to the left of the menu
	// Since menu is aligned to the right edge, submenu should appear to the left
	const submenuLeft = adjustedMenuLeft - SUBMENU_SPACING_NORMAL

	const hoverBg = isDarkTheme ? '#3a3a3a' : '#f0f0f0'
	const textColor = isDarkTheme ? '#f1f1f1' : '#333'
	const borderColor = isDarkTheme ? '#3a3a3a' : '#e1e1e1'

	const MenuWrapper = (
		<div
			className="click-outside-ignore column-menu-wrapper"
			id={menuId}
			style={{
				position: 'absolute',
				transform: `translate(${adjustedMenuLeft}px, ${adjustedY}px)`,
			}}
		>
			<Popover onOpenChange={(o) => !o && onClose()} open>
				{/* Anchor at wrapper origin so popover can position reliably */}
				<PopoverAnchor className="column-menu-wrapper" />
				<PopoverContent
					align="end"
					className={`column-menu click-outside-ignore column-menu-content ${isDarkTheme ? 'dark' : ''}`}
					sideOffset={0}
				>
					<div
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						onKeyDown={(e) => {
							// Handle keyboard navigation for menu items
							if (e.key === 'Escape') {
								// Close menu on Escape
								e.preventDefault()
								e.stopPropagation()
								// The popover should handle closing
							}
							// Let individual menu items handle Enter/Space
						}}
						onMouseDown={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						role="menu"
						tabIndex={-1} // Focus should be on menu items, not the container
					>
						{onSort && (
							<>
								<MenuItem
									active={sortDirection === 'asc'}
									hoverBg={hoverBg}
									icon={<ArrowUpward size={14} />}
									label={i18n.getMessage('cm_sort_asc', isLocalized)}
									onClick={() => handleSort('asc')}
									textColor={textColor}
								/>
								<MenuItem
									active={sortDirection === 'desc'}
									hoverBg={hoverBg}
									icon={<ArrowDownward size={14} />}
									label={i18n.getMessage('cm_sort_desc', isLocalized)}
									onClick={() => handleSort('desc')}
									textColor={textColor}
								/>
								<MenuDivider color={borderColor} />
							</>
						)}

						{onChangeFormat &&
							((column as GridColumn & { dataType?: string }).dataType ===
								'number' ||
								(column as GridColumn & { dataType?: string }).dataType ===
									'date' ||
								(column as GridColumn & { dataType?: string }).dataType ===
									'time') && (
								<div
									onMouseEnter={handleFormatMenuEnter}
									onMouseLeave={handleFormatMenuLeave}
									role="menuitem"
									tabIndex={0}
								>
									<MenuItem
										active={formatMenuOpen}
										hasSubmenu
										hoverBg={hoverBg}
										icon={<FormatListNumbered size={14} />}
										label={i18n.getMessage('cm_format', isLocalized)}
										textColor={textColor}
									/>
									{formatMenuOpen && (
										<FormattingMenu
											column={column}
											isDarkTheme={isDarkTheme}
											onClose={() => setFormatMenuOpen(false)}
											onFormatChange={handleFormatChange}
											parentTimeoutRef={closeTimeoutRef}
											position={{ x: submenuLeft, y: adjustedY + 60 }}
										/>
									)}
								</div>
							)}

						{onAutosize && (
							<MenuItem
								hoverBg={hoverBg}
								icon={<UnfoldMore size={14} />}
								label={i18n.getMessage('cm_autosize_column', isLocalized)}
								onClick={handleAutosize}
								textColor={textColor}
							/>
						)}

						{isPinned ? (
							<MenuItem
								hoverBg={hoverBg}
								icon={<Close size={14} />}
								label={i18n.getMessage('cm_unpin_column', isLocalized)}
								onClick={handleUnpin}
								textColor={textColor}
							/>
						) : (
							<MenuItem
								hoverBg={hoverBg}
								icon={<PushPin size={14} />}
								label={i18n.getMessage('cm_pin_column', isLocalized)}
								onClick={() => handlePin('left')}
								textColor={textColor}
							/>
						)}

						{onHide && (
							<MenuItem
								hoverBg={hoverBg}
								icon={<VisibilityOff size={14} />}
								label={i18n.getMessage('cm_hide_column', isLocalized)}
								onClick={handleHide}
								textColor={textColor}
							/>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)

	if (!portalContainer) {
		return null
	}

	return ReactDOM.createPortal(MenuWrapper, portalContainer)
}

type MenuItemProps = {
	icon: React.ReactNode
	label: string
	onClick?: () => void
	hasSubmenu?: boolean
	active?: boolean
	hoverBg: string
	textColor: string
}

function MenuItem({
	icon,
	label,
	onClick,
	hasSubmenu,
	active,
	hoverBg,
	textColor,
}: MenuItemProps) {
	return (
		<div
			className={`menu-item column-menu-item ${active ? 'active' : ''} ${hasSubmenu ? 'has-submenu' : ''}`}
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
				onClick?.()
			}}
			onKeyDown={(e) => {
				if (onClick && (e.key === 'Enter' || e.key === ' ')) {
					e.preventDefault()
					e.stopPropagation()
					onClick()
				}
			}}
			onMouseDown={(e) => {
				// Prevent global mousedown outside handlers
				e.preventDefault()
				e.stopPropagation()
			}}
			role="menuitem"
			style={
				{
					'--gdg-menu-item-bg': active ? hoverBg : 'transparent',
					'--gdg-menu-item-color': textColor,
				} as React.CSSProperties
			}
			tabIndex={0}
		>
			<div className="column-menu-item-content">
				{icon}
				{label}
			</div>
			{hasSubmenu && <ChevronRight size={14} />}
		</div>
	)
}

function MenuDivider({ color }: { color: string }) {
	return (
		<div
			className={`column-menu-divider ${color === '#3a3a3a' ? 'dark' : ''}`}
			style={
				{
					'--gdg-menu-divider-color': color,
				} as React.CSSProperties
			}
		/>
	)
}
