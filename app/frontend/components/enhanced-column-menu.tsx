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
	Palette,
	Pin,
	PinOff,
	Type,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ColumnMenuProps {
	isOpen: boolean;
	x: number;
	y: number;
	columnId: string;
	columnTitle: string;
	columnType: string;
	isPinned: boolean;
	language: "en" | "ar";
	onClose: () => void;
	onSort: (direction: "asc" | "desc") => void;
	onPin: () => void;
	onUnpin: () => void;
	onHide: () => void;
	onAutosize: () => void;
	onCopy?: () => void;
	onFilter?: () => void;
	onFormat?: () => void;
}

export function EnhancedColumnMenu({
	isOpen,
	x,
	y,
	columnId: _columnId,
	columnTitle,
	columnType,
	isPinned,
	language,
	onClose,
	onSort,
	onPin,
	onUnpin,
	onHide,
	onAutosize,
	onCopy,
	onFilter,
	onFormat,
}: ColumnMenuProps) {
	const { theme: _theme } = useTheme();
	const isRTL = language === "ar";
	const [showFormatMenu, setShowFormatMenu] = useState(false);

	// Close menu when clicking outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-column-menu]")) {
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
		switch (columnType) {
			case "date":
				return <Calendar className="h-4 w-4" />;
			case "time":
				return <Clock className="h-4 w-4" />;
			case "number":
				return <Hash className="h-4 w-4" />;
			default:
				return <Type className="h-4 w-4" />;
		}
	};

	const menuItems = [
		// Sorting section
		{
			id: "sort-asc",
			label: isRTL ? "ترتيب تصاعدي" : "Sort Ascending",
			icon: <ArrowUp className="h-4 w-4" />,
			onClick: () => {
				onSort("asc");
				onClose();
			},
			section: "sort",
		},
		{
			id: "sort-desc",
			label: isRTL ? "ترتيب تنازلي" : "Sort Descending",
			icon: <ArrowDown className="h-4 w-4" />,
			onClick: () => {
				onSort("desc");
				onClose();
			},
			section: "sort",
		},

		// Column management section
		{
			id: "pin",
			label: isPinned
				? isRTL
					? "إلغاء التثبيت"
					: "Unpin Column"
				: isRTL
					? "تثبيت العمود"
					: "Pin Column",
			icon: isPinned ? (
				<PinOff className="h-4 w-4" />
			) : (
				<Pin className="h-4 w-4" />
			),
			onClick: () => {
				isPinned ? onUnpin() : onPin();
				onClose();
			},
			section: "column",
		},
		{
			id: "autosize",
			label: isRTL ? "تحجيم تلقائي" : "Auto-size",
			icon: <ArrowUpDown className="h-4 w-4" />,
			onClick: () => {
				onAutosize();
				onClose();
			},
			section: "column",
		},
		{
			id: "hide",
			label: isRTL ? "إخفاء العمود" : "Hide Column",
			icon: <EyeOff className="h-4 w-4" />,
			onClick: () => {
				onHide();
				onClose();
			},
			section: "column",
		},

		// Advanced actions (conditional)
		...(onCopy
			? [
					{
						id: "copy",
						label: isRTL ? "نسخ العمود" : "Copy Column",
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
						label: isRTL ? "تصفية" : "Filter",
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
						label: isRTL ? "تنسيق" : "Format",
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

	return (
		<div className="fixed inset-0 z-50" data-column-menu>
			{/* Backdrop */}
			<button
				className="absolute inset-0"
				aria-label="Close menu overlay"
				onClick={onClose}
				type="button"
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
				}}
			/>

			{/* Menu */}
			<div
				className={cn(
					"absolute min-w-[200px] rounded-lg border shadow-lg backdrop-blur-sm",
					"animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
					"bg-popover/95 border-border shadow-foreground/20",
				)}
				style={{
					left: Math.min(x, window.innerWidth - 220),
					top: Math.min(y, window.innerHeight - 300),
				}}
			>
				{/* Header */}
				<div
					className={cn(
						"px-3 py-2 border-b text-sm font-medium flex items-center gap-2",
						"border-border",
					)}
				>
					{getColumnIcon()}
					<span className="truncate">{columnTitle}</span>
				</div>

				{/* Menu sections */}
				<div className="py-1">
					{Object.entries(groupedItems).map(
						([section, items], sectionIndex) => (
							<div key={section}>
								{sectionIndex > 0 && (
									<div className="h-px mx-2 my-1 bg-border" />
								)}

								{items.map((item) => (
									<button
										type="button"
										key={item.id}
										onClick={item.onClick}
										className={cn(
											"w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
											"hover:bg-accent hover:text-accent-foreground",
											item.hasSubmenu && "justify-between",
										)}
									>
										<div className="flex items-center gap-2">
											{item.icon}
											<span>{item.label}</span>
										</div>
										{item.hasSubmenu && <ChevronRight className="h-4 w-4" />}
									</button>
								))}
							</div>
						),
					)}
				</div>

				{/* Format submenu */}
				{showFormatMenu && onFormat && (
					<div
						className={cn(
							"absolute left-full top-0 ml-1 min-w-[160px] rounded-lg border shadow-lg",
							"animate-in fade-in-0 zoom-in-95 slide-in-from-left-2",
							"bg-popover/95 border-border shadow-foreground/20",
						)}
					>
						<div className="py-1">
							<button
								type="button"
								onClick={() => {
									onFormat();
									onClose();
								}}
								className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
							>
								{isRTL ? "تنسيق النص" : "Text Format"}
							</button>
							<button
								type="button"
								onClick={() => {
									onFormat();
									onClose();
								}}
								className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
							>
								{isRTL ? "تنسيق الأرقام" : "Number Format"}
							</button>
							<button
								type="button"
								onClick={() => {
									onFormat();
									onClose();
								}}
								className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
							>
								{isRTL ? "تنسيق التاريخ" : "Date Format"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
