"use client";

import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Calendar,
	ChevronRight,
	Clock,
	Copy,
	EyeOff,
	Filter,
	Hash,
	Link,
	Mail,
	Palette,
	Pin,
	PinOff,
	Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { i18n } from "@/shared/libs/i18n";

type EnhancedColumnMenuProps = {
	isOpen: boolean;
	x: number;
	y: number;
	columnId: string;
	columnTitle: string;
	columnType?: string;
	isPinned?: boolean;
	isLocalized?: boolean;
	onClose: () => void;
	onSort?: (direction: "asc" | "desc") => void;
	onPin?: () => void;
	onUnpin?: () => void;
	onHide?: () => void;
	onAutosize?: () => void;
	onCopy?: () => void;
	onFilter?: () => void;
	onFormat?: () => void;
	// Optional localization
	labels?: {
		sortAsc?: string;
		sortDesc?: string;
		pin?: string;
		unpin?: string;
		hide?: string;
		autosize?: string;
		copy?: string;
		filter?: string;
		format?: string;
		textFormat?: string;
		numberFormat?: string;
		dateFormat?: string;
	};
};

/**
 * Enhanced column menu with sorting, pinning, filtering, and formatting options
 * Fully generic and reusable for any grid implementation
 */

// Menu positioning constants to prevent overflow
const MENU_RESERVED_WIDTH = 220; // Width reserved from right edge for menu visibility
const MENU_RESERVED_HEIGHT = 300; // Height reserved from bottom edge for menu visibility

