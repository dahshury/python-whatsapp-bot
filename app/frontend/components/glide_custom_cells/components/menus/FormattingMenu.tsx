"use client";

import type { GridColumn } from "@glideapps/glide-data-grid";
import {
	BarChart3,
	Calculator,
	Calendar,
	Clock,
	FileText,
	Hash,
	Percent,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useGridPortal } from "../contexts/GridPortalContext";

interface FormatOption {
	format: string;
	label: string;
	icon: React.ReactNode;
}

const NUMBER_FORMATS: FormatOption[] = [
	{
		format: "",
		label: i18n.getMessage("cm_format_automatic", false),
		icon: <Hash className="w-3.5 h-3.5" />,
	},
	{
		format: "localized",
		label: i18n.getMessage("cm_format_localized", false),
		icon: <FileText className="w-3.5 h-3.5" />,
	},
	{
		format: "percentage",
		label: i18n.getMessage("cm_format_percentage", false),
		icon: <Percent className="w-3.5 h-3.5" />,
	},
	{
		format: "scientific",
		label: i18n.getMessage("cm_format_scientific", false),
		icon: <Calculator className="w-3.5 h-3.5" />,
	},
	{
		format: "accounting",
		label: i18n.getMessage("cm_format_accounting", false),
		icon: <BarChart3 className="w-3.5 h-3.5" />,
	},
];

const COLUMN_KIND_FORMAT_MAPPING: Record<string, FormatOption[]> = {
	number: NUMBER_FORMATS,
	progress: NUMBER_FORMATS,
	datetime: [
		{
			format: "",
			label: i18n.getMessage("cm_format_automatic", false),
			icon: <Clock className="w-3.5 h-3.5" />,
		},
		{
			format: "localized",
			label: i18n.getMessage("cm_format_localized", false),
			icon: <FileText className="w-3.5 h-3.5" />,
		},
		{
			format: "distance",
			label: i18n.getMessage("cm_format_distance", false),
			icon: <TrendingUp className="w-3.5 h-3.5" />,
		},
		{
			format: "calendar",
			label: i18n.getMessage("cm_format_calendar", false),
			icon: <Calendar className="w-3.5 h-3.5" />,
		},
	],
	date: [
		{
			format: "",
			label: i18n.getMessage("cm_format_automatic", false),
			icon: <Clock className="w-3.5 h-3.5" />,
		},
		{
			format: "localized",
			label: i18n.getMessage("cm_format_localized", false),
			icon: <FileText className="w-3.5 h-3.5" />,
		},
		{
			format: "distance",
			label: i18n.getMessage("cm_format_distance", false),
			icon: <TrendingUp className="w-3.5 h-3.5" />,
		},
	],
	time: [
		{
			format: "",
			label: i18n.getMessage("cm_format_automatic", false),
			icon: <Clock className="w-3.5 h-3.5" />,
		},
		{
			format: "localized",
			label: i18n.getMessage("cm_format_localized", false),
			icon: <FileText className="w-3.5 h-3.5" />,
		},
	],
};

export interface FormattingMenuProps {
	column: GridColumn;
	position: { x: number; y: number };
	onFormatChange: (format: string) => void;
	onClose: () => void;
	isDarkTheme?: boolean;
	parentTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>;
}

