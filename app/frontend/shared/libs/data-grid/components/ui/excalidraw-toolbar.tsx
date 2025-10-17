import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type React from "react";
import {
	STROKE_WIDTH_BOLD,
	STROKE_WIDTH_EXTRA_BOLD,
	STROKE_WIDTH_THIN,
} from "../../constants/excalidraw-constants";

type ExcalidrawToolbarProps = {
	apiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>;
	activeTool: "freedraw" | "eraser";
	currentStrokeWidth: number;
	stroke: string;
	onToolChange: (tool: "freedraw" | "eraser") => void;
	onStrokeWidthChange: (width: number) => void;
	showStrokeSelector: boolean;
	onToggleStrokeSelector: () => void;
};

type StrokeButtonProps = {
	label: string;
	width: number;
	isSelected: boolean;
	onClick: () => void;
	stroke: string;
	title: string;
};

const StrokeButton: React.FC<StrokeButtonProps> = ({
	label,
	width,
	isSelected,
	onClick,
	stroke,
	title,
}) => (
	<button
		aria-label={label}
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onClick();
		}}
		style={{
			width: 20,
			height: 20,
			borderRadius: 4,
			border: `1px solid ${stroke}`,
			backgroundColor: isSelected ? `${stroke}25` : "transparent",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			padding: 0,
			cursor: "pointer",
			color: stroke,
			transition: "background-color 0.15s ease",
		}}
		title={title}
		type="button"
	>
		<svg
			aria-hidden="true"
			fill="none"
			focusable="false"
			height="12"
			role="img"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			viewBox="0 0 20 20"
			width="12"
		>
			<path d="M4.167 10h11.666" strokeWidth={width} />
		</svg>
	</button>
);

const ToolButton: React.FC<{
	label: string;
	isActive: boolean;
	onClick: () => void;
	stroke: string;
	children: React.ReactNode;
	title: string;
	onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({
	label,
	isActive,
	onClick,
	stroke,
	children,
	title,
	onMouseEnter,
	onMouseLeave,
}) => (
	<button
		aria-label={label}
		onClick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onClick();
		}}
		onMouseEnter={onMouseEnter}
		onMouseLeave={onMouseLeave}
		style={{
			width: 20,
			height: 20,
			borderRadius: 4,
			border: `1px solid ${stroke}`,
			backgroundColor: isActive ? `${stroke}25` : "transparent",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			padding: 0,
			cursor: "pointer",
			color: stroke,
			transition: "background-color 0.15s ease",
		}}
		title={title}
		type="button"
	>
		{children}
	</button>
);

