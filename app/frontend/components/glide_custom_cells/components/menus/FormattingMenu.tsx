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
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useGridPortal } from "../contexts/GridPortalContext";

interface FormatOption {
	format: string;
	label: string;
	icon: React.ReactNode;
}

const NUMBER_FORMATS: FormatOption[] = [
	{
		format: "",
		label: "Automatic",
		icon: <Hash className="w-4 h-4" />,
	},
	{
		format: "localized",
		label: "Localized",
		icon: <FileText className="w-4 h-4" />,
	},
	{
		format: "percentage",
		label: "Percentage",
		icon: <Percent className="w-4 h-4" />,
	},
	{
		format: "scientific",
		label: "Scientific",
		icon: <Calculator className="w-4 h-4" />,
	},
	{
		format: "accounting",
		label: "Accounting",
		icon: <BarChart3 className="w-4 h-4" />,
	},
];

const COLUMN_KIND_FORMAT_MAPPING: Record<string, FormatOption[]> = {
	number: NUMBER_FORMATS,
	progress: NUMBER_FORMATS,
	datetime: [
		{
			format: "",
			label: "Automatic",
			icon: <Clock className="w-4 h-4" />,
		},
		{
			format: "localized",
			label: "Localized",
			icon: <FileText className="w-4 h-4" />,
		},
		{
			format: "distance",
			label: "Distance",
			icon: <TrendingUp className="w-4 h-4" />,
		},
		{
			format: "calendar",
			label: "Calendar",
			icon: <Calendar className="w-4 h-4" />,
		},
	],
	date: [
		{
			format: "",
			label: "Automatic",
			icon: <Clock className="w-4 h-4" />,
		},
		{
			format: "localized",
			label: "Localized",
			icon: <FileText className="w-4 h-4" />,
		},
		{
			format: "distance",
			label: "Distance",
			icon: <TrendingUp className="w-4 h-4" />,
		},
	],
	time: [
		{
			format: "",
			label: "Automatic",
			icon: <Clock className="w-4 h-4" />,
		},
		{
			format: "localized",
			label: "Localized",
			icon: <FileText className="w-4 h-4" />,
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
	const formats = getFormatsForColumn(column);
	const [mounted, setMounted] = useState(false);
	const portalContainer = useGridPortal();
	const menuId = React.useId();

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
	}, [onClose, menuId]);

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
		onClose();
	};

	if (formats.length === 0) {
		return null;
	}

	const menuContent = (
		<div
			role="menu"
			id={menuId}
			className="formatting-menu"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			style={{
				position: "absolute",
				top: position.y,
				left: position.x,
				backgroundColor: bgColor,
				border: `0.5px solid ${isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
				borderRadius: "6px",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
				backdropFilter: "blur(8px)",
				minWidth: "180px",
				maxWidth: "240px",
				zIndex: 300, // Grid menu level
				padding: "4px 0",
				animation: "submenuSlideIn 150ms ease-out",
				transformOrigin: position.x < 500 ? "top left" : "top right",
			}}
		>
			{formats.map((formatOption) => (
				<FormatMenuItem
					key={formatOption.format}
					icon={formatOption.icon}
					label={formatOption.label}
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
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			tabIndex={0}
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 12px",
				cursor: "pointer",
				backgroundColor: "transparent",
				color: textColor,
				fontSize: "14px",
				borderRadius: "4px",
				margin: "0 4px",
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
