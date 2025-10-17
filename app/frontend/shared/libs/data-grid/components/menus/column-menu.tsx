import {
	ArrowDownward,
	ArrowUpward,
	ChevronRight,
	Close,
	FormatListNumbered,
	PushPin,
	UnfoldMore,
	VisibilityOff,
} from "@emotion-icons/material-outlined";
import type { GridColumn } from "@glideapps/glide-data-grid";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { i18n } from "@/shared/libs/i18n";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";
import { useGridPortal } from "../contexts/grid-portal-context";
import type { BaseColumnProps } from "../core/types";
import { FormattingMenu } from "./formatting-menu";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MENU_WIDTH = 160;
const SUBMENU_WIDTH = 200;
const MENU_CLOSE_DELAY_MS = 150; // 150ms delay for hover interactions
const MENU_PADDING_PX = 8;
const SUBMENU_OFFSET_PX = 18;
const SUBMENU_OVERLAP_PX = 10;

export type ColumnMenuProps = {
	column: BaseColumnProps;
	position: { x: number; y: number };
	onClose: () => void;
	onSort?: (columnId: string, direction: "asc" | "desc") => void;
	onPin?: (columnId: string, side: "left" | "right") => void;
	onUnpin?: (columnId: string) => void;
	onHide?: (columnId: string) => void;
	onAutosize?: (columnId: string) => void;
	onChangeFormat?: (columnId: string, format: string) => void;
	isPinned?: "left" | "right" | false;
	sortDirection?: "asc" | "desc" | null;
	isDarkTheme?: boolean;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component requires multiple event handlers
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
	const [formatMenuOpen, setFormatMenuOpen] = useState(false);
	const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
	const portalContainer = useGridPortal();
	const menuId = React.useId();

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const menu = document.getElementById(menuId);
			const formatMenu = document.getElementById("formatting-menu");
			if (menu && !menu.contains(target) && !formatMenu?.contains(target)) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		document.addEventListener("keydown", handleEscape);

		return () => {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
			}
			document.removeEventListener("mousedown", handleOutsideClick);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose, menuId]);

	const handleSort = useCallback(
		(direction: "asc" | "desc") => {
			if (onSort) {
				onSort(column.id, direction);
			}
			onClose();
		},
		[onSort, column.id, onClose]
	);

	const handlePin = useCallback(
		(side: "left" | "right") => {
			if (onPin) {
				onPin(column.id, side);
			}
			onClose();
		},
		[onPin, column.id, onClose]
	);

	const handleUnpin = useCallback(() => {
		if (onUnpin) {
			onUnpin(column.id);
		}
		onClose();
	}, [onUnpin, column.id, onClose]);

	const handleHide = useCallback(() => {
		if (onHide) {
			onHide(column.id);
		}
		onClose();
	}, [onHide, column.id, onClose]);

	const handleAutosize = useCallback(() => {
		if (onAutosize) {
			onAutosize(column.id);
		}
		onClose();
	}, [onAutosize, column.id, onClose]);

	const handleFormatChange = useCallback(
		(format: string) => {
			if (onChangeFormat) {
				onChangeFormat(column.id, format);
			}
			onClose();
		},
		[onChangeFormat, column.id, onClose]
	);

	const handleFormatMenuEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setFormatMenuOpen(true);
	};

	const handleFormatMenuLeave = () => {
		closeTimeoutRef.current = setTimeout(() => {
			setFormatMenuOpen(false);
		}, MENU_CLOSE_DELAY_MS); // 150ms delay
	};

	/* ---------- adaptive positioning ---------- */
	const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;

	const leftOverflow = position.x + MENU_WIDTH > viewportW;
	const menuLeft = leftOverflow
		? Math.max(position.x - MENU_WIDTH, MENU_PADDING_PX)
		: position.x;

	// Compute container-relative offsets if portal inside dialog
	const containerRect =
		portalContainer && portalContainer !== document.body
			? portalContainer.getBoundingClientRect()
			: null;
	const adjustedY = containerRect ? position.y - containerRect.top : position.y;
	const adjustedMenuLeft = containerRect
		? menuLeft - containerRect.left
		: menuLeft;

	// Helper to compute submenu left
	const submenuLeft = leftOverflow
		? adjustedMenuLeft - SUBMENU_WIDTH + SUBMENU_OVERLAP_PX
		: adjustedMenuLeft + MENU_WIDTH - SUBMENU_OFFSET_PX;

	const bgColor = isDarkTheme ? "#2a2a2a" : "white";
	const borderColor = isDarkTheme ? "#3a3a3a" : "#e1e1e1";
	const hoverBg = isDarkTheme ? "#3a3a3a" : "#f0f0f0";
	const textColor = isDarkTheme ? "#f1f1f1" : "#333";

	const containerStyles: React.CSSProperties = {
		position: "absolute",
		left: adjustedMenuLeft,
		top: adjustedY,
		zIndex:
			Number((Z_INDEX as Record<string, number>).GRID_MENU) ||
			Number((Z_INDEX as Record<string, number>).GRID_FULLSCREEN_CONTENT) + 1,
		pointerEvents: "auto",
	};

	const contentStyles: React.CSSProperties = {
		backgroundColor: bgColor,
		border: `0.5px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
		borderRadius: 4,
		boxShadow: "0 2px 5px rgba(0,0,0,0.12)",
		minWidth: MENU_WIDTH,
		zIndex:
			Number((Z_INDEX as Record<string, number>).GRID_MENU) ||
			Number((Z_INDEX as Record<string, number>).GRID_FULLSCREEN_CONTENT) + 1,
		padding: MENU_PADDING_PX,
	};

	const MenuWrapper = (
		<div className="click-outside-ignore" id={menuId} style={containerStyles}>
			<Popover onOpenChange={(o) => !o && onClose()} open>
				{/* Anchor at wrapper origin so popover can position reliably */}
				<PopoverAnchor
					style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0 }}
				/>
				<PopoverContent
					align="start"
					className="column-menu click-outside-ignore"
					sideOffset={0}
					style={contentStyles}
				>
					<div
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						onKeyDown={(e) => {
							// Handle keyboard navigation for menu items
							if (e.key === "Escape") {
								// Close menu on Escape
								e.preventDefault();
								e.stopPropagation();
								// The popover should handle closing
							}
							// Let individual menu items handle Enter/Space
						}}
						onMouseDown={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						role="menu"
						tabIndex={-1} // Focus should be on menu items, not the container
					>
						{renderMenuItems({
							...(onSort !== undefined && { onSort }),
							sortDirection,
							hoverBg,
							textColor,
							borderColor,
							...(onAutosize !== undefined && { onAutosize }),
							...(onChangeFormat !== undefined && { onChangeFormat }),
							formatMenuOpen,
							setFormatMenuOpen,
							column,
							isDarkTheme,
							handleFormatMenuEnter,
							handleFormatMenuLeave,
							handleSort,
							handlePin,
							handleUnpin,
							handleHide,
							handleAutosize,
							handleFormatChange,
							isPinned,
							...(onHide !== undefined && { onHide }),
							...(onPin !== undefined && { onPin }),
							...(onUnpin !== undefined && { onUnpin }),
							adjustedY,
							submenuLeft,
							closeTimeoutRef,
						})}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);

	if (!portalContainer) {
		return null;
	}

	return ReactDOM.createPortal(MenuWrapper, portalContainer);
}

type MenuItemsProps = {
	onSort?: (columnId: string, direction: "asc" | "desc") => void;
	sortDirection: "asc" | "desc" | null;
	hoverBg: string;
	textColor: string;
	borderColor: string;
	onAutosize?: (columnId: string) => void;
	onChangeFormat?: (columnId: string, format: string) => void;
	formatMenuOpen: boolean;
	setFormatMenuOpen: (open: boolean) => void;
	column: BaseColumnProps;
	isDarkTheme: boolean;
	handleFormatMenuEnter: () => void;
	handleFormatMenuLeave: () => void;
	handleSort: (direction: "asc" | "desc") => void;
	handlePin: (side: "left" | "right") => void;
	handleUnpin: () => void;
	handleHide: () => void;
	handleAutosize: () => void;
	handleFormatChange: (format: string) => void;
	isPinned: "left" | "right" | false;
	onHide?: (columnId: string) => void;
	onPin?: (columnId: string, side: "left" | "right") => void;
	onUnpin?: (columnId: string) => void;
	adjustedY: number;
	submenuLeft: number;
	closeTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
};

function renderMenuItems(props: MenuItemsProps): React.ReactNode {
	return (
		<>
			{props.onSort && (
				<>
					<MenuItem
						active={props.sortDirection === "asc"}
						hoverBg={props.hoverBg}
						icon={<ArrowUpward size={14} />}
						label={i18n.getMessage("cm_sort_asc", false)}
						onClick={() => props.handleSort("asc")}
						textColor={props.textColor}
					/>
					<MenuItem
						active={props.sortDirection === "desc"}
						hoverBg={props.hoverBg}
						icon={<ArrowDownward size={14} />}
						label={i18n.getMessage("cm_sort_desc", false)}
						onClick={() => props.handleSort("desc")}
						textColor={props.textColor}
					/>
					<MenuDivider color={props.borderColor} />
				</>
			)}

			{props.onChangeFormat &&
				((props.column as GridColumn & { dataType?: string }).dataType ===
					"number" ||
					(props.column as GridColumn & { dataType?: string }).dataType ===
						"date" ||
					(props.column as GridColumn & { dataType?: string }).dataType ===
						"time") && (
					<div
						onMouseEnter={props.handleFormatMenuEnter}
						onMouseLeave={props.handleFormatMenuLeave}
						role="menuitem"
						tabIndex={0}
					>
						<MenuItem
							active={props.formatMenuOpen}
							hasSubmenu
							hoverBg={props.hoverBg}
							icon={<FormatListNumbered size={14} />}
							label={i18n.getMessage("cm_format", false)}
							textColor={props.textColor}
						/>
						{props.formatMenuOpen && (
							<FormattingMenu
								column={props.column}
								isDarkTheme={props.isDarkTheme}
								onClose={() => props.setFormatMenuOpen(false)}
								onFormatChange={props.handleFormatChange}
								parentTimeoutRef={props.closeTimeoutRef}
								position={{ x: props.submenuLeft, y: props.adjustedY + 60 }}
							/>
						)}
					</div>
				)}

			{props.onAutosize && (
				<MenuItem
					hoverBg={props.hoverBg}
					icon={<UnfoldMore size={14} />}
					label={i18n.getMessage("cm_autosize_column", false)}
					onClick={props.handleAutosize}
					textColor={props.textColor}
				/>
			)}

			{props.isPinned ? (
				<MenuItem
					hoverBg={props.hoverBg}
					icon={<Close size={14} />}
					label={i18n.getMessage("cm_unpin_column", false)}
					onClick={props.handleUnpin}
					textColor={props.textColor}
				/>
			) : (
				<MenuItem
					hoverBg={props.hoverBg}
					icon={<PushPin size={14} />}
					label={i18n.getMessage("cm_pin_column", false)}
					onClick={() => props.handlePin("left")}
					textColor={props.textColor}
				/>
			)}

			{props.onHide && (
				<MenuItem
					hoverBg={props.hoverBg}
					icon={<VisibilityOff size={14} />}
					label={i18n.getMessage("cm_hide_column", false)}
					onClick={props.handleHide}
					textColor={props.textColor}
				/>
			)}
		</>
	);
}

type MenuItemProps = {
	icon: React.ReactNode;
	label: string;
	onClick?: () => void;
	hasSubmenu?: boolean;
	active?: boolean;
	hoverBg: string;
	textColor: string;
};

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
			className={`menu-item ${active ? "active" : ""}`}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick?.();
			}}
			onKeyDown={(e) => {
				if (onClick && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					e.stopPropagation();
					onClick();
				}
			}}
			onMouseDown={(e) => {
				// Prevent global mousedown outside handlers
				e.preventDefault();
				e.stopPropagation();
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = hoverBg;
			}}
			onMouseLeave={(e) => {
				if (!active) {
					e.currentTarget.style.backgroundColor = "transparent";
				}
			}}
			role="menuitem"
			style={{
				display: "flex",
				alignItems: "center",
				gap: "6px",
				padding: "6px 10px",
				cursor: "pointer",
				backgroundColor: active ? hoverBg : "transparent",
				color: textColor,
				fontSize: "12px",
				justifyContent: hasSubmenu ? "space-between" : "flex-start",
			}}
			tabIndex={0}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				{icon}
				{label}
			</div>
			{hasSubmenu && <ChevronRight size={14} />}
		</div>
	);
}

function MenuDivider({ color }: { color: string }) {
	return (
		<div
			style={{
				height: "1px",
				backgroundColor: color,
				margin: "4px 0",
			}}
		/>
	);
}
