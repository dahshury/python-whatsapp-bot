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
import { MenuBar } from "@/shared/ui/bottom-menu";

type GridToolbarProps = {
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
	overlay?: boolean;
	overlayPosition?: { top: number; left: number } | null;
};

// Legacy toolbar button removed after MenuBar integration

// Use rem-based sizing; increase by ~30% relative to previous size
const ICON_SIZE = 16; // was 12px; ~33% increase

// Toolbar hide animation delay in milliseconds
const TOOLBAR_HIDE_DELAY_MS = 250;

/**
 * Build toolbar menu items based on state and callbacks
 */
type ToolbarMenuOptions = {
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
	onClose: (() => void) | undefined;
};

function buildToolbarMenuItems(options: ToolbarMenuOptions): Array<{
	icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}> {
	const {
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
	} = options;
	return [
		...(hasSelection
			? [
					{
						icon: (p: React.SVGProps<SVGSVGElement>) => (
							<Close {...p} size={ICON_SIZE} />
						),
						label: "Clear selection",
						onClick: onClearSelection,
					},
					{
						icon: (p: React.SVGProps<SVGSVGElement>) => (
							<Delete {...p} size={ICON_SIZE} />
						),
						label: "Delete selected rows",
						onClick: onDeleteRows,
					},
				]
			: []),
		{
			icon: (p: React.SVGProps<SVGSVGElement>) => (
				<Undo {...p} size={ICON_SIZE} />
			),
			label: "Undo (Ctrl+Z)",
			onClick: onUndo,
			disabled: !canUndo,
		},
		{
			icon: (p: React.SVGProps<SVGSVGElement>) => (
				<Redo {...p} size={ICON_SIZE} />
			),
			label: "Redo (Ctrl+Shift+Z)",
			onClick: onRedo,
			disabled: !canRedo,
		},
		...(hasSelection
			? []
			: [
					{
						icon: (p: React.SVGProps<SVGSVGElement>) => (
							<Plus {...p} size={ICON_SIZE} />
						),
						label: "Add row",
						onClick: onAddRow,
					},
				]),
		...(hasHiddenColumns
			? [
					{
						icon: (p: React.SVGProps<SVGSVGElement>) => (
							<Eye {...p} size={ICON_SIZE} />
						),
						label: "Show/hide columns",
						onClick: onToggleColumnVisibility,
					},
				]
			: []),
		{
			icon: (p: React.SVGProps<SVGSVGElement>) => (
				<Download {...p} size={ICON_SIZE} />
			),
			label: "Download as CSV",
			onClick: onDownloadCsv,
		},
		{
			icon: (p: React.SVGProps<SVGSVGElement>) => (
				<Search {...p} size={ICON_SIZE} />
			),
			label: "Search",
			onClick: onToggleSearch,
		},
		{
			icon: (p: React.SVGProps<SVGSVGElement>) => (
				<Maximize {...p} size={ICON_SIZE} />
			),
			label: "Toggle fullscreen",
			onClick: onToggleFullscreen,
		},
		...(onClose
			? [
					{
						icon: (p: React.SVGProps<SVGSVGElement>) => (
							<Close {...p} size={ICON_SIZE} />
						),
						label: "Close",
						onClick: onClose,
					},
				]
			: []),
	];
}

const buildContainerStyle = (
	overlay: boolean,
	overlayPosition: GridToolbarProps["overlayPosition"],
	isShown: boolean
): React.CSSProperties => {
	if (!overlay) {
		return {
			display: "flex",
			justifyContent: "flex-end",
			alignItems: "flex-start",
			padding: "0",
			minHeight: "14px",
			width: "100%",
			opacity: isShown ? 1 : 0,
			visibility: isShown ? "visible" : "hidden",
			transition: "opacity 350ms ease-in-out, visibility 350ms ease-in-out",
			pointerEvents: isShown ? "auto" : "none",
		};
	}

	return {
		position: "fixed",
		top: overlayPosition?.top ?? 0,
		left: overlayPosition?.left ?? 0,
		transform: "translate(-100%, -100%)",
		zIndex: "var(--z-grid-fullscreen)",
		paddingLeft: "8px",
		marginLeft: "-8px",
		opacity: isShown ? 1 : 0,
		visibility: isShown ? "visible" : "hidden",
		transition: "opacity 350ms ease-in-out, visibility 350ms ease-in-out",
		pointerEvents: isShown ? "auto" : "none",
	};
};

const buildToolbarStyle = (
	isShown: boolean,
	overlay: boolean
): React.CSSProperties => ({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "flex-end",
	padding: "0",
	margin: overlay ? "0" : "2px 4px 0 0",
	background: "transparent",
	border: "none",
	gap: "0",
	width: "fit-content",
	transform: isShown ? "scale(1)" : "scale(0.96)",
	transition: "transform 200ms ease-in-out",
});

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
	overlay = false,
	overlayPosition,
}) => {
	const [isToolbarHovered, setIsToolbarHovered] = React.useState(false);
	const shouldShow = isFocused || isToolbarHovered || hasSelection;
	const [isShown, setIsShown] = React.useState<boolean>(false);
	const hideTimerRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		if (shouldShow) {
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
				hideTimerRef.current = null;
			}
			setIsShown(true);
			return;
		}
		hideTimerRef.current = window.setTimeout(() => {
			setIsShown(false);
			hideTimerRef.current = null;
		}, TOOLBAR_HIDE_DELAY_MS);
		return () => {
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
				hideTimerRef.current = null;
			}
		};
	}, [shouldShow]);

	const containerStyle = buildContainerStyle(overlay, overlayPosition, isShown);
	const toolbarStyle = buildToolbarStyle(isShown, overlay);

	// const separatorStyle: React.CSSProperties = {
	// 	width: "1px",
	// 	height: "8px",
	// 	background: "var(--gdg-toolbar-border, rgba(0, 0, 0, 0.2))",
	// 	margin: "0 2px",
	// };

	return (
		<>
			{/* Interactive toolbar element with keyboard navigation support */}
			{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: role="toolbar" with keyboard handlers for toolbar navigation */}
			<div
				aria-label="Grid toolbar"
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						setIsToolbarHovered(false);
					}
				}}
				onMouseEnter={() => setIsToolbarHovered(true)}
				onMouseLeave={() => {
					setIsToolbarHovered(false);
				}}
				role="toolbar"
				style={containerStyle}
				tabIndex={-1}
			>
				<div style={toolbarStyle}>
					<MenuBar
						buttonClassName="w-[1.3rem] h-[1.3rem] p-0 hover:bg-muted/80"
						iconWrapperClassName="w-[1rem] h-[1rem]"
						items={buildToolbarMenuItems({
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
						})}
						menuClassName="h-[1.15rem] px-2 rounded-[0.25rem] border border-border/50 shadow-sm"
					/>
				</div>
			</div>
		</>
	);
};