export const ExcalidrawToolbar: React.FC<ExcalidrawToolbarProps> = ({
	apiRef,
	activeTool,
	currentStrokeWidth,
	stroke,
	onToolChange,
	onStrokeWidthChange,
	showStrokeSelector,
	onToggleStrokeSelector,
}) => (
	<div
		style={{
			position: "absolute",
			right: 4,
			top: "50%",
			transform: "translateY(-50%)",
			display: "flex",
			flexDirection: "column",
			gap: 4,
			zIndex: 3,
			pointerEvents: "auto",
		}}
	>
		{/* Stroke width selector - positioned absolutely to the left of pen button */}
		{showStrokeSelector && (
			<div
				style={{
					position: "absolute",
					right: 28,
					top: 0,
					display: "flex",
					flexDirection: "row",
					gap: 4,
					animation: "slideInLeft 0.15s ease-out",
				}}
			>
				<style>
					{`@keyframes slideInLeft {
						from {
							opacity: 0;
							transform: translateX(8px);
						}
						to {
							opacity: 1;
							transform: translateX(0);
						}
					}`}
				</style>
				<StrokeButton
					isSelected={currentStrokeWidth === STROKE_WIDTH_THIN}
					label="Thin stroke"
					onClick={() => {
						try {
							const api = apiRef.current;
							if (api) {
								(api as ExcalidrawImperativeAPI).updateScene({
									appState: { currentItemStrokeWidth: STROKE_WIDTH_THIN },
								});
								onStrokeWidthChange(STROKE_WIDTH_THIN);
								onToggleStrokeSelector();
							}
						} catch {
							// Failed to update scene
						}
					}}
					stroke={stroke}
					title="Thin"
					width={1.25}
				/>
				<StrokeButton
					isSelected={currentStrokeWidth === STROKE_WIDTH_BOLD}
					label="Bold stroke"
					onClick={() => {
						try {
							const api = apiRef.current;
							if (api) {
								(api as ExcalidrawImperativeAPI).updateScene({
									appState: { currentItemStrokeWidth: STROKE_WIDTH_BOLD },
								});
								onStrokeWidthChange(STROKE_WIDTH_BOLD);
								onToggleStrokeSelector();
							}
						} catch {
							// Failed to update scene
						}
					}}
					stroke={stroke}
					title="Bold"
					width={2.5}
				/>
				<StrokeButton
					isSelected={currentStrokeWidth === STROKE_WIDTH_EXTRA_BOLD}
					label="Extra bold stroke"
					onClick={() => {
						try {
							const api = apiRef.current;
							if (api) {
								(api as ExcalidrawImperativeAPI).updateScene({
									appState: { currentItemStrokeWidth: STROKE_WIDTH_EXTRA_BOLD },
								});
								onStrokeWidthChange(STROKE_WIDTH_EXTRA_BOLD);
								onToggleStrokeSelector();
							}
						} catch {
							// Failed to update scene
						}
					}}
					stroke={stroke}
					title="Extra Bold"
					width={3.75}
				/>
			</div>
		)}
		<ToolButton
			isActive={activeTool === "freedraw"}
			label="Pen"
			onClick={() => {
				try {
					const api = apiRef.current;
					if (api) {
						if (activeTool === "freedraw") {
							onToggleStrokeSelector();
						} else {
							api.setActiveTool({ type: "freedraw" });
							onToolChange("freedraw");
							onToggleStrokeSelector();
						}
					}
				} catch {
					// Failed to set active tool
				}
			}}
			onMouseEnter={(e) => {
				if (activeTool !== "freedraw") {
					e.currentTarget.style.backgroundColor = `${stroke}15`;
				}
			}}
			onMouseLeave={(e) => {
				if (activeTool !== "freedraw") {
					e.currentTarget.style.backgroundColor = "transparent";
				}
			}}
			stroke={stroke}
			title="Pen Tool"
		>
			<svg
				aria-hidden="true"
				fill="none"
				focusable="false"
				height="12"
				role="img"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				viewBox="0 0 20 20"
				width="12"
			>
				<g strokeWidth="1.25">
					<path
						clipRule="evenodd"
						d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"
					/>
					<path d="m11.25 5.417 3.333 3.333" />
				</g>
			</svg>
		</ToolButton>
		<ToolButton
			isActive={activeTool === "eraser"}
			label="Eraser"
			onClick={() => {
				try {
					const api = apiRef.current;
					if (api) {
						api.setActiveTool({ type: "eraser" });
						onToolChange("eraser");
						onToggleStrokeSelector();
					}
				} catch {
					// Failed to set eraser tool
				}
			}}
			onMouseEnter={(e) => {
				if (activeTool !== "eraser") {
					e.currentTarget.style.backgroundColor = `${stroke}15`;
				}
			}}
			onMouseLeave={(e) => {
				if (activeTool !== "eraser") {
					e.currentTarget.style.backgroundColor = "transparent";
				}
			}}
			stroke={stroke}
			title="Eraser Tool"
		>
			<svg
				aria-hidden="true"
				fill="none"
				focusable="false"
				height="12"
				role="img"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				viewBox="0 0 24 24"
				width="12"
			>
				<g strokeWidth="1.5">
					<path d="M0 0h24v24H0z" fill="none" stroke="none" />
					<path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
					<path d="M18 13.3l-6.3 -6.3" />
				</g>
			</svg>
		</ToolButton>
	</div>
);
