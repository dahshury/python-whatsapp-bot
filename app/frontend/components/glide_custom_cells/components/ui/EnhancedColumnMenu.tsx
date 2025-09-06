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

interface EnhancedColumnMenuProps {
	isOpen: boolean;
	x: number;
	y: number;
	columnId: string;
	columnTitle: string;
	columnType?: string;
	isPinned?: boolean;
	isRTL?: boolean;
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
}

/**
 * Enhanced column menu with sorting, pinning, filtering, and formatting options
 * Fully generic and reusable for any grid implementation
 */
export function EnhancedColumnMenu({
	isOpen,
	x,
	y,
	columnId: _columnId,
	columnTitle,
	columnType = "text",
	isPinned = false,
	isRTL,
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

	const _isRTL = (isRTL ?? isLocalized === true) === true;

	// Default labels
	const defaultLabels = {
		sortAsc: _isRTL ? "ترتيب تصاعدي" : "Sort Ascending",
		sortDesc: _isRTL ? "ترتيب تنازلي" : "Sort Descending",
		pin: _isRTL ? "تثبيت العمود" : "Pin Column",
		unpin: _isRTL ? "إلغاء التثبيت" : "Unpin Column",
		hide: _isRTL ? "إخفاء العمود" : "Hide Column",
		autosize: _isRTL ? "تحجيم تلقائي" : "Auto-size",
		copy: _isRTL ? "نسخ العمود" : "Copy Column",
		filter: _isRTL ? "تصفية" : "Filter",
		format: _isRTL ? "تنسيق" : "Format",
		textFormat: _isRTL ? "تنسيق النص" : "Text Format",
		numberFormat: _isRTL ? "تنسيق الأرقام" : "Number Format",
		dateFormat: _isRTL ? "تنسيق التاريخ" : "Date Format",
		...labels,
	};

	// Close menu when clicking outside
	useEffect(() => {
		if (!isOpen) return;

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

	if (!isOpen) return null;

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
			if (!acc[item.section]) acc[item.section] = [];
			acc[item.section].push(item);
			return acc;
		},
		{} as Record<string, typeof menuItems>,
	);

	const sections = Object.entries(groupedItems).filter(
		([_, items]) => items.length > 0,
	);

	return (
		<div className="fixed inset-0 z-[999998]" data-enhanced-column-menu>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0"
				aria-label="Close menu overlay"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
				}}
			/>

			{/* Menu */}
			<div
				className="enhanced-column-menu"
				style={{
					position: "absolute",
					left: `${Math.min(x, window.innerWidth - 220)}px`,
					top: `${Math.min(y, window.innerHeight - 300)}px`,
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
									key={item.id}
									type="button"
									onClick={item.onClick}
									className="enhanced-column-menu-item"
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
								type="button"
								onClick={() => {
									onFormat();
									onClose();
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
							>
								{defaultLabels.textFormat}
							</button>
							<button
								type="button"
								onClick={() => {
									onFormat();
									onClose();
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
							>
								{defaultLabels.numberFormat}
							</button>
							<button
								type="button"
								onClick={() => {
									onFormat();
									onClose();
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

export default EnhancedColumnMenu;