export function EnhancedColumnMenu({
	isOpen,
	x,
	y,
	columnId: _columnId,
	columnTitle,
	columnType = "text",
	isPinned = false,
	isLocalized,
	onClose,
	onSort,
	onPin,
	onUnpin,
	onHide,
	onAutosize,
	onCopy,
	onFilter,
	onFormat,
	labels = {},
}: EnhancedColumnMenuProps) {
	const [showFormatMenu, setShowFormatMenu] = useState(false);

	const _isLocalized = isLocalized ?? false;

	// Default labels
	const defaultLabels = {
		sortAsc: i18n.getMessage("cm_sort_asc", _isLocalized),
		sortDesc: i18n.getMessage("cm_sort_desc", _isLocalized),
		pin: i18n.getMessage("cm_pin_column", _isLocalized),
		unpin: i18n.getMessage("cm_unpin_column", _isLocalized),
		hide: i18n.getMessage("cm_hide_column", _isLocalized),
		autosize: i18n.getMessage("cm_autosize_column", _isLocalized),
		copy: i18n.getMessage("cm_copy", _isLocalized),
		filter: i18n.getMessage("cm_filter", _isLocalized),
		format: i18n.getMessage("cm_format", _isLocalized),
		textFormat: i18n.getMessage("cm_text_format", _isLocalized),
		numberFormat: i18n.getMessage("cm_number_format", _isLocalized),
		dateFormat: i18n.getMessage("cm_date_format", _isLocalized),
		...labels,
	};

	// Close menu when clicking outside
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-enhanced-column-menu]")) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		// Prevent scrolling while menu is open
		const preventScroll = (e: WheelEvent | TouchEvent) => {
			e.preventDefault();
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		document.addEventListener("wheel", preventScroll, { passive: false });
		document.addEventListener("touchmove", preventScroll, { passive: false });

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
			document.removeEventListener("wheel", preventScroll);
			document.removeEventListener("touchmove", preventScroll);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const getColumnIcon = () => {
		switch (columnType?.toLowerCase()) {
			case "date":
				return <Calendar className="h-4 w-4" />;
			case "time":
				return <Clock className="h-4 w-4" />;
			case "number":
				return <Hash className="h-4 w-4" />;
			case "email":
				return <Mail className="h-4 w-4" />;
			case "url":
			case "link":
				return <Link className="h-4 w-4" />;
			default:
				return <Type className="h-4 w-4" />;
		}
	};

	const menuItems = [
		// Sorting section
		...(onSort
			? [
					{
						id: "sort-asc",
						label: defaultLabels.sortAsc,
						icon: <ArrowUp className="h-4 w-4" />,
						onClick: () => {
							onSort("asc");
							onClose();
						},
						section: "sort",
					},
					{
						id: "sort-desc",
						label: defaultLabels.sortDesc,
						icon: <ArrowDown className="h-4 w-4" />,
						onClick: () => {
							onSort("desc");
							onClose();
						},
						section: "sort",
					},
				]
			: []),

		// Column management section
		...(onPin || onUnpin
			? [
					{
						id: "pin",
						label: isPinned ? defaultLabels.unpin : defaultLabels.pin,
						icon: isPinned ? (
							<PinOff className="h-4 w-4" />
						) : (
							<Pin className="h-4 w-4" />
						),
						onClick: () => {
							if (isPinned && onUnpin) {
								onUnpin();
							} else if (!isPinned && onPin) {
								onPin();
							}
							onClose();
						},
						section: "column",
					},
				]
			: []),

		...(onAutosize
			? [
					{
						id: "autosize",
						label: defaultLabels.autosize,
						icon: <ArrowUpDown className="h-4 w-4" />,
						onClick: () => {
							onAutosize();
							onClose();
						},
						section: "column",
					},
				]
			: []),

		...(onHide
			? [
					{
						id: "hide",
						label: defaultLabels.hide,
						icon: <EyeOff className="h-4 w-4" />,
						onClick: () => {
							onHide();
							onClose();
						},
						section: "column",
					},
				]
			: []),

		// Advanced actions (conditional)
		...(onCopy
			? [
					{
						id: "copy",
						label: defaultLabels.copy,
						icon: <Copy className="h-4 w-4" />,
						onClick: () => {
							onCopy();
							onClose();
						},
						section: "actions",
					},
				]
			: []),

		...(onFilter
			? [
					{
						id: "filter",
						label: defaultLabels.filter,
						icon: <Filter className="h-4 w-4" />,
						onClick: () => {
							onFilter();
							onClose();
						},
						section: "actions",
					},
				]
			: []),

		...(onFormat
			? [
					{
						id: "format",
						label: defaultLabels.format,
						icon: <Palette className="h-4 w-4" />,
						onClick: () => setShowFormatMenu(!showFormatMenu),
						hasSubmenu: true,
						section: "actions",
					},
				]
			: []),
	];

	// Group menu items by section
	const groupedItems = menuItems.reduce(
		(acc, item) => {
			if (!acc[item.section]) {
				acc[item.section] = [];
			}
			acc[item.section]?.push(item);
			return acc;
		},
		{} as Record<string, typeof menuItems>
	);

	const sections = Object.entries(groupedItems).filter(
		([_, items]) => items.length > 0
	);

	return (
		<div className="fixed inset-0 z-[999998]" data-enhanced-column-menu>
			{/* Backdrop */}
			<button
				aria-label="Close menu overlay"
				className="absolute inset-0"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
				}}
				type="button"
			/>

			{/* Menu */}
			<div
				className="enhanced-column-menu"
				style={{
					position: "absolute",
					left: `${Math.min(x, window.innerWidth - MENU_RESERVED_WIDTH)}px`,
					top: `${Math.min(y, window.innerHeight - MENU_RESERVED_HEIGHT)}px`,
					minWidth: "200px",
					backgroundColor: "var(--gdg-menu-bg, hsl(var(--popover)))",
					border: "1px solid var(--gdg-menu-border, hsl(var(--border)))",
					borderRadius: "var(--radius, 6px)",
					boxShadow: "var(--gdg-menu-shadow, 0 4px 12px rgba(0, 0, 0, 0.1))",
					overflow: "hidden",
					animation: "menuSlideIn 150ms ease-out",
				}}
			>
				{/* Header */}
				<div
					className="enhanced-column-menu-header"
					style={{
						padding: "8px 12px",
						borderBottom:
							"1px solid var(--gdg-menu-border, hsl(var(--border)))",
						fontSize: "14px",
						fontWeight: "500",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						color: "var(--gdg-menu-text, hsl(var(--popover-foreground)))",
					}}
				>
					{getColumnIcon()}
					<span
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{columnTitle}
					</span>
				</div>

				{/* Menu sections */}
				<div style={{ padding: "4px 0" }}>
					{sections.map(([section, items], sectionIndex) => (
						<div key={section}>
							{sectionIndex > 0 && (
								<div
									style={{
										height: "1px",
										margin: "4px 8px",
										backgroundColor:
											"var(--gdg-menu-border, hsl(var(--border)))",
									}}
								/>
							)}

							{items.map((item) => (
								<button
									className="enhanced-column-menu-item"
									key={item.id}
									onClick={item.onClick}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor =
											"var(--gdg-menu-hover-bg, hsl(var(--accent)))";
										e.currentTarget.style.color =
											"var(--gdg-menu-hover-text, hsl(var(--accent-foreground)))";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = "transparent";
										e.currentTarget.style.color =
											"var(--gdg-menu-text, hsl(var(--popover-foreground)))";
									}}
									style={{
										width: "100%",
										padding: "8px 12px",
										textAlign: "left",
										fontSize: "14px",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										border: "none",
										background: "transparent",
										color:
											"var(--gdg-menu-text, hsl(var(--popover-foreground)))",
										cursor: "pointer",
										transition: "background-color 0.15s ease",
										justifyContent: item.hasSubmenu
											? "space-between"
											: "flex-start",
									}}
									type="button"
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										{item.icon}
										<span>{item.label}</span>
									</div>
									{item.hasSubmenu && <ChevronRight className="h-4 w-4" />}
								</button>
							))}
						</div>
					))}
				</div>

				{/* Format submenu */}
				{showFormatMenu && onFormat && (
					<div
						className="enhanced-column-menu-submenu"
						style={{
							position: "absolute",
							left: "100%",
							top: "0",
							marginLeft: "4px",
							minWidth: "160px",
							backgroundColor: "var(--gdg-menu-bg, hsl(var(--popover)))",
							border: "1px solid var(--gdg-menu-border, hsl(var(--border)))",
							borderRadius: "var(--radius, 6px)",
							boxShadow:
								"var(--gdg-menu-shadow, 0 4px 12px rgba(0, 0, 0, 0.1))",
							overflow: "hidden",
							animation: "submenuSlideIn 150ms ease-out",
						}}
					>
						<div style={{ padding: "4px 0" }}>
							<button
								onClick={() => {
									onFormat();
									onClose();
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"var(--gdg-menu-hover-bg, hsl(var(--accent)))";
									e.currentTarget.style.color =
										"var(--gdg-menu-hover-text, hsl(var(--accent-foreground)))";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color =
										"var(--gdg-menu-text, hsl(var(--popover-foreground)))";
								}}
								style={{
									width: "100%",
									padding: "8px 12px",
									textAlign: "left",
									fontSize: "14px",
									border: "none",
									background: "transparent",
									color: "var(--gdg-menu-text, hsl(var(--popover-foreground)))",
									cursor: "pointer",
									transition: "background-color 0.15s ease",
								}}
								type="button"
							>
								{defaultLabels.textFormat}
							</button>
							<button
								onClick={() => {
									onFormat();
									onClose();
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"var(--gdg-menu-hover-bg, hsl(var(--accent)))";
									e.currentTarget.style.color =
										"var(--gdg-menu-hover-text, hsl(var(--accent-foreground)))";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color =
										"var(--gdg-menu-text, hsl(var(--popover-foreground)))";
								}}
								style={{
									width: "100%",
									padding: "8px 12px",
									textAlign: "left",
									fontSize: "14px",
									border: "none",
									background: "transparent",
									color: "var(--gdg-menu-text, hsl(var(--popover-foreground)))",
									cursor: "pointer",
									transition: "background-color 0.15s ease",
								}}
								type="button"
							>
								{defaultLabels.numberFormat}
							</button>
							<button
								onClick={() => {
									onFormat();
									onClose();
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"var(--gdg-menu-hover-bg, hsl(var(--accent)))";
									e.currentTarget.style.color =
										"var(--gdg-menu-hover-text, hsl(var(--accent-foreground)))";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color =
										"var(--gdg-menu-text, hsl(var(--popover-foreground)))";
								}}
								style={{
									width: "100%",
									padding: "8px 12px",
									textAlign: "left",
									fontSize: "14px",
									border: "none",
									background: "transparent",
									color: "var(--gdg-menu-text, hsl(var(--popover-foreground)))",
									cursor: "pointer",
									transition: "background-color 0.15s ease",
								}}
								type="button"
							>
								{defaultLabels.dateFormat}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