export function FormattingMenu({
	column,
	position,
	onFormatChange,
	onClose,
	isDarkTheme = false,
	parentTimeoutRef,
}: FormattingMenuProps) {
	const { isLocalized } = useLanguage();
	const formats = getFormatsForColumn(column);
	const [mounted, setMounted] = useState(false);
	const portalContainer = useGridPortal();
	const menuId = "formatting-menu";

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const menu = document.getElementById(menuId);
			if (menu && !menu.contains(target)) {
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
			document.removeEventListener("mousedown", handleOutsideClick);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose]);

	const handleFormatSelect = useCallback(
		(format: string) => {
			onFormatChange(format);
			onClose();
		},
		[onFormatChange, onClose],
	);

	const bgColor = isDarkTheme ? "#2a2a2a" : "white";
	const hoverBg = isDarkTheme ? "#3a3a3a" : "#f0f0f0";
	const textColor = isDarkTheme ? "#f1f1f1" : "#333";

	const handleMouseEnter = () => {
		if (parentTimeoutRef?.current) {
			clearTimeout(parentTimeoutRef.current);
			parentTimeoutRef.current = null;
		}
	};

	const handleMouseLeave = () => {
		if (parentTimeoutRef) {
			try {
				parentTimeoutRef.current = setTimeout(() => onClose(), 150);
			} catch {}
		}
	};

	if (formats.length === 0) {
		return null;
	}

	const menuContent = (
		<div
			role="menu"
			id={"formatting-menu"}
			className="formatting-menu click-outside-ignore"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseDown={(e) => {
				// Prevent mousedown from triggering global outside handlers
				e.preventDefault();
				e.stopPropagation();
			}}
			onClick={(e) => {
				// Prevent click events from bubbling up to parent popover
				e.preventDefault();
				e.stopPropagation();
			}}
			onKeyDown={(e) => {
				// Handle keyboard navigation
				if (e.key === "Escape") {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			style={{
				position: "absolute",
				top: position.y,
				left: position.x,
				backgroundColor: bgColor,
				border: `0.5px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
				borderRadius: "4px",
				boxShadow: "0 2px 5px rgba(0, 0, 0, 0.12)",
				backdropFilter: "blur(8px)",
				minWidth: "144px",
				maxWidth: "192px",
				zIndex: 300,
				padding: "3px 0",
				animation: "submenuSlideIn 150ms ease-out",
				transformOrigin: position.x < 500 ? "top left" : "top right",
			}}
		>
			{formats.map((formatOption) => (
				<FormatMenuItem
					key={formatOption.format}
					icon={formatOption.icon}
					label={getFormatLabel(formatOption.format, (key) =>
						i18n.getMessage(key, isLocalized),
					)}
					onClick={() => handleFormatSelect(formatOption.format)}
					hoverBg={hoverBg}
					textColor={textColor}
				/>
			))}
		</div>
	);

	if (!mounted || !portalContainer) return null;

	return ReactDOM.createPortal(menuContent, portalContainer);
}

interface FormatMenuItemProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	hoverBg: string;
	textColor: string;
}

function FormatMenuItem({
	icon,
	label,
	onClick,
	hoverBg,
	textColor,
}: FormatMenuItemProps) {
	return (
		<div
			role="menuitem"
			className="format-menu-item"
			onMouseDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					e.stopPropagation();
					onClick();
				}
			}}
			tabIndex={0}
			style={{
				display: "flex",
				alignItems: "center",
				gap: "6px",
				padding: "6px 10px",
				cursor: "pointer",
				backgroundColor: "transparent",
				color: textColor,
				fontSize: "12px",
				borderRadius: "4px",
				margin: "0 3px",
				transition: "background-color 150ms ease",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = hoverBg;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
			}}
		>
			{icon}
			{label}
		</div>
	);
}

function getFormatsForColumn(column: GridColumn): FormatOption[] {
	const columnKind = determineColumnKind(column);
	return COLUMN_KIND_FORMAT_MAPPING[columnKind] || [];
}

function getFormatLabel(format: string, t: (key: string) => string): string {
	switch (format) {
		case "":
			return t("cm_format_automatic");
		case "localized":
			return t("cm_format_localized");
		case "percentage":
			return t("cm_format_percentage");
		case "scientific":
			return t("cm_format_scientific");
		case "accounting":
			return t("cm_format_accounting");
		case "distance":
			return t("cm_format_distance");
		case "calendar":
			return t("cm_format_calendar");
		default:
			return format;
	}
}

function determineColumnKind(column: GridColumn): string {
	const dataType = (column as GridColumn & { dataType?: string }).dataType;
	if (dataType) {
		switch (dataType) {
			case "number":
				return "number";
			case "date":
				return "date";
			case "time":
				return "time";
			case "datetime":
				return "datetime";
			default:
				break;
		}
	}

	const columnWithMetadata = column as GridColumn & {
		name?: string;
		title?: string;
		id?: string;
	};
	const name = columnWithMetadata.name
		? columnWithMetadata.name.toLowerCase()
		: (columnWithMetadata.title?.toLowerCase() ?? "");
	const id = columnWithMetadata.id ? columnWithMetadata.id.toLowerCase() : "";

	if (
		id.includes("number") ||
		name.includes("number") ||
		id.includes("numeric") ||
		name.includes("numeric") ||
		id.includes("float") ||
		name.includes("int")
	) {
		return "number";
	}

	if (id.includes("progress") || name.includes("progress")) {
		return "progress";
	}

	if (
		id.includes("datetime") ||
		name.includes("datetime") ||
		id.includes("timestamp") ||
		name.includes("timestamp")
	) {
		return "datetime";
	}

	if (id.includes("date") || name.includes("date")) {
		return "date";
	}

	if (id.includes("time") || name.includes("time")) {
		return "time";
	}

	return "number";
}
