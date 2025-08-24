"use client";

import {
	X as Close,
	Trash2 as Delete,
	Download,
	Eye,
	Maximize,
	Plus,
	Redo,
	Search,
	Undo,
} from "lucide-react";
import React from "react";

interface GridToolbarProps {
	isFocused: boolean;
	hasSelection: boolean;
	canUndo: boolean;
	canRedo: boolean;
	hasHiddenColumns: boolean;
	onClearSelection: () => void;
	onDeleteRows: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onAddRow: () => void;
	onToggleColumnVisibility: () => void;
	onDownloadCsv: () => void;
	onToggleSearch: () => void;
	onToggleFullscreen: () => void;
	onClose?: () => void;
}

interface ToolbarButtonProps {
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
	disabled?: boolean;
	variant?: "default" | "danger";
	isHovered?: boolean;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
	onClick,
	icon,
	label,
	disabled = false,
	variant = "default",
	isHovered = false,
	onMouseEnter,
	onMouseLeave,
}) => {
	const buttonStyle: React.CSSProperties = {
		background:
			isHovered && !disabled
				? "var(--gdg-toolbar-hover-bg, rgba(0, 0, 0, 0.1))"
				: "transparent",
		border: "none",
		padding: "3px",
		cursor: disabled ? "not-allowed" : "pointer",
		color:
			isHovered && !disabled
				? "var(--gdg-toolbar-hover-icon, #000)"
				: "var(--gdg-toolbar-icon, #666)",
		borderRadius: "3px",
		transition: "all 150ms ease",
		transform: isHovered && !disabled ? "scale(1.05)" : "scale(1)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		opacity: disabled ? 0.4 : 1,
	};

	return (
		<button
			onClick={onClick}
			disabled={disabled}
			style={buttonStyle}
			title={label}
			aria-label={label}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{React.cloneElement(icon as React.ReactElement, {
				size: 12,
				style: { flexShrink: 0 },
			})}
		</button>
	);
};

export const GridToolbar: React.FC<GridToolbarProps> = ({
	isFocused,
	hasSelection,
	canUndo,
	canRedo,
	hasHiddenColumns,
	onClearSelection,
	onDeleteRows,
	onUndo,
	onRedo,
	onAddRow,
	onToggleColumnVisibility,
	onDownloadCsv,
	onToggleSearch,
	onToggleFullscreen,
	onClose,
}) => {
	const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
	const [isToolbarHovered, setIsToolbarHovered] = React.useState(false);

	// Show toolbar if focused OR if hovering over the toolbar itself
	const shouldShow = isFocused || isToolbarHovered;

	const containerStyle: React.CSSProperties = {
		display: "flex",
		justifyContent: "flex-end",
		alignItems: "flex-start",
		padding: "0",
		minHeight: "22px",
		width: "100%",
		opacity: shouldShow ? 1 : 0,
		visibility: shouldShow ? "visible" : "hidden",
		transition: "opacity 200ms ease-in-out, visibility 200ms ease-in-out",
		pointerEvents: shouldShow ? "auto" : "none",
	};

	const toolbarStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		padding: "3px 4px",
		margin: "4px 6px 0 0",
		background: "var(--gdg-toolbar-bg, rgba(255, 255, 255, 0.95))",
		backdropFilter: "blur(8px)",
		border: "1px solid var(--gdg-toolbar-border, rgba(0, 0, 0, 0.1))",
		borderRadius: "4px",
		boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
		gap: "1px",
		width: "fit-content",
		transform: shouldShow ? "scale(1)" : "scale(0.95)",
		transition: "transform 200ms ease-in-out",
	};

	const separatorStyle: React.CSSProperties = {
		width: "1px",
		height: "10px",
		background: "var(--gdg-toolbar-border, rgba(0, 0, 0, 0.2))",
		margin: "0 2px",
	};

	return (
		<div
			style={containerStyle}
			onMouseEnter={() => setIsToolbarHovered(true)}
			onMouseLeave={() => {
				setIsToolbarHovered(false);
				setHoveredButton(null);
			}}
		>
			<div style={toolbarStyle}>
				{hasSelection && (
					<>
						<ToolbarButton
							onClick={onClearSelection}
							icon={<Close />}
							label="Clear selection"
							isHovered={hoveredButton === "clear"}
							onMouseEnter={() => setHoveredButton("clear")}
							onMouseLeave={() => setHoveredButton(null)}
						/>
						<ToolbarButton
							onClick={onDeleteRows}
							icon={<Delete />}
							label="Delete selected rows"
							variant="danger"
							isHovered={hoveredButton === "delete"}
							onMouseEnter={() => setHoveredButton("delete")}
							onMouseLeave={() => setHoveredButton(null)}
						/>
						<div style={separatorStyle} />
					</>
				)}

				<ToolbarButton
					onClick={onUndo}
					icon={<Undo />}
					label="Undo (Ctrl+Z)"
					disabled={!canUndo}
					isHovered={hoveredButton === "undo"}
					onMouseEnter={() => canUndo && setHoveredButton("undo")}
					onMouseLeave={() => setHoveredButton(null)}
				/>
				<ToolbarButton
					onClick={onRedo}
					icon={<Redo />}
					label="Redo (Ctrl+Shift+Z)"
					disabled={!canRedo}
					isHovered={hoveredButton === "redo"}
					onMouseEnter={() => canRedo && setHoveredButton("redo")}
					onMouseLeave={() => setHoveredButton(null)}
				/>

				<div style={separatorStyle} />

				{!hasSelection && (
					<ToolbarButton
						onClick={onAddRow}
						icon={<Plus />}
						label="Add row"
						isHovered={hoveredButton === "add"}
						onMouseEnter={() => setHoveredButton("add")}
						onMouseLeave={() => setHoveredButton(null)}
					/>
				)}

				{hasHiddenColumns && (
					<ToolbarButton
						onClick={onToggleColumnVisibility}
						icon={<Eye />}
						label="Show/hide columns"
						isHovered={hoveredButton === "visibility"}
						onMouseEnter={() => setHoveredButton("visibility")}
						onMouseLeave={() => setHoveredButton(null)}
					/>
				)}

				<ToolbarButton
					onClick={onDownloadCsv}
					icon={<Download />}
					label="Download as CSV"
					isHovered={hoveredButton === "download"}
					onMouseEnter={() => setHoveredButton("download")}
					onMouseLeave={() => setHoveredButton(null)}
				/>

				<ToolbarButton
					onClick={onToggleSearch}
					icon={<Search />}
					label="Search"
					isHovered={hoveredButton === "search"}
					onMouseEnter={() => setHoveredButton("search")}
					onMouseLeave={() => setHoveredButton(null)}
				/>

				<div style={separatorStyle} />

				<ToolbarButton
					onClick={onToggleFullscreen}
					icon={<Maximize />}
					label="Toggle fullscreen"
					isHovered={hoveredButton === "fullscreen"}
					onMouseEnter={() => setHoveredButton("fullscreen")}
					onMouseLeave={() => setHoveredButton(null)}
				/>

				{onClose && (
					<ToolbarButton
						onClick={onClose}
						icon={<Close />}
						label="Close"
						isHovered={hoveredButton === "close"}
						onMouseEnter={() => setHoveredButton("close")}
						onMouseLeave={() => setHoveredButton(null)}
					/>
				)}
			</div>
		</div>
	);
};

export default GridToolbar;
